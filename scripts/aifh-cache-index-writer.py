#!/usr/bin/env python3

"""
AIHF cache index writer (drop-in helper).

Why this exists
- AIHF's `cache_aifh/` payloads are often stored as hash-keyed blobs without request metadata.
- VINCE/Dexter can only reuse/import caches deterministically if we also persist:
  cacheKey -> (endpoint, params, ticker, start/end, createdAt, expiresAt)

How to use in AIHF
- Call `append_cache_index(...)` at the moment you write a cache file.
- Pass the cache key (filename without extension), endpoint, params, and any derived fields.
- This writes a single JSONL record to: <cache_root>/index.jsonl

This script is safe to copy into the AIHF repo and import from wherever your cache write happens.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import asdict, dataclass
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class CacheIndexEntry:
    key: str
    kind: str
    endpoint: str
    params: Dict[str, Any]
    createdAt: float
    expiresAt: Optional[float] = None

    # Optional convenience fields for importers
    ticker: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None


def _normalize_ticker(ticker: Optional[str]) -> Optional[str]:
    if not ticker or not isinstance(ticker, str):
        return None
    t = ticker.strip().upper()
    return t or None


def append_cache_index(
    *,
    cache_root: str,
    key: str,
    kind: str,
    endpoint: str,
    params: Dict[str, Any],
    expires_at: Optional[float] = None,
    ticker: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> str:
    """
    Append a JSONL cache index row. Returns the written line (string).
    """
    entry = CacheIndexEntry(
        key=key,
        kind=kind,
        endpoint=endpoint,
        params=params or {},
        createdAt=time.time(),
        expiresAt=expires_at,
        ticker=_normalize_ticker(ticker) or _normalize_ticker(str(params.get("ticker", ""))),
        startDate=start_date or (params.get("start_date") if isinstance(params, dict) else None),
        endDate=end_date or (params.get("end_date") if isinstance(params, dict) else None),
    )

    os.makedirs(cache_root, exist_ok=True)
    index_path = os.path.join(cache_root, "index.jsonl")
    line = json.dumps(asdict(entry), separators=(",", ":"), ensure_ascii=False)
    with open(index_path, "a", encoding="utf-8") as f:
        f.write(line + "\n")
    return line


if __name__ == "__main__":
    # Example (for local testing only)
    append_cache_index(
        cache_root="./cache_aifh",
        key="fff3600a3d195b4f2766558cbd728268",
        kind="prices",
        endpoint="/prices/",
        params={"ticker": "NVDA", "interval": "day", "start_date": "2024-01-01", "end_date": "2026-03-01"},
        expires_at=time.time() + 7 * 24 * 60 * 60,
    )

