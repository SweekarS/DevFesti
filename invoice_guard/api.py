from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict

import risk  # <-- your risk scoring logic lives here

app = FastAPI(title="InvoiceGuard ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    payload: Dict[str, Any]  # send extracted fields or raw invoice fields here

@app.get("/")
def root():
    return {"ok": True, "service": "invoice_guard_ml"}

@app.post("/predict")
def predict(req: PredictRequest):
    """
    Expects: {"payload": {...invoice fields...}}
    Returns: {"risk_score": float, ...}
    """
    # ---- IMPORTANT ----
    # You must call your real risk function here.
    # Common patterns are calculate(), score(), predict(), get_risk_score().
    # We'll attempt a few common ones automatically.
    p = req.payload

    if hasattr(risk, "predict"):
        out = risk.predict(p)
    elif hasattr(risk, "score"):
        out = risk.score(p)
    elif hasattr(risk, "calculate_risk"):
        out = risk.calculate_risk(p)
    elif hasattr(risk, "get_risk_score"):
        out = risk.get_risk_score(p)
    else:
        # fallback: just return payload so API works even if function name differs
        out = {"error": "No callable risk function found in risk.py", "payload_keys": list(p.keys())}

    # normalize output to dict
    if isinstance(out, (int, float)):
        return {"risk_score": float(out)}
    if isinstance(out, dict):
        return out
    return {"result": str(out)}
EOF
