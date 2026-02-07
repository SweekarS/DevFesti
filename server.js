import express from "express";
import cors from "cors";

import invoicesRouter from "./Routes/invoices.js";
import vendorsRouter from "./Routes/vendors.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.json({ ok: true, service: "invoice-risk-backend" });
});

app.use("/invoices", invoicesRouter);
app.use("/vendors", vendorsRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
