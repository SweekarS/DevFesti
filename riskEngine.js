function normalizeVendorName(v) {
  return (v || "").trim().toLowerCase();
}

function normalizeInvoiceNumber(n) {
  return (n || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10);
  return dt.toISOString().slice(0, 10);
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return Infinity;
  const diffMs = Math.abs(a - b);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Edit distance + similarity for soft duplicate
function editDistance(a, b) {
  const s = a || "";
  const t = b || "";
  const m = s.length, n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  const s = a || "";
  const t = b || "";
  const maxLen = Math.max(s.length, t.length);
  if (maxLen === 0) return 1;
  return 1 - editDistance(s, t) / maxLen;
}

function fingerprint({ vendorName, invoiceNumber, amount, invoiceDate }) {
  return [
    normalizeVendorName(vendorName),
    normalizeInvoiceNumber(invoiceNumber),
    Number(amount || 0).toFixed(2),
    normalizeDate(invoiceDate)
  ].join("|");
}

export function scoreInvoice({ invoice, existingInvoices, vendorProfile, payments }) {
  const flags = [];
  let score = 0;

  const vName = normalizeVendorName(invoice.vendor_name);
  const invNum = normalizeInvoiceNumber(invoice.invoice_number);
  const invDate = normalizeDate(invoice.invoice_date);
  const amt = Number(invoice.amount_total || 0);
  const tax = (invoice.tax_id || "").trim();
  const iban = (invoice.iban || "").trim();

  // 0) ALREADY_PAID check (only if same vendor + same invoice_number + same-ish amount was PAID)
  const paidMatch = (payments || []).find(p =>
    p.vendor_name_norm === vName &&
    p.invoice_number_norm === invNum &&
    Math.abs(Number(p.amount_total) - amt) <= 1
  );

  if (paidMatch) {
    score += 85;
    flags.push({
      type: "ALREADY_PAID",
      severity: "HIGH",
      explanation: "This invoice number matches a previously PAID invoice for this vendor (duplicate payment risk).",
      evidence: { matched_payment_id: paidMatch.payment_id, matched_invoice_id: paidMatch.invoice_id }
    });
  }

  // 1) Hard duplicate (submitted before in this system)
  const fp = fingerprint({
    vendorName: invoice.vendor_name,
    invoiceNumber: invoice.invoice_number,
    amount: amt,
    invoiceDate: invoice.invoice_date
  });

  const hardDupe = existingInvoices.find(x => x.fingerprint === fp);
  if (hardDupe) {
    score += 70;
    flags.push({
      type: "DUPLICATE_HARD",
      severity: "HIGH",
      explanation: "Exact duplicate detected among previously submitted invoices.",
      evidence: { matched_invoice_id: hardDupe.invoice_id }
    });
  }

  // 2) Soft duplicates (similar invoice number, same vendor, close date, same/near amount)
  const sameVendorInvoices = existingInvoices.filter(x => x.vendor_name_norm === vName);

  let bestSoft = null;
  for (const prev of sameVendorInvoices) {
    const prevNum = prev.invoice_number_norm;
    const numSim = similarity(invNum, prevNum);
    const dateDiff = daysBetween(invDate, prev.invoice_date_norm);
    const amtDiff = Math.abs(amt - prev.amount_total);

    const looksClose =
      numSim >= 0.82 &&
      dateDiff <= 14 &&
      (amtDiff <= 1 || (prev.amount_total > 0 && amtDiff / prev.amount_total <= 0.01));

    if (looksClose) {
      if (!bestSoft || numSim > bestSoft.numSim) {
        bestSoft = { prev, numSim, dateDiff };
      }
    }
  }

  if (bestSoft && !hardDupe) {
    score += 45;
    flags.push({
      type: "DUPLICATE_SOFT",
      severity: "MEDIUM",
      explanation: "Potential duplicate: similar invoice number and similar amount/date for the same vendor.",
      evidence: {
        matched_invoice_id: bestSoft.prev.invoice_id,
        invoice_number_similarity: Number(bestSoft.numSim.toFixed(2)),
        days_apart: bestSoft.dateDiff
      }
    });
  }

  // 3) Vendor baseline checks (Tax ID + IBAN learned from PAID invoices)
  if (vendorProfile) {
    // Tax ID mismatch
    if (tax && vendorProfile.knownTaxIds.length > 0 && !vendorProfile.knownTaxIds.includes(tax)) {
      score += 35;
      flags.push({
        type: "TAX_ID_MISMATCH",
        severity: "HIGH",
        explanation: "Tax ID is not one we’ve previously seen for this vendor (learned from paid history).",
        evidence: { provided_tax_id: tax }
      });
    }

    // IBAN mismatch (highest-value scam detection)
    if (iban && vendorProfile.knownIbans.length > 0 && !vendorProfile.knownIbans.includes(iban)) {
      score += 55;
      flags.push({
        type: "IBAN_MISMATCH",
        severity: "HIGH",
        explanation: "IBAN is not one we’ve previously used for this vendor (high-risk payment detail change).",
        evidence: { provided_iban: iban }
      });
    }

    // Amount outlier vs learned range
    const min = vendorProfile.typicalMin;
    const max = vendorProfile.typicalMax;
    if (Number.isFinite(amt) && amt > 0 && (min !== null || max !== null)) {
      if (min !== null && amt < min) {
        score += 15;
        flags.push({
          type: "AMOUNT_LOW_OUTLIER",
          severity: "LOW",
          explanation: "Invoice amount is below the vendor’s typical paid range.",
          evidence: { amount: amt, typicalMin: min, typicalMax: max }
        });
      }
      if (max !== null && amt > max) {
        score += 25;
        flags.push({
          type: "AMOUNT_HIGH_OUTLIER",
          severity: "MEDIUM",
          explanation: "Invoice amount is above the vendor’s typical paid range.",
          evidence: { amount: amt, typicalMin: min, typicalMax: max }
        });
      }
    }
  }

  // Cap
  score = Math.max(0, Math.min(100, score));

  if (flags.length === 0) {
    flags.push({
      type: "NO_FLAGS",
      severity: "INFO",
      explanation: "No obvious duplicate or vendor-baseline mismatch signals detected.",
      evidence: {}
    });
  }

  return { rule_score: score, flags, fingerprint: fp };
}
