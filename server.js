import express from "express";
import cors from "cors";

import invoicesRouter from "./routes/invoices.js";
import vendorsRouter from "./routes/vendors.js";
import paymentsRouter from "./routes/payments.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.json({ ok: true, service: "invoice-risk-backend" });
});

app.use("/invoices", invoicesRouter);
app.use("/vendors", vendorsRouter);
app.use("/payments", paymentsRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
