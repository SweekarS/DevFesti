import express from "express";
import { nanoid } from "nanoid";
import { db, getOrCreateVendor, updateVendorBaselineFromPaidInvoice } from "../db.js";

const router = express.Router();

// Mark an invoice as PAID (human confirmed)
router.post("/", (req, res) => {
  const { invoice_id, date_paid } = req.body || {};
  if (!invoice_id) return res.status(400).json({ error: "invoice_id is required" });

  const inv = db.invoices.find(i => i.invoice_id === invoice_id);
  if (!inv) return res.status(404).json({ error: "Invoice not found" });

  // prevent double marking
  const already = db.payments.find(p => p.invoice_id === invoice_id);
  if (already) return res.status(409).json({ error: "Invoice already marked paid" });

  const payment = {
    payment_id: `pay_${nanoid(10)}`,
    invoice_id: inv.invoice_id,
    date_paid: date_paid || new Date().toISOString(),

    vendor_name_norm: inv.vendor_name_norm,
    invoice_number_norm: inv.invoice_number_norm,
    amount_total: inv.amount_total,

    tax_id: inv.tax_id || "",
    iban: inv.iban || ""
  };

  db.payments.push(payment);

  // Learn vendor baselines from this paid invoice
  const vendor = getOrCreateVendor(inv.vendor_name);
  updateVendorBaselineFromPaidInvoice(vendor, inv);

  res.status(201).json({ payment, vendor_updated: vendor });
});

router.get("/", (req, res) => {
  res.json({ payments: [...db.payments].reverse() });
});

export default router;
