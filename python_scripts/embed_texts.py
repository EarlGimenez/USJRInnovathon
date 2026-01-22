"""Embed a list of short texts (skills) using SentenceTransformers.

Reads JSON array of strings from stdin and outputs JSON array of embeddings (list[float]).
Uses CUDA if available.

Usage:
  uv run python_scripts/embed_texts.py < input.json
"""

import json
import sys
from typing import List


def main() -> int:
    raw = sys.stdin.read()
    try:
        texts = json.loads(raw)
    except Exception:
        sys.stdout.write(json.dumps({"error": "invalid_json_input"}))
        return 2

    if not isinstance(texts, list) or not all(isinstance(t, str) for t in texts):
        sys.stdout.write(json.dumps({"error": "expected_json_array_of_strings"}))
        return 2

    try:
        import torch
        from sentence_transformers import SentenceTransformer

        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = SentenceTransformer("all-MiniLM-L6-v2", device=device)

        # Normalize embeddings so cosine similarity is dot product
        emb = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        out: List[List[float]] = emb.astype("float32").tolist()
        sys.stdout.write(json.dumps(out))
        return 0
    except Exception as e:
        sys.stdout.write(json.dumps({"error": "embedding_failed", "details": str(e)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
