# utils.py
from __future__ import annotations
import json

def pretty(obj) -> str:
    return json.dumps(obj, indent=2, ensure_ascii=False)
