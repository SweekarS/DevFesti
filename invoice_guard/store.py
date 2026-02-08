# store.py
from __future__ import annotations

import os
import sqlite3
from typing import Any, Dict, List, Optional

import numpy as np


SCHEMA = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_name TEXT,
  invoice_number TEXT,
  invoice_date TEXT,
  total_amount REAL,
  currency TEXT,
  source_file TEXT,
  raw_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_embeddings (
  invoice_id INTEGER NOT NULL,
  model_name TEXT NOT NULL,
  dim INTEGER NOT NULL,
  embedding BLOB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (invoice_id, model_name),
  FOREIGN KEY(invoice_id) REFERENCES invoices(id)
);

CREATE TABLE IF NOT EXISTS vendor_amount_stats (
  vendor_name TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  mean REAL NOT NULL,
  m2 REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS price_checks (
  invoice_id INTEGER PRIMARY KEY,
  product_desc TEXT,
  estimated_market_low REAL,
  estimated_market_high REAL,
  assessment TEXT,
  confidence TEXT,
  explanation TEXT,
  model_name TEXT,
  raw_output TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(invoice_id) REFERENCES invoices(id)
);
"""


# -------------------------
# Connection / bootstrap
# -------------------------
def connect(db_path: str) -> sqlite3.Connection:
    # Ensure parent directory exists
    parent = os.path.dirname(os.path.abspath(db_path))
    if parent and not os.path.exists(parent):
        os.makedirs(parent, exist_ok=True)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    conn.commit()
    return conn


# -------------------------
# Invoices
# -------------------------
def insert_invoice(conn: sqlite3.Connection, rec: Dict[str, Any]) -> int:
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO invoices
        (vendor_name, invoice_number, invoice_date, total_amount, currency, source_file, raw_text)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            rec.get("vendor_name"),
            rec.get("invoice_number"),
            rec.get("invoice_date"),
            rec.get("total_amount"),
            rec.get("currency"),
            rec.get("source_file"),
            rec.get("raw_text"),
        ),
    )
    conn.commit()
    return int(cur.lastrowid)


def fetch_all_invoices(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, vendor_name, invoice_number, invoice_date, total_amount, currency, source_file
        FROM invoices
        ORDER BY id ASC
        """
    )
    return [dict(r) for r in cur.fetchall()]


def fetch_invoice_by_id(conn: sqlite3.Connection, invoice_id: int) -> Optional[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, vendor_name, invoice_number, invoice_date, total_amount, currency, source_file, raw_text, created_at
        FROM invoices
        WHERE id = ?
        """,
        (invoice_id,),
    )
    row = cur.fetchone()
    return dict(row) if row else None


# -------------------------
# Embeddings
# -------------------------
def _to_blob(vec: np.ndarray) -> bytes:
    v = np.asarray(vec, dtype=np.float32)
    return v.tobytes(order="C")


def _from_blob(blob: bytes, dim: int) -> np.ndarray:
    arr = np.frombuffer(blob, dtype=np.float32)
    if dim > 0 and arr.size != dim:
        # If dim mismatch, still return best-effort
        return arr.astype(np.float32)
    return arr.astype(np.float32)


def upsert_embedding(conn: sqlite3.Connection, invoice_id: int, embedding: np.ndarray, model_name: str) -> None:
    vec = np.asarray(embedding, dtype=np.float32)
    dim = int(vec.size)

    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO invoice_embeddings (invoice_id, model_name, dim, embedding)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(invoice_id, model_name) DO UPDATE SET
          dim=excluded.dim,
          embedding=excluded.embedding,
          created_at=CURRENT_TIMESTAMP
        """,
        (invoice_id, model_name, dim, _to_blob(vec)),
    )
    conn.commit()


def fetch_embeddings(conn: sqlite3.Connection, model_name: str) -> List[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT invoice_id, model_name, dim, embedding
        FROM invoice_embeddings
        WHERE model_name = ?
        """,
        (model_name,),
    )
    out: List[Dict[str, Any]] = []
    for r in cur.fetchall():
        out.append(
            {
                "invoice_id": int(r["invoice_id"]),
                "model_name": r["model_name"],
                "dim": int(r["dim"]),
                "embedding": _from_blob(r["embedding"], int(r["dim"])),
            }
        )
    return out


# -------------------------
# Vendor amount stats (Welford)
# -------------------------
def get_vendor_amount_stats(conn: sqlite3.Connection, vendor_name: str) -> Optional[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT vendor_name, n, mean, m2
        FROM vendor_amount_stats
        WHERE vendor_name = ?
        """,
        (vendor_name,),
    )
    row = cur.fetchone()
    if not row:
        return None

    n = int(row["n"])
    mean = float(row["mean"])
    m2 = float(row["m2"])
    var = (m2 / (n - 1)) if n >= 2 else 0.0
    std = float(np.sqrt(var)) if var > 0 else 0.0

    return {"vendor_name": row["vendor_name"], "n": n, "mean": mean, "m2": m2, "std": std}


def update_vendor_amount_stats(conn: sqlite3.Connection, vendor_name: str, amount: float) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT n, mean, m2
        FROM vendor_amount_stats
        WHERE vendor_name = ?
        """,
        (vendor_name,),
    )
    row = cur.fetchone()

    x = float(amount)

    if not row:
        # First observation
        cur.execute(
            """
            INSERT INTO vendor_amount_stats (vendor_name, n, mean, m2)
            VALUES (?, ?, ?, ?)
            """,
            (vendor_name, 1, x, 0.0),
        )
        conn.commit()
        return

    n = int(row["n"])
    mean = float(row["mean"])
    m2 = float(row["m2"])

    n2 = n + 1
    delta = x - mean
    mean2 = mean + delta / n2
    delta2 = x - mean2
    m2_2 = m2 + delta * delta2

    cur.execute(
        """
        UPDATE vendor_amount_stats
        SET n = ?, mean = ?, m2 = ?
        WHERE vendor_name = ?
        """,
        (n2, mean2, m2_2, vendor_name),
    )
    conn.commit()


# -------------------------
# Price checks (LLM output)
# -------------------------
def save_price_check(conn: sqlite3.Connection, invoice_id: int, product_desc: str, result: Dict[str, Any]) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO price_checks
        (invoice_id, product_desc, estimated_market_low, estimated_market_high,
         assessment, confidence, explanation, model_name, raw_output)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(invoice_id) DO UPDATE SET
          product_desc=excluded.product_desc,
          estimated_market_low=excluded.estimated_market_low,
          estimated_market_high=excluded.estimated_market_high,
          assessment=excluded.assessment,
          confidence=excluded.confidence,
          explanation=excluded.explanation,
          model_name=excluded.model_name,
          raw_output=excluded.raw_output,
          created_at=CURRENT_TIMESTAMP
        """,
        (
            invoice_id,
            product_desc,
            result.get("estimated_market_low"),
            result.get("estimated_market_high"),
            result.get("assessment"),
            result.get("confidence"),
            result.get("explanation"),
            result.get("model"),
            result.get("raw_output"),
        ),
    )
    conn.commit()


def get_price_check(conn: sqlite3.Connection, invoice_id: int) -> Optional[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT invoice_id, product_desc, estimated_market_low, estimated_market_high,
               assessment, confidence, explanation, model_name, raw_output, created_at
        FROM price_checks
        WHERE invoice_id = ?
        """,
        (invoice_id,),
    )
    row = cur.fetchone()
    return dict(row) if row else None
