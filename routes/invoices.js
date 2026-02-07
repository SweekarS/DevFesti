import express from "express";
import { nanoid } from "nanoid";
import { db, findVendorByName } from "../db.js";
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

// List invoices for dashboard
router.get("/", (req, res) => {
  const invoices = [...db.invoices].reverse();
  res.json({ invoices });
});

// Get invoice detail
router.get("/:id", (req, res) => {
  const inv = db.invoices.find(i => i.invoice_id === req.params.id);
  if (!inv) return res.status(404).json({ error: "Invoice not found." });
  res.json({ invoice: inv });
});

// Submit an invoice and score it
router.post("/", (req, res) => {
  const body = req.body || {};

  const invoice = {
    vendor_name: body.vendor_name || "",
    invoice_number: body.invoice_number || "",
    invoice_date: body.invoice_date || "",
    amount_total: body.amount_total,
    bank_account: body.bank_account || "",
    raw_text: body.raw_text || ""
  };

  if (!invoice.vendor_name || !invoice.invoice_number || !invoice.invoice_date) {
    return res.status(400).json({
      error: "vendor_name, invoice_number, and invoice_date are required."
    });
  }

  const vendorProfile = findVendorByName(invoice.vendor_name) || null;

  const { score, flags, fingerprint } = scoreInvoice({
    invoice,
    existingInvoices: db.invoices,
    vendorProfile
  });

  const record = {
    invoice_id: `inv_${nanoid(10)}`,
    created_at: new Date().toISOString(),
    ...invoice,
    vendor_name_norm: norm(invoice.vendor_name),
    invoice_number_norm: normInvNum(invoice.invoice_number),
    invoice_date_norm: normDate(invoice.invoice_date),
    amount_total: Number(invoice.amount_total || 0),
    fingerprint,
    risk_score: score,
    flags
  };

  db.invoices.push(record);

  res.status(201).json({
    invoice_id: record.invoice_id,
    risk_score: record.risk_score,
    flags: record.flags,
    matched: record.flags
      .filter(f => f.evidence?.matched_invoice_id)
      .map(f => f.evidence.matched_invoice_id)
  });
});

export default router;
