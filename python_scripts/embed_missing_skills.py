"""Create embeddings for skills that do not yet have embeddings in SQLite.

This populates `skills.embedding` (BLOB) for any rows where embedding is NULL/empty.
Embeddings are stored as float32 little-endian bytes, matching Laravel's
`SkillAlignmentService` decoding logic.

Default DB path matches Laravel: database/database.sqlite

Usage:
  python python_scripts/embed_missing_skills.py
  python python_scripts/embed_missing_skills.py --limit 500
  python python_scripts/embed_missing_skills.py --db path/to/database.sqlite

Notes:
  - Requires: sentence-transformers, torch, numpy (see python_scripts/requirements.txt)
  - First run may download the model.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
from typing import Iterable, List, Sequence, Tuple


def repo_root() -> str:
    here = os.path.abspath(os.path.dirname(__file__))
    return os.path.abspath(os.path.join(here, ".."))


def default_sqlite_path() -> str:
    return os.path.join(repo_root(), "database", "database.sqlite")


def connect_sqlite(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def normalize_skill_name(name: str) -> str:
    name = name.strip()
    name = " ".join(name.split())
    return name.lower()


def ensure_skills_schema(conn: sqlite3.Connection) -> None:
    # Table might already exist (Laravel migration). Ensure column exists.
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            embedding BLOB
        );
        """
    )

    cols = [row[1] for row in conn.execute("PRAGMA table_info(skills);").fetchall()]
    if "embedding" not in cols:
        conn.execute("ALTER TABLE skills ADD COLUMN embedding BLOB;")

    # Useful index for name lookups.
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_skills_name ON skills(name);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);")
    conn.commit()


def fetch_missing(conn: sqlite3.Connection, limit: int | None) -> List[Tuple[int, str]]:
    sql = """
        SELECT id, name
        FROM skills
        WHERE embedding IS NULL OR length(embedding) = 0
        ORDER BY id ASC
    """
    if limit is not None:
        sql += " LIMIT ?"
        rows = conn.execute(sql, (limit,)).fetchall()
    else:
        rows = conn.execute(sql).fetchall()

    out: List[Tuple[int, str]] = []
    for row_id, name in rows:
        if isinstance(row_id, int) and isinstance(name, str) and name.strip() != "":
            out.append((row_id, name))
    return out


def batched(items: Sequence[Tuple[int, str]], batch_size: int) -> Iterable[Sequence[Tuple[int, str]]]:
    for i in range(0, len(items), batch_size):
        yield items[i : i + batch_size]


def build_embeddings(texts: Sequence[str], model_name: str, batch_size: int) -> Tuple[List[bytes], int, str]:
    from sentence_transformers import SentenceTransformer  # type: ignore
    import numpy as np  # type: ignore
    import torch  # type: ignore

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = SentenceTransformer(model_name, device=device)

    emb = model.encode(
        list(texts),
        batch_size=batch_size,
        show_progress_bar=True,
        convert_to_numpy=True,
        # Keep it normalized so cosine similarity becomes dot product.
        normalize_embeddings=True,
    )

    if emb.dtype != np.float32:
        emb = emb.astype(np.float32)

    dim = int(emb.shape[1])
    blobs = [emb[i].tobytes() for i in range(emb.shape[0])]
    return blobs, dim, device


def main() -> int:
    parser = argparse.ArgumentParser(description="Create embeddings for skills missing embeddings")
    parser.add_argument("--db", default=default_sqlite_path(), help="Path to SQLite database")
    parser.add_argument("--model", default="all-MiniLM-L6-v2", help="Sentence-Transformers model name")
    parser.add_argument("--batch-size", type=int, default=128, help="Embedding batch size")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of missing rows (0 = no limit)")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.isfile(db_path):
        raise SystemExit(f"SQLite DB not found: {db_path}")

    conn = connect_sqlite(db_path)
    ensure_skills_schema(conn)

    limit = None if int(args.limit) <= 0 else int(args.limit)
    rows = fetch_missing(conn, limit)

    print(f"DB: {db_path}")
    print(f"Missing embeddings: {len(rows)}")
    if len(rows) == 0:
        return 0

    # We embed the normalized (lowercased) version to match server-side normalization.
    # We do NOT rewrite skills.name here (that’s handled by dedicated dedupe/cleanup scripts).
    all_updates: List[Tuple[bytes, int]] = []

    for batch in batched(rows, int(args.batch_size)):
        ids = [row_id for row_id, _ in batch]
        texts = [normalize_skill_name(name) for _, name in batch]

        blobs, dim, device = build_embeddings(texts, args.model, int(args.batch_size))
        print(f"Embedded batch size={len(blobs)} dim={dim} device={device}")

        all_updates.extend(list(zip(blobs, ids)))

        # Write batch immediately to keep memory stable.
        conn.executemany("UPDATE skills SET embedding = ? WHERE id = ?", all_updates)
        conn.commit()
        all_updates.clear()

    remaining = conn.execute(
        "SELECT count(*) FROM skills WHERE embedding IS NULL OR length(embedding) = 0"
    ).fetchone()[0]
    print(f"Remaining missing embeddings: {remaining}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
