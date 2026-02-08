# ocr.py
from __future__ import annotations
import cv2
import numpy as np
import pytesseract

def preprocess_for_ocr(image_path: str) -> np.ndarray:
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not read image: {image_path}")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise + improve contrast
    gray = cv2.bilateralFilter(gray, 9, 75, 75)

    # Adaptive threshold for scanned docs
    thr = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 10
    )

    # Optional: deskew (simple)
    coords = np.column_stack(np.where(thr < 255))
    if coords.size > 0:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        (h, w) = thr.shape[:2]
        M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
        thr = cv2.warpAffine(thr, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    return thr

def ocr_text(image_path: str) -> str:
    img = preprocess_for_ocr(image_path)
    config = "--oem 3 --psm 6"  # LSTM, assume a block of text
    text = pytesseract.image_to_string(img, config=config)
    return (text or "").strip()
