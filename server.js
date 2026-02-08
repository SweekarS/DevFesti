import express from "express";
import cors from "cors";

import invoicesRouter from "./routes/invoices.js";
import vendorsRouter from "./routes/vendors.js";
import paymentsRouter from "./routes/payments.js";
import authRouter from "./routes/auth.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.json({ ok: true, service: "invoice-risk-backend" });
});
app.post("/risk-score", async (req, res) => {
  try {
    const mlResp = await fetch("http://localhost:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await mlResp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "ML service unavailable", details: String(err) });
  }
});



app.use("/auth", authRouter);
app.use("/invoices", invoicesRouter);
app.use("/vendors", vendorsRouter);
app.use("/payments", paymentsRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
