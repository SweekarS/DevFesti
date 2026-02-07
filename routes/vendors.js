import express from "express";
import { db, getOrCreateVendor } from "../db.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ vendors: db.vendors });
});

// Optional: create vendor manually
router.post("/", (req, res) => {
  const { name } = req.body || {};
  if (!name || String(name).trim().length === 0) {
    return res.status(400).json({ error: "Vendor name is required." });
  }

  const vendor = getOrCreateVendor(name);
  res.status(201).json({ vendor });
});

export default router;
