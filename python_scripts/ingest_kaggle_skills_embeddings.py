"""Ingest Kaggle 'skills' dataset into Laravel SQLite and store GPU embeddings.

Dataset:
  kagglehub.dataset_download("zamamahmed211/skills")

Table:
  skills(id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT UNIQUE NOT NULL,
         embedding BLOB)

Embedding storage:
  - embedding is stored as float32 bytes (BLOB) to keep SQLite compact.

Usage (from repo root):
  python python_scripts/ingest_kaggle_skills_embeddings.py

Notes:
  - Requires Kaggle credentials for kagglehub (typically %USERPROFILE%/.kaggle/kaggle.json).
  - Uses CUDA if available.
  
HOW TO RUN:
    1. Install dependencies:
        pip install -r python_scripts/requirements.txt
    2. python python_scripts/ingest_kaggle_skills_embeddings.py
"""

from __future__ import annotations

import argparse
import glob
import os
import sqlite3
from dataclasses import dataclass
from typing import Iterable, List, Optional, Sequence, Tuple


@dataclass(frozen=True)
class CandidateSkillRow:
    name: str
    embedding: bytes


def repo_root() -> str:
    here = os.path.abspath(os.path.dirname(__file__))
    return os.path.abspath(os.path.join(here, ".."))


def default_sqlite_path() -> str:
    # Matches Laravel default: database/database.sqlite
    return os.path.join(repo_root(), "database", "database.sqlite")


def connect_sqlite(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def ensure_skills_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            embedding BLOB
        );
        """
    )

    # If the table already existed (possibly created by Laravel migration),
    # ensure the expected columns exist.
    cols = [row[1] for row in conn.execute("PRAGMA table_info(skills);").fetchall()]
    if "name" not in cols:
        raise RuntimeError("Existing 'skills' table is missing required column: name")
    if "embedding" not in cols:
        conn.execute("ALTER TABLE skills ADD COLUMN embedding BLOB;")

    # If the table was created outside of this script (or via an older migration),
    # `name` might not actually be UNIQUE. SQLite requires the conflict target to
    # match a PRIMARY KEY or UNIQUE constraint/index, otherwise ON CONFLICT(...) fails.
    #
    # 1) Normalize existing names to reduce duplicates
    # 2) Remove any duplicates that remain
    # 3) Create a UNIQUE index so ON CONFLICT(name) works reliably
    existing = conn.execute("SELECT id, name FROM skills").fetchall()
    for row_id, name in existing:
        normalized = normalize_skill_name(name)
        if normalized and normalized != name:
            conn.execute("UPDATE skills SET name = ? WHERE id = ?", (normalized, row_id))

    # Keep the earliest row per name, delete the rest
    conn.execute(
        """
        DELETE FROM skills
        WHERE id NOT IN (
            SELECT MIN(id) FROM skills GROUP BY name
        );
        """
    )

    # Ensure uniqueness for the ON CONFLICT clause
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_skills_name ON skills(name);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);")
    conn.commit()


def table_has_column(conn: sqlite3.Connection, table: str, column: str) -> bool:
    cols = [row[1] for row in conn.execute(f"PRAGMA table_info({table});").fetchall()]
    return column in cols


def normalize_skill_name(name: str) -> str:
    name = name.strip()
    name = " ".join(name.split())
    # Use a stable casing to avoid case-only duplicates in SQLite.
    name = name.lower()
    return name


def read_single_column_strings_from_file(path: str) -> List[str]:
    # Supports csv/tsv/txt/xlsx. The Kaggle dataset is 1-column strings (3290 rows).
    # We attempt to read via pandas if available; fallback to plain text.
    try:
        import pandas as pd  # type: ignore

        ext = os.path.splitext(path)[1].lower()
        if ext in {".csv", ".tsv"}:
            sep = "\t" if ext == ".tsv" else ","
            df = pd.read_csv(path, sep=sep)
        elif ext in {".xlsx", ".xls"}:
            df = pd.read_excel(path)
        elif ext in {".parquet"}:
            df = pd.read_parquet(path)
        else:
            # try best-effort csv
            df = pd.read_csv(path)

        if df.shape[1] != 1:
            raise ValueError(f"Expected 1 column, got {df.shape[1]} columns")

        col = df.columns[0]
        values = df[col].astype(str).tolist()
        return values
    except Exception:
        # Fallback: treat as line-delimited text
        values: List[str] = []
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                values.append(line)
        return values


def find_dataset_file(dataset_dir: str) -> str:
    # Prefer common single-file dataset formats.
    patterns = [
        "*.csv",
        "*.tsv",
        "*.xlsx",
        "*.xls",
        "*.parquet",
        "*.txt",
    ]
    matches: List[str] = []
    for pat in patterns:
        matches.extend(glob.glob(os.path.join(dataset_dir, pat)))

    if not matches:
        # If kagglehub returns nested dir structure
        for pat in patterns:
            matches.extend(glob.glob(os.path.join(dataset_dir, "**", pat), recursive=True))

    if not matches:
        raise FileNotFoundError(
            f"No dataset file found in {dataset_dir}. Expected one of: {', '.join(patterns)}"
        )

    # Pick the largest file as the most likely data file.
    matches.sort(key=lambda p: os.path.getsize(p), reverse=True)
    return matches[0]


def download_kaggle_dataset() -> str:
    import kagglehub  # type: ignore

    return kagglehub.dataset_download("zamamahmed211/skills")


def build_embeddings(
    texts: Sequence[str],
    model_name: str,
    batch_size: int,
) -> Tuple[List[bytes], int, str]:
    # Uses sentence-transformers on CUDA when available.
    from sentence_transformers import SentenceTransformer  # type: ignore
    import numpy as np  # type: ignore
    import torch  # type: ignore

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = SentenceTransformer(model_name, device=device)

    embeddings = model.encode(
        list(texts),
        batch_size=batch_size,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=False,
    )

    if embeddings.dtype != np.float32:
        embeddings = embeddings.astype(np.float32)

    dim = int(embeddings.shape[1])
    blobs = [embeddings[i].tobytes() for i in range(embeddings.shape[0])]
    return blobs, dim, device



def upsert_skills(conn: sqlite3.Connection, rows: Sequence[CandidateSkillRow], *, user_id: int | None = None) -> None:
    # Some project variants store user skills as rows with a NOT NULL `user_id` column.
    # If present, we must include it in the insert.
    if table_has_column(conn, "skills", "user_id"):
        if user_id is None:
            raise ValueError("skills.user_id exists but no user_id was provided")

        conn.executemany(
            """
            INSERT INTO skills(user_id, name, embedding)
            VALUES(?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                embedding=excluded.embedding;
            """,
            [(user_id, r.name, r.embedding) for r in rows],
        )
        return

    conn.executemany(
        """
        INSERT INTO skills(name, embedding)
        VALUES(?, ?)
        ON CONFLICT(name) DO UPDATE SET
            embedding=excluded.embedding;
        """,
        [(r.name, r.embedding) for r in rows],
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest Kaggle skills dataset into SQLite with embeddings")
    parser.add_argument("--db", default=default_sqlite_path(), help="Path to SQLite database file")
    parser.add_argument(
        "--model",
        default="sentence-transformers/all-MiniLM-L6-v2",
        help="Sentence-Transformers model name",
    )
    parser.add_argument(
        "--user-id",
        type=int,
        default=1,
        help="If the `skills` table has a NOT NULL user_id column, use this value for inserts",
    )
    parser.add_argument("--batch-size", type=int, default=256, help="Embedding batch size (tune for your GPU VRAM)")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"SQLite DB not found at: {db_path}")

    dataset_dir = download_kaggle_dataset()
    dataset_file = find_dataset_file(dataset_dir)

    raw_skills = read_single_column_strings_from_file(dataset_file)
    normalized = [normalize_skill_name(s) for s in raw_skills]
    normalized = [s for s in normalized if s]

    # Deduplicate while preserving order
    seen = set()
    unique_skills: List[str] = []
    for s in normalized:
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        unique_skills.append(s)

    print(f"Dataset path: {dataset_dir}")
    print(f"Using file: {dataset_file}")
    print(f"Rows (raw): {len(raw_skills)}")
    print(f"Rows (unique): {len(unique_skills)}")

    conn = connect_sqlite(db_path)
    try:
        ensure_skills_table(conn)

        blobs, dim, device = build_embeddings(unique_skills, args.model, args.batch_size)
        print(f"Embedding dim: {dim}; device: {device}")

        rows = [CandidateSkillRow(name=unique_skills[i], embedding=blobs[i]) for i in range(len(unique_skills))]

        # Insert in chunks to keep memory/transactions manageable
        chunk_size = 500
        for start in range(0, len(rows), chunk_size):
            chunk = rows[start : start + chunk_size]
            upsert_skills(conn, chunk, user_id=args.user_id)
            conn.commit()
            print(f"Upserted {min(start + chunk_size, len(rows))}/{len(rows)}")

        print("Done.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
