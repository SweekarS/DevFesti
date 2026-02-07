import express from "express";
import { nanoid } from "nanoid";
import { db, findVendorByName } from "../db.js";

const router = express.Router();

// List vendors
router.get("/", (req, res) => {
  res.json({ vendors: db.vendors });
});

// Create/update vendor
router.post("/", (req, res) => {
  const {
    name,
    knownEmailDomains = [],
    knownBankAccounts = [],
    typicalMin = null,
    typicalMax = null
  } = req.body || {};

  if (!name || String(name).trim().length === 0) {
    return res.status(400).json({ error: "Vendor name is required." });
  }

  const existing = findVendorByName(name);

  if (existing) {
    existing.knownEmailDomains = knownEmailDomains;
    existing.knownBankAccounts = knownBankAccounts;
    existing.typicalMin = typicalMin;
    existing.typicalMax = typicalMax;
    return res.json({ vendor: existing, updated: true });
  }

  const vendor = {
    vendor_id: `v_${nanoid(8)}`,
    name: String(name).trim(),
    knownEmailDomains,
    knownBankAccounts,
    typicalMin,
    typicalMax
  };

  db.vendors.push(vendor);
  res.status(201).json({ vendor, created: true });
});

export default router;
