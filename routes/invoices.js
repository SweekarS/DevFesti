import express from "express";
import { nanoid } from "nanoid";
import { db, getOrCreateVendor, findVendorByName } from "../db.js";
import { scoreInvoice, fetchMLScore } from "../riskEngine.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Helper function to call Python invoice checker
function callPythonInvoiceCheck(invoicePath) {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, "../../data/invoices.db");
    const pythonDir = path.join(__dirname, "../../invoice_guard");
    
    const python = spawn("python", [
      "main.py",
      "--db", dbPath,
      "--price-check", invoicePath
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
        console.error("Python error:", error);
        return reject(new Error(`Python process exited with code ${code}`));
      }

      // Extract JSON from output (last JSON object in output)
      const jsonMatch = output.match(/\{[\s\S]*\}(?![\s\S]*\{)/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          resolve(result);
        } catch (e) {
          reject(new Error("Failed to parse Python output"));
        }
      } else {
        reject(new Error("No JSON found in Python output"));
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

// Submit invoice for scoring
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
    image_path: b.image_path || "" // NEW: path to uploaded invoice image
  };

  if (!invoice.vendor_name || !invoice.invoice_number || !invoice.invoice_date) {
    return res.status(400).json({
      error: "vendor_name, invoice_number, and invoice_date are required."
    });
  }

  const vendorProfile = findVendorByName(invoice.vendor_name) || null;

  // RULES score
  const { rule_score, flags, fingerprint } = scoreInvoice({
    invoice,
    existingInvoices: db.invoices,
    vendorProfile,
    payments: db.payments
  });

  // ML scoring (calls external LLM safely, falls back to 0 on error)
  let ml_score = 0;
  let ml_flags = [];
  let python_result = null;

  try {
    const ml = await fetchMLScore(invoice, { timeout: 3000 });
    ml_score = ml.ml_score || 0;
    ml_flags = ml.ml_flags || [];
  } catch (e) {
    // swallow - safe defaults already set above
  }

  // NEW: Python invoice detection (if image_path provided)
  if (invoice.image_path) {
    try {
      python_result = await callPythonInvoiceCheck(invoice.image_path);
      
      // Add Python flags to ml_flags
      if (python_result.risk && python_result.risk.risk_level !== "LOW") {
        ml_flags.push({
          type: "PYTHON_DUPLICATE",
          message: python_result.risk.reasons.join(", "),
          severity: python_result.risk.risk_level
        });
        
        // Boost ML score if duplicate found
        if (python_result.risk.risk_level === "HIGH") {
          ml_score = Math.max(ml_score, 80);
        } else if (python_result.risk.risk_level === "MEDIUM") {
          ml_score = Math.max(ml_score, 50);
        }
      }

      // Add price check flag
      if (python_result.price_check && python_result.price_check.assessment === "OVERPRICED") {
        ml_flags.push({
          type: "PRICE_CHECK",
          message: `Overpriced: ${python_result.price_check.explanation}`,
          severity: "MEDIUM"
        });
        ml_score = Math.max(ml_score, 40);
      }

    } catch (e) {
      console.error("Python check failed:", e.message);
      // Don't fail the whole request, just continue without Python results
    }
  }

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
    ],
    python_analysis: python_result // Store full Python result
  };

  db.invoices.push(record);
  getOrCreateVendor(record.vendor_name);

  res.status(201).json({
    invoice_id: record.invoice_id,
    rule_score: record.rule_score,
    ml_score: record.ml_score,
    final_score: record.final_score,
    flags: record.flags,
    python_analysis: python_result
  });
});

export default router;
