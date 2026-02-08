# llm_price_check.py
from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def run_price_check(
    product_desc: str,
    vendor_name: Optional[str],
    total_amount: Optional[float],
    currency: Optional[str] = "USD",
) -> Dict[str, Any]:
    if not GEMINI_API_KEY:
        return {
            "estimated_market_low": None,
            "estimated_market_high": None,
            "assessment": "UNKNOWN",
            "confidence": "LOW",
            "explanation": "GEMINI_API_KEY not set.",
            "model": GEMINI_MODEL,
        }

    vendor_name = vendor_name or "UNKNOWN"
    currency = currency or "USD"
    total_str = "UNKNOWN" if total_amount is None else f"{float(total_amount):.2f}"

    # ULTRA SHORT prompt
    prompt = f"""Price: {total_str} {currency}
Items: {product_desc[:100]}

OK or overpriced? Answer in 3 words then stop."""

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        # Simple call - no schema
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=100,  # Very short
            )
        )
        
        text = response.text.strip()
        print(f"DEBUG: Response: {text}")
        
        # Parse simple text response
        assessment = "UNKNOWN"
        if any(word in text.lower() for word in ["ok", "reasonable", "fair", "good"]):
            assessment = "OK"
        elif any(word in text.lower() for word in ["overpriced", "expensive", "high", "too much"]):
            assessment = "OVERPRICED"
        elif any(word in text.lower() for word in ["possibly", "maybe", "slightly"]):
            assessment = "POSSIBLY_OVERPRICED"
        
        return {
            "estimated_market_low": None,
            "estimated_market_high": None,
            "assessment": assessment,
            "confidence": "LOW",
            "explanation": text[:200],
            "model": GEMINI_MODEL,
        }

    except Exception as e:
        print(f"DEBUG: Error: {e}")
        return {
            "estimated_market_low": None,
            "estimated_market_high": None,
            "assessment": "UNKNOWN",
            "confidence": "LOW",
            "explanation": f"Error: {str(e)[:100]}",
            "model": GEMINI_MODEL,
        }