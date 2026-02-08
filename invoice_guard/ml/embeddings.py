# ml/embeddings.py
from __future__ import annotations
import numpy as np
from sentence_transformers import SentenceTransformer

DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

class Embedder:
    def __init__(self, model_name: str = DEFAULT_MODEL):
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)

    def embed_text(self, text: str) -> np.ndarray:
        # Normalize whitespace to reduce OCR jitter
        norm = " ".join((text or "").split())
        emb = self.model.encode([norm], normalize_embeddings=True)[0]
        return np.asarray(emb, dtype=np.float32)

def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    # embeddings are already normalized; dot == cosine
    return float(np.dot(a, b))
