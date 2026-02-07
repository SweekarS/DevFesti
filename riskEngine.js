// Core scoring logic: duplicates + basic fraud signals.

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

export function scoreInvoice({ invoice, existingInvoices, vendorProfile }) {
  const flags = [];
  let score = 0;

  const vName = normalizeVendorName(invoice.vendor_name);
  const invNum = normalizeInvoiceNumber(invoice.invoice_number);
  const invDate = normalizeDate(invoice.invoice_date);
  const amt = Number(invoice.amount_total || 0);

  // Hard duplicates (exact fingerprint match)
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
      explanation: "Exact duplicate detected (same vendor, invoice #, amount, and date).",
      evidence: { matched_invoice_id: hardDupe.invoice_id }
    });
  }

  // Check for soft duplicates within 3 days
  const softDupes = existingInvoices.filter(x => {
    const vMatch = similarity(vName, normalizeVendorName(x.vendor_name)) > 0.85;
    const invMatch = similarity(invNum, normalizeInvoiceNumber(x.invoice_number)) > 0.8;
    const amtMatch = Math.abs(amt - (x.amount_total || 0)) < 5;
    const dateMatch = daysBetween(invDate, x.invoice_date_norm) <= 3;
    return vMatch && invMatch && amtMatch && dateMatch;
  });

  if (softDupes.length > 0) {
    score += 35;
    flags.push({
      type: "DUPLICATE_SOFT",
      severity: "MEDIUM",
      explanation: `Similar invoice(s) found within 3 days.`,
      evidence: { matched_invoice_id: softDupes[0].invoice_id }
    });
  }

  // Vendor profile checks
  if (vendorProfile) {
    // Check bank account
    if (invoice.bank_account && vendorProfile.knownBankAccounts) {
      const isKnown = vendorProfile.knownBankAccounts.some(
        acc => (acc || "").toLowerCase().includes((invoice.bank_account || "").slice(-4).toLowerCase())
      );
      if (!isKnown) {
        score += 25;
        flags.push({
          type: "UNUSUAL_BANK_ACCOUNT",
          severity: "MEDIUM",
          explanation: "Bank account not in vendor's known list.",
          evidence: {}
        });
      }
    }

    // Check amount range
    if (vendorProfile.typicalMin && vendorProfile.typicalMax) {
      if (amt < vendorProfile.typicalMin || amt > vendorProfile.typicalMax) {
        score += 15;
        flags.push({
          type: "AMOUNT_OUT_OF_RANGE",
          severity: "LOW",
          explanation: `Amount outside vendor's typical range (${vendorProfile.typicalMin}-${vendorProfile.typicalMax}).`,
          evidence: {}
        });
      }
    }
  }

  if (flags.length === 0) {
    flags.push({
      type: "NO_FLAGS",
      severity: "INFO",
      explanation: "No obvious duplicate/fraud signals detected.",
      evidence: {}
    });
  }

  return { score, flags, fingerprint: fp };
}
