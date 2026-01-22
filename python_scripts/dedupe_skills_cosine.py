"""Deduplicate `skills` rows using cosine similarity between embeddings.

This script finds clusters of highly-similar skills and can optionally apply a
safe deduplication by deleting duplicates (keeping the smallest id).

It relies on embeddings in `skills.embedding` (float32 BLOB). If many rows are
missing embeddings, run `python python_scripts/embed_missing_skills.py` first.

Usage:
  # Dry-run report (recommended first)
  python python_scripts/dedupe_skills_cosine.py --threshold 0.97

  # Write CSV report
  python python_scripts/dedupe_skills_cosine.py --out python_scripts/out/dedupe_report.csv

  # Apply dedupe (updates any FK columns pointing to skills.id when present)
  python python_scripts/dedupe_skills_cosine.py --apply --threshold 0.985

Notes:
  - Default DB path matches Laravel: database/database.sqlite
  - This is O(n^2) but optimized with matrix multiplication; n≈3k is fine.
"""

from __future__ import annotations

import argparse
import csv
import math
import os
import sqlite3
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


def repo_root() -> str:
    here = os.path.abspath(os.path.dirname(__file__))
    return os.path.abspath(os.path.join(here, ".."))


def default_sqlite_path() -> str:
    return os.path.join(repo_root(), "database", "database.sqlite")


def connect_sqlite(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def normalize_skill_name(name: str) -> str:
    name = name.strip()
    name = " ".join(name.split())
    return name.lower()


def decode_f32_blob(blob: bytes) -> "np.ndarray":
    import numpy as np  # type: ignore

    # Stored as float32 little endian; numpy will interpret correctly on LE platforms.
    arr = np.frombuffer(blob, dtype=np.float32)
    return arr


@dataclass(frozen=True)
class SkillRow:
    id: int
    name: str
    embedding: "np.ndarray"


class UnionFind:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> None:
        ra = self.find(a)
        rb = self.find(b)
        if ra == rb:
            return
        if self.rank[ra] < self.rank[rb]:
            self.parent[ra] = rb
        elif self.rank[ra] > self.rank[rb]:
            self.parent[rb] = ra
        else:
            self.parent[rb] = ra
            self.rank[ra] += 1


def list_tables(conn: sqlite3.Connection) -> List[str]:
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).fetchall()
    return [r[0] for r in rows if isinstance(r[0], str)]


def fk_columns_referencing_skills(conn: sqlite3.Connection) -> List[Tuple[str, str]]:
    # Returns list of (table, from_column) where FK references skills(id)
    out: List[Tuple[str, str]] = []
    for table in list_tables(conn):
        fks = conn.execute(f"PRAGMA foreign_key_list({table});").fetchall()
        for fk in fks:
            # pragma columns: (id, seq, table, from, to, on_update, on_delete, match)
            ref_table = fk[2]
            from_col = fk[3]
            to_col = fk[4]
            if ref_table == "skills" and to_col == "id" and isinstance(from_col, str):
                out.append((table, from_col))
    return out


def load_skill_embeddings(conn: sqlite3.Connection) -> List[SkillRow]:
    import numpy as np  # type: ignore

    rows = conn.execute(
        "SELECT id, name, embedding FROM skills WHERE embedding IS NOT NULL AND length(embedding) > 0 ORDER BY id ASC"
    ).fetchall()

    out: List[SkillRow] = []
    dim: Optional[int] = None
    for row_id, name, blob in rows:
        if not isinstance(row_id, int) or not isinstance(name, str) or not isinstance(blob, (bytes, bytearray)):
            continue
        vec = decode_f32_blob(bytes(blob))
        if vec.size == 0:
            continue
        if dim is None:
            dim = int(vec.size)
        if int(vec.size) != int(dim):
            # Skip inconsistent vectors
            continue
        out.append(SkillRow(id=row_id, name=name, embedding=vec.astype(np.float32, copy=False)))

    return out


def unit_normalize_matrix(mat: "np.ndarray") -> "np.ndarray":
    import numpy as np  # type: ignore

    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return mat / norms


def compute_clusters(
    skills: Sequence[SkillRow],
    threshold: float,
    block_size: int,
    also_normalized_name: bool,
) -> Tuple[Dict[int, List[int]], Dict[Tuple[int, int], float]]:
    import numpy as np  # type: ignore

    n = len(skills)
    uf = UnionFind(n)

    # 1) Cheap, deterministic grouping by normalized name (case/whitespace)
    if also_normalized_name:
        norm_to_idx: Dict[str, List[int]] = defaultdict(list)
        for idx, s in enumerate(skills):
            norm_to_idx[normalize_skill_name(s.name)].append(idx)
        for idxs in norm_to_idx.values():
            if len(idxs) <= 1:
                continue
            base = idxs[0]
            for other in idxs[1:]:
                uf.union(base, other)

    # 2) Cosine similarity graph on embeddings
    mat = np.stack([s.embedding for s in skills]).astype(np.float32)
    mat = unit_normalize_matrix(mat)

    sim_cache: Dict[Tuple[int, int], float] = {}

    for start in range(0, n, block_size):
        end = min(n, start + block_size)
        block = mat[start:end]
        sims = block @ mat.T  # (block, n)

        for local_i in range(end - start):
            i = start + local_i
            row = sims[local_i]
            # Ignore self + lower triangle
            row[: i + 1] = -1.0
            js = np.where(row >= threshold)[0]
            if js.size == 0:
                continue
            for j in js.tolist():
                uf.union(i, int(j))
                sim_cache[(i, int(j))] = float(row[int(j)])

    clusters: Dict[int, List[int]] = defaultdict(list)
    for idx in range(n):
        clusters[uf.find(idx)].append(idx)

    # Filter singletons
    clusters = {root: idxs for root, idxs in clusters.items() if len(idxs) > 1}
    return clusters, sim_cache


def choose_representative(skills: Sequence[SkillRow], idxs: Sequence[int]) -> int:
    # Keep the smallest DB id by default.
    return min(idxs, key=lambda i: skills[i].id)


def ensure_out_dir(path: str) -> None:
    d = os.path.dirname(os.path.abspath(path))
    if d and not os.path.isdir(d):
        os.makedirs(d, exist_ok=True)


def write_report_csv(
    out_path: str,
    skills: Sequence[SkillRow],
    clusters: Dict[int, List[int]],
    threshold: float,
) -> None:
    ensure_out_dir(out_path)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cluster_size", "keep_id", "keep_name", "dup_id", "dup_name", "similarity_threshold"])

        for idxs in clusters.values():
            rep = choose_representative(skills, idxs)
            keep = skills[rep]
            for i in idxs:
                if i == rep:
                    continue
                dup = skills[i]
                w.writerow([len(idxs), keep.id, keep.name, dup.id, dup.name, threshold])


def apply_dedupe(conn: sqlite3.Connection, skills: Sequence[SkillRow], clusters: Dict[int, List[int]]) -> None:
    fk_cols = fk_columns_referencing_skills(conn)

    # Build delete plan: list of (keep_id, dup_ids)
    plan: List[Tuple[int, List[int]]] = []
    for idxs in clusters.values():
        rep = choose_representative(skills, idxs)
        keep_id = skills[rep].id
        dup_ids = sorted([skills[i].id for i in idxs if i != rep])
        if dup_ids:
            plan.append((keep_id, dup_ids))

    if not plan:
        print("No clusters to apply.")
        return

    conn.execute("BEGIN;")

    # Update foreign keys if any exist.
    for table, col in fk_cols:
        for keep_id, dup_ids in plan:
            placeholders = ",".join(["?"] * len(dup_ids))
            conn.execute(
                f"UPDATE {table} SET {col} = ? WHERE {col} IN ({placeholders})",
                [keep_id, *dup_ids],
            )

    # Delete dup skills
    for keep_id, dup_ids in plan:
        placeholders = ",".join(["?"] * len(dup_ids))
        conn.execute(f"DELETE FROM skills WHERE id IN ({placeholders})", dup_ids)

    conn.commit()
    print(f"Applied dedupe: deleted {sum(len(d) for _, d in plan)} rows; kept {len(plan)} representatives")


def main() -> int:
    parser = argparse.ArgumentParser(description="Deduplicate skills using cosine similarity")
    parser.add_argument("--db", default=default_sqlite_path(), help="Path to SQLite database")
    parser.add_argument("--threshold", type=float, default=0.985, help="Cosine similarity threshold")
    parser.add_argument("--block-size", type=int, default=256, help="Matrix multiply block size")
    parser.add_argument(
        "--also-normalized-name",
        action="store_true",
        help="Also cluster exact matches after normalization (case/whitespace)",
    )
    parser.add_argument("--out", default="", help="Write CSV report to this path")
    parser.add_argument("--apply", action="store_true", help="Apply deduplication (deletes duplicate skills)")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.isfile(db_path):
        raise SystemExit(f"SQLite DB not found: {db_path}")

    if not (0.0 < args.threshold <= 1.0):
        raise SystemExit("--threshold must be in (0, 1]")

    conn = connect_sqlite(db_path)
    skills = load_skill_embeddings(conn)

    print(f"DB: {db_path}")
    print(f"Skills with embeddings: {len(skills)}")

    if len(skills) < 2:
        print("Not enough embedded skills to dedupe.")
        return 0

    clusters, _sim_cache = compute_clusters(
        skills,
        threshold=float(args.threshold),
        block_size=int(args.block_size),
        also_normalized_name=bool(args.also_normalized_name),
    )

    print(f"Clusters found (size>1): {len(clusters)}")
    if len(clusters) == 0:
        return 0

    # Show a small preview
    shown = 0
    for idxs in clusters.values():
        rep = choose_representative(skills, idxs)
        keep = skills[rep]
        dup_names = [skills[i].name for i in idxs if i != rep][:5]
        print(f"- keep #{keep.id} '{keep.name}'  dups: {dup_names}{'...' if len(idxs) - 1 > 5 else ''}")
        shown += 1
        if shown >= 10:
            break

    if args.out:
        write_report_csv(args.out, skills, clusters, float(args.threshold))
        print(f"Wrote report: {os.path.abspath(args.out)}")

    if args.apply:
        apply_dedupe(conn, skills, clusters)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
