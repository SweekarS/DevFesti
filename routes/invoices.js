import express from "express";
import { nanoid } from "nanoid";
import { db, getOrCreateVendor, findVendorByName } from "../db.js";
import { scoreInvoice } from "../riskEngine.js";

const router = express.Router();

function norm(s) {
  return (s || "").trim().toLowerCase();
}
function normInvNum(s) {
  return (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function normDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10);
  return dt.toISOString().slice(0, 10);
}

// List invoices
router.get("/", (req, res) => {
  res.json({ invoices: [...db.invoices].reverse() });
});

// Invoice detail
router.get("/:id", (req, res) => {
  const inv = db.invoices.find(i => i.invoice_id === req.params.id);
  if (!inv) return res.status(404).json({ error: "Invoice not found." });
  res.json({ invoice: inv });
});

// Submit invoice for scoring
router.post("/send", async (req, res) => {
  const b = req.body || {};

  const invoice = {
    vendor_name: b.vendor_name || "",
    invoice_number: b.invoice_number || "",
    invoice_date: b.invoice_date || "",
    amount_total: b.amount_total,

    // New learned identity fields
    tax_id: b.tax_id || "",
    iban: b.iban || "",

    raw_text: b.raw_text || "" // optional (useful for ML teammate)
  };

  if (!invoice.vendor_name || !invoice.invoice_number || !invoice.invoice_date) {
    return res.status(400).json({
      error: "vendor_name, invoice_number, and invoice_date are required."
    });
  }

  // Vendor profile exists only if learned from paid invoices OR manually created
  const vendorProfile = findVendorByName(invoice.vendor_name) || null;

  // RULES score
  const { rule_score, flags, fingerprint } = scoreInvoice({
    invoice,
    existingInvoices: db.invoices,
    vendorProfile,
    payments: db.payments
  });

  // ML placeholder (plug teammate here)
  // For now: ml_score=0 and no ml_flags, so your demo still works.
  const ml_score = 0;
  const ml_flags = [];

  // Combine into final
  const final_score = Math.max(
    0,
    Math.min(100, Math.round(rule_score * 0.7 + ml_score * 0.3))
  );

  const record = {
    invoice_id: `inv_${nanoid(10)}`,
    created_at: new Date().toISOString(),

    ...invoice,

    vendor_name_norm: norm(invoice.vendor_name),
    invoice_number_norm: normInvNum(invoice.invoice_number),
    invoice_date_norm: normDate(invoice.invoice_date),

    amount_total: Number(invoice.amount_total || 0),
    fingerprint,

    rule_score,
    ml_score,
    final_score,

    flags: [
      ...flags.map(f => ({ ...f, source: "RULE" })),
      ...ml_flags.map(f => ({ ...f, source: "ML" }))
    ]
  };

  db.invoices.push(record);

  // Optional: auto-create vendor record on first ever invoice (WITHOUT learning)
  // This doesn't add IBAN/Tax ID to trusted lists. Only /payments learns.
  getOrCreateVendor(record.vendor_name);

  res.status(201).json({
    invoice_id: record.invoice_id,
    rule_score: record.rule_score,
    ml_score: record.ml_score,
    final_score: record.final_score,
    flags: record.flags
  });
});

export default router;
