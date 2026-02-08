# product_extraction.py
from __future__ import annotations
import re
from typing import List, Optional

HEADER_BAD_PATTERNS = [
    r"^\s*no\.\s*$", r"^\s*description\s*$", r"^\s*qty\s*$", r"^\s*quantity\s*$",
    r"^\s*um\s*$", r"^\s*unit\s*$", r"^\s*net\s*price\s*$", r"^\s*gross\s*$",
    r"^\s*vat\s*$", r"^\s*tax\s*$", r"^\s*subtotal\s*$", r"^\s*total\s*$",
    r"^\s*amount\s*$", r"^\s*price\s*$", r"^\s*rate\s*$",
    r"^\s*invoice\s*(number|date|to|from)?\s*$",
    r"^\s*sold\s*to\s*$", r"^\s*bill\s*to\s*$", r"^\s*ship\s*to\s*$",
]

BAD_LINE_RE = re.compile("|".join(HEADER_BAD_PATTERNS), re.IGNORECASE)

# Match money patterns: $100.00, 100.00, 1,234.56
MONEY_RE = re.compile(r"(?:\$\s*)?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?", re.IGNORECASE)

# Match item-like patterns (number + words + maybe price)
ITEM_LINE_RE = re.compile(r"^\s*\d+\.?\s+[A-Za-z].*", re.IGNORECASE)

def _clean_line(s: str) -> str:
    s = re.sub(r"[^\x20-\x7E]+", " ", s)  # drop weird unicode
    s = re.sub(r"\s+", " ", s).strip()
    return s

def extract_item_lines(raw_text: str) -> List[str]:
    """Extract likely product/service line items from invoice text."""
    lines = [_clean_line(x) for x in (raw_text or "").splitlines()]
    lines = [l for l in lines if len(l) >= 6]

    candidates = []
    
    for l in lines:
        # Skip obvious headers
        if BAD_LINE_RE.match(l):
            continue
        
        # Skip if too short or all uppercase (likely header)
        if len(l) < 10 or l.isupper():
            continue
        
        # Skip lines that are just addresses or dates
        if re.match(r"^\s*\d{4}-\d{2}-\d{2}\s*$", l):  # dates
            continue
        if re.match(r"^[A-Z][a-z]+,\s*[A-Z]{2}\s+\d{5}", l):  # addresses like "City, ST 12345"
            continue
            
        # PREFER lines that look like item descriptions:
        # - Start with a number (line item number)
        # - Contain descriptive text
        # - Have a price somewhere
        has_number_start = ITEM_LINE_RE.match(l)
        has_money = MONEY_RE.search(l)
        has_words = len(l.split()) >= 3
        
        if has_number_start and has_money:
            candidates.append(("high", l))  # high priority
        elif has_money and has_words and not l.startswith(("Total", "Subtotal", "Tax")):
            candidates.append(("medium", l))  # medium priority
        elif has_words and len(l) > 20 and not re.search(r"\d{5}", l):  # avoid addresses
            candidates.append(("low", l))  # low priority
    
    # Sort by priority
    candidates.sort(key=lambda x: {"high": 0, "medium": 1, "low": 2}[x[0]])
    
    # De-dup and extract just the lines
    seen = set()
    out = []
    for priority, l in candidates:
        key = l.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(l)
        if len(out) >= 5:
            break
    
    return out

def pick_product_desc(raw_text: str) -> str:
    """Pick the best product description from invoice text."""
    items = extract_item_lines(raw_text)
    
    if not items:
        # Fallback: return first non-trivial lines that aren't addresses
        lines = [_clean_line(x) for x in (raw_text or "").splitlines()]
        for l in lines:
            if len(l) > 15 and not BAD_LINE_RE.match(l) and not re.match(r"^[A-Z][a-z]+,\s*[A-Z]{2}", l):
                return l
        return "UNKNOWN"
    
    # Return top 3 items joined together for better context
    return " | ".join(items[:3])