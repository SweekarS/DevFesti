import express from "express";
import { nanoid } from "nanoid";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { db, getOrCreateVendor, findVendorByName } from "../db.js";
import { scoreInvoice, fetchMLScore } from "../riskEngine.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, "../../uploads/"),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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

// Helper: Extract invoice data using Python OCR (without ML analysis)
function extractInvoiceData(imagePath) {
  return new Promise((resolve, reject) => {
    const pythonDir = path.join(__dirname, "../../invoice_guard");
    
    // Just extract data, don't run price check yet
    const python = spawn("python", [
      "-c",
      `
import sys
sys.path.insert(0, '${pythonDir}')
from ocr.reader import extract_text_from_image
from invoice_parser import parse_invoice

text = extract_text_from_image('${imagePath}')
data = parse_invoice(text)
print(data)
      `
    ], {
      cwd: pythonDir,
      env: process.env
    });

    let output = "";
    let error = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      error += data.toString();
    });

    python.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`OCR failed: ${error}`));
      }

      try {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          resolve(JSON.parse(jsonMatch[0]));
        } else {
          reject(new Error("No data extracted"));
        }
      } catch (e) {
        reject(new Error("Failed to parse OCR output"));
      }
    });
  });
}

// Helper: Run full Python ML analysis (duplicate detection + price check)
function runPythonMLAnalysis(imagePath) {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, "../../data/invoices.db");
    const pythonDir = path.join(__dirname, "../../invoice_guard");
    
    const python = spawn("python", [
      "main.py",
      "--db", dbPath,
      "--price-check", imagePath
    ], {
      cwd: pythonDir,
      env: {
        ...process.env,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash"
      }
    });

    let output = "";
    let error = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      error += data.toString();
    });

    python.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Python ML failed: ${error}`));
      }

      const jsonMatch = output.match(/\{[\s\S]*\}(?![\s\S]*\{)/);
      if (jsonMatch) {
        try {
          resolve(JSON.parse(jsonMatch[0]));
        } catch (e) {
          reject(new Error("Failed to parse ML output"));
        }
      } else {
        reject(new Error("No ML results found"));
      }
    });
  });
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

// NEW: Upload and extract invoice data (NO LLM yet)
router.post("/upload", upload.single("invoice"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Extract invoice data using OCR
    const extractedData = await extractInvoiceData(req.file.path);
    
    // Return extracted data + file path for later ML analysis
    res.json({
      success: true,
      data: extractedData,
      file_path: req.file.path,
      message: "Invoice data extracted. Click 'Run ML Analysis' to check for fraud."
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// NEW: Run ML analysis on uploaded invoice (when user clicks button)
router.post("/analyze/:file_path", async (req, res) => {
  const filePath = decodeURIComponent(req.params.file_path);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Invoice file not found" });
  }

  try {
    const mlResult = await runPythonMLAnalysis(filePath);
    
    res.json({
      success: true,
      ml_analysis: mlResult,
      duplicate_risk: mlResult.risk,
      price_check: mlResult.price_check,
      ml_score: mlResult.ml?.duplicate_probability || 0
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Submit invoice for scoring (existing route - now can work with uploaded data)
router.post("/", async (req, res) => {
  const b = req.body || {};
  const invoice = {
    vendor_name: b.vendor_name || "",
    invoice_number: b.invoice_number || "",
    invoice_date: b.invoice_date || "",
    amount_total: b.amount_total,
    tax_id: b.tax_id || "",
    iban: b.iban || "",
    raw_text: b.raw_text || "",
    image_path: b.image_path || ""
  };

  if (!invoice.vendor_name || !invoice.invoice_number || !invoice.invoice_date) {
    return res.status(400).json({
      error: "vendor_name, invoice_number, and invoice_date are required."
    });
  }

  const vendorProfile = findVendorByName(invoice.vendor_name) || null;

  const { rule_score, flags, fingerprint } = scoreInvoice({
    invoice,
    existingInvoices: db.invoices,
    vendorProfile,
    payments: db.payments
  });

  let ml_score = 0;
  let ml_flags = [];

  try {
    const ml = await fetchMLScore(invoice, { timeout: 3000 });
    ml_score = ml.ml_score || 0;
    ml_flags = ml.ml_flags || [];
  } catch (e) {
    // swallow
  }

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
