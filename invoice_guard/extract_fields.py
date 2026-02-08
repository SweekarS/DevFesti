# extract_fields.py
from __future__ import annotations
import re
from dataclasses import dataclass, asdict
from dateutil import parser as dateparser

MONEY_RE = re.compile(r"(?:(?:USD|\$)\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)")
INVOICE_NO_RE = re.compile(r"(?:invoice\s*(?:no\.?|number|#)\s*[:\-]?\s*)([A-Z0-9][A-Z0-9\-\_/]{2,})", re.IGNORECASE)
DATE_HINT_RE = re.compile(r"(?:invoice\s*date|date)\s*[:\-]?\s*(.+)", re.IGNORECASE)
VENDOR_LABEL_RE = re.compile(
    r"^(?:seller|vendor|from|billed\s*from|supplier)\s*[:\-]\s*(.+)$",
    re.IGNORECASE
)

# Sometimes OCR gives: "Seller: <name>   Client: <name>"
SELLER_INLINE_RE = re.compile(r"seller\s*[:\-]\s*(.+?)(?:\s{2,}|client\s*[:\-]|bill\s*to\s*[:\-]|ship\s*to\s*[:\-]|$)", re.IGNORECASE)

@dataclass
class InvoiceRecord:
    vendor_name: str | None
    invoice_number: str | None
    invoice_date: str | None  # ISO yyyy-mm-dd
    total_amount: float | None
    currency: str | None
    raw_text: str

def _clean_vendor_guess(lines: list[str]) -> str | None:
    bad_tokens = [
        "invoice", "bill to", "ship to", "date", "due", "total", "balance",
        "tax id", "tin", "vat", "gst", "ssn", "po", "purchase order",
        "amount", "payment", "terms", "remit", "account", "routing"
    ]
    def looks_like_metadata(s: str) -> bool:
        s_low = s.lower()
        if any(tok in s_low for tok in bad_tokens):
            return True
        if "@" in s_low or "www." in s_low:
            return True
        # too numeric
        if sum(c.isdigit() for c in s) > max(3, len(s)//3):
            return True
        return False
    GENERIC_LABELS = {
    "seller", "client", "seller:", "client:", "seller: client:"
}
    

    # 1) Keyword-driven extraction (best)
    for ln in lines[:30]:
        s = ln.strip()
        if not s:
            continue

        # inline: "Seller: X   Client: Y"
        m_inline = SELLER_INLINE_RE.search(s)
        if m_inline:
            cand = m_inline.group(1).strip(" -—–\t")
            if cand.lower().strip() in GENERIC_LABELS:
                continue
            if cand and not looks_like_metadata(cand) and 3 <= len(cand) <= 60:
                return cand[:80]
            

        # line starts with Seller/Vendor/From:
        m = VENDOR_LABEL_RE.match(s)
        if m:
            cand = m.group(1).strip(" -—–\t")
            if cand.lower().strip() in GENERIC_LABELS:
                continue
            if cand and not looks_like_metadata(cand) and 3 <= len(cand) <= 60:
                return cand[:80]

    # 2) If we see a line that is JUST "Seller:" then next non-empty line is likely the name
    for i, ln in enumerate(lines[:30]):
        s = ln.strip().lower().strip(" -—–")
        if s in ("seller:", "seller", "vendor:", "vendor", "from:", "from", "supplier:", "supplier"):
            # grab next meaningful line
            for j in range(i + 1, min(i + 6, len(lines))):
                cand = lines[j].strip(" -—–\t")
                if cand.lower().strip() in GENERIC_LABELS:
                    continue
                if cand and not looks_like_metadata(cand) and 3 <= len(cand) <= 60:
                    return cand[:80]
    

    # 3) Fallback: first plausible “name-like” line
    for ln in lines[:30]:
        cand = ln.strip(" -—–\t")
        if not cand or len(cand) < 3:
            continue
        if looks_like_metadata(cand):
            continue
        if 4 <= len(cand) <= 40:
            # avoid generic labels
            if cand.lower().strip() in GENERIC_LABELS:
                continue
            if cand.lower() in ("seller", "client", "seller: client:", "seller: client:"):
                continue
            return cand[:80]

    return None



def _parse_date(text: str) -> str | None:
    try:
        dt = dateparser.parse(text, fuzzy=True)
        if dt:
            return dt.date().isoformat()
    except Exception:
        return None
    return None

def extract_fields(ocr_text: str) -> InvoiceRecord:
    lines = [l.strip() for l in ocr_text.splitlines()]
    lines = [l for l in lines if l]

    vendor_name = _clean_vendor_guess(lines)

    invoice_number = None
    m = INVOICE_NO_RE.search(ocr_text)
    if m:
        invoice_number = m.group(1).strip().upper()

    invoice_date = None
    # Try date line hint first
    m = DATE_HINT_RE.search(ocr_text)
    if m:
        invoice_date = _parse_date(m.group(1))

    # Fallback: pick first parsable date from text
    if invoice_date is None:
        # common formats like 01/02/2025, 2025-01-02
        date_candidates = re.findall(r"\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b", ocr_text)
        for dc in date_candidates[:5]:
            invoice_date = _parse_date(dc)
            if invoice_date:
                break

    # Total amount: prefer lines near "Total" / "Amount Due"
    total_amount = None
    currency = None
    lowered = ocr_text.lower()

    def find_amount_near(keyword: str) -> float | None:
        idx = lowered.find(keyword)
        if idx == -1:
            return None
        window = ocr_text[max(0, idx-50): idx+120]
        amounts = MONEY_RE.findall(window)
        if not amounts:
            return None
        # choose the largest amount in window (often total)
        vals = []
        for a in amounts:
            try:
                vals.append(float(a.replace(",", "")))
            except Exception:
                pass
        return max(vals) if vals else None

    total_amount = (find_amount_near("amount due")
                    or find_amount_near("total")
                    or find_amount_near("balance due"))

    if "usd" in lowered or "$" in ocr_text:
        currency = "USD"

    return InvoiceRecord(
        vendor_name=vendor_name,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        total_amount=total_amount,
        currency=currency,
        raw_text=ocr_text
    )

def to_dict(rec: InvoiceRecord) -> dict:
    return asdict(rec)
