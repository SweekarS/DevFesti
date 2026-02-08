# ml/anomaly.py
from __future__ import annotations

def amount_anomaly_score(amount: float | None, stats: dict | None) -> dict:
    """
    Returns an explainable anomaly score using z-score against vendor mean/std.
    Works even with small data (but only meaningful once n>=5).
    """
    if amount is None or stats is None:
        return {"score": 0.0, "level": "UNKNOWN", "reason": "No amount/stats available."}

    n = stats["n"]
    mean = stats["mean"]
    std = stats["std"]

    if n < 2 or std == 0.0:
        return {"score": 0.0, "level": "UNKNOWN", "reason": f"Insufficient vendor history (n={n})."}

    z = abs((amount - mean) / std)

    # Map z to 0..1-ish
    score = min(1.0, z / 6.0)

    if z >= 4:
        level = "HIGH"
    elif z >= 2.5:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "score": float(score),
        "level": level,
        "reason": f"Amount z-score={z:.2f} vs vendor mean={mean:.2f}, std={std:.2f} (n={n})."
    }
