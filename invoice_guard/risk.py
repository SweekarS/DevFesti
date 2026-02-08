# risk.py
from __future__ import annotations
from rapidfuzz import fuzz

def _safe_float(x):
    try:
        return float(x)
    except Exception:
        return None

def score_invoice(new_rec: dict, history: list[dict]) -> dict:
    """
    Returns:
      {
        "risk_score": int 0..100,
        "reasons": [..],
        "matches": [ {id, score, why}, ... up to 3]
      }
    """
    score = 0
    reasons = []
    matches = []

    v_new = (new_rec.get("vendor_name") or "").strip().lower()
    inv_new = (new_rec.get("invoice_number") or "").strip().lower()
    amt_new = _safe_float(new_rec.get("total_amount"))
    date_new = (new_rec.get("invoice_date") or "").strip()

    # 1) Exact duplicate check
    for old in history:
        v_old = (old.get("vendor_name") or "").strip().lower()
        inv_old = (old.get("invoice_number") or "").strip().lower()
        if v_new and inv_new and v_old == v_new and inv_old == inv_new:
            score += 60
            reasons.append("Exact duplicate: same vendor + invoice number found in history.")
            matches.append({"id": old["id"], "score": 0.99, "why": "Exact vendor+invoice_number match"})
            break

    # 2) Near-duplicate: fuzzy invoice number + same vendor-ish + same amount
    if score < 60:
        for old in history:
            v_old = (old.get("vendor_name") or "").strip().lower()
            inv_old = (old.get("invoice_number") or "").strip().lower()
            amt_old = _safe_float(old.get("total_amount"))
            date_old = (old.get("invoice_date") or "").strip()

            if not inv_new or not inv_old:
                continue

            inv_sim = fuzz.ratio(inv_new, inv_old) / 100.0
            vendor_sim = fuzz.partial_ratio(v_new, v_old) / 100.0 if v_new and v_old else 0.0

            amt_match = (amt_new is not None and amt_old is not None and abs(amt_new - amt_old) <= max(1.0, 0.01 * amt_new))
            date_close = (date_new and date_old and date_new == date_old)

            if inv_sim > 0.85 and vendor_sim > 0.80 and (amt_match or date_close):
                score += 45
                reasons.append("Likely duplicate: invoice number and vendor are very similar to a prior invoice.")
                matches.append({"id": old["id"], "score": round(inv_sim, 3), "why": f"inv_sim={inv_sim:.2f}, vendor_sim={vendor_sim:.2f}, amt_match={amt_match}, date_same={date_close}"})
                break

    # 3) Amount outlier per vendor (simple baseline from history)
    if v_new and amt_new is not None:
        vendor_amounts = []
        for old in history:
            v_old = (old.get("vendor_name") or "").strip().lower()
            if v_old != v_new:
                continue
            a = _safe_float(old.get("total_amount"))
            if a is not None:
                vendor_amounts.append(a)

        if len(vendor_amounts) >= 5:
            vendor_amounts.sort()
            med = vendor_amounts[len(vendor_amounts)//2]
            if med > 0:
                ratio = amt_new / med
                if ratio >= 5:
                    score += 25
                    reasons.append(f"Amount anomaly: total is {ratio:.1f}× this vendor's historical median.")
                elif ratio >= 2:
                    score += 10
                    reasons.append(f"Amount elevated: total is {ratio:.1f}× this vendor's historical median.")

    # cap
    score = min(100, score)

    # add severity label
    if score >= 70:
        level = "HIGH"
    elif score >= 30:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "risk_score": int(score),
        "risk_level": level,
        "reasons": reasons[:5],
        "matches": matches[:3],
    }
