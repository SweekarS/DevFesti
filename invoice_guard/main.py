# main.py
from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict
from typing import Any, Dict, List
from product_extraction import pick_product_desc


from ocr import ocr_text  # your ocr.py has ocr_text()
from extract_fields import extract_fields  # should return a dataclass or dict

from store import (
    connect,
    insert_invoice,
    fetch_all_invoices,
    fetch_invoice_by_id,
    upsert_embedding,
    fetch_embeddings,
    update_vendor_amount_stats,
    get_vendor_amount_stats,
    save_price_check,
)

from risk import score_invoice
from ml.embeddings import Embedder, cosine_sim, DEFAULT_MODEL
from ml.anomaly import amount_anomaly_score

from llm_price_check import run_price_check


# Load embedder ONCE per process (fixes repeated "Loading weights")
EMBEDDER = Embedder(DEFAULT_MODEL)


def _to_dict(obj: Any) -> Dict[str, Any]:
    """Convert dataclass-like invoice record to dict safely."""
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    try:
        return asdict(obj)
    except Exception:
        # best effort fallback
        try:
            return dict(obj)
        except Exception:
            return {}


def _dup_prob(top_sim: float) -> float:
    """Judge-clean probability mapping."""
    if top_sim >= 0.97:
        return 0.98
    if top_sim >= 0.92:
        return 0.80
    return 0.0


def run(image_path: str, db_path: str, price_check: bool = False) -> Dict[str, Any]:
    conn = connect(db_path)

    # OCR
    raw_text = ocr_text(image_path)

    # Extract structured fields
    rec_obj = extract_fields(raw_text)
    rec = _to_dict(rec_obj)

    # Attach raw text + source file
    rec["raw_text"] = raw_text
    rec["source_file"] = os.path.basename(image_path)

    # Risk scoring uses HISTORY BEFORE inserting current invoice
    history = fetch_all_invoices(conn)
    risk = score_invoice(rec, history)

    # ML embedding + nearest neighbors
    new_emb = EMBEDDER.embed_text(raw_text)
    existing = fetch_embeddings(conn, DEFAULT_MODEL)

    neighbors: List[Dict[str, Any]] = []
    top_sim = 0.0

    for row in existing:
        sim = float(cosine_sim(new_emb, row["embedding"]))
        inv = fetch_invoice_by_id(conn, int(row["invoice_id"]))
        if not inv:
            continue
        neighbors.append(
            {
                "invoice_id": int(row["invoice_id"]),
                "similarity": round(sim, 4),
                "vendor_name": inv.get("vendor_name"),
                "invoice_number": inv.get("invoice_number"),
                "total_amount": inv.get("total_amount"),
                "invoice_date": inv.get("invoice_date"),
            }
        )

    neighbors.sort(key=lambda x: x["similarity"], reverse=True)
    if neighbors:
        top_sim = float(neighbors[0]["similarity"])
    neighbors = neighbors[:3]

    ml_dup_prob = _dup_prob(top_sim)

    # Amount anomaly
    vendor = rec.get("vendor_name")
    amount = rec.get("total_amount")
    stats = get_vendor_amount_stats(conn, vendor) if vendor else None
    anomaly = amount_anomaly_score(amount, stats)

    # Insert invoice AFTER scoring
    invoice_id = insert_invoice(conn, rec)

    # Store embedding + vendor stats
    upsert_embedding(conn, invoice_id, new_emb, DEFAULT_MODEL)
    if vendor and amount is not None:
        update_vendor_amount_stats(conn, vendor, float(amount))

    out: Dict[str, Any] = {
        "invoice_id": invoice_id,
        "extracted": {
            "vendor_name": rec.get("vendor_name"),
            "invoice_number": rec.get("invoice_number"),
            "invoice_date": rec.get("invoice_date"),
            "total_amount": rec.get("total_amount"),
            "currency": rec.get("currency") or "USD",
            "source_file": rec.get("source_file"),
        },
        "risk": risk,
        "ml": {
            "duplicate_probability": round(ml_dup_prob, 3),
            "nearest_neighbors": neighbors,
            "amount_anomaly": anomaly,
        },
    }

    
    if price_check:
        if not os.getenv("GEMINI_API_KEY"):
            out["price_check_error"] = "api is not set. Export api before using --price-check."
            return out

        product_desc = pick_product_desc(raw_text)
        price_out = run_price_check(
            product_desc=product_desc,
            vendor_name=rec.get("vendor_name"),
            total_amount=rec.get("total_amount"),
            currency=rec.get("currency") or "USD",
        )
        save_price_check(conn, invoice_id, product_desc, price_out)
        out["price_check"] = {"product_desc": product_desc, **price_out}

    return out


def main():
    parser = argparse.ArgumentParser(
        description="InvoiceGuard CLI (OCR + risk + embeddings + optional HF price check)"
    )
    parser.add_argument("image_path", help="Path to invoice image (jpg/png)")
    parser.add_argument("--db", required=True, help="Path to SQLite DB file")
    parser.add_argument(
        "--price-check",
        action="store_true",
        help="Run HuggingFace LLM price reasonableness check",
    )

    args = parser.parse_args()
    result = run(args.image_path, args.db, price_check=args.price_check)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
