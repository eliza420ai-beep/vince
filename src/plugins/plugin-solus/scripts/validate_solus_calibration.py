#!/usr/bin/env python3
"""
Validate Solus assignment calibration: load resolved predictions from JSONL,
compute Brier score (mean squared error of predicted P(assign) vs outcome).
Use to audit the store or compare before/after more resolved data.

Usage:
  python validate_solus_calibration.py
  python validate_solus_calibration.py --data .elizadb/solus/solus-assignment-predictions.jsonl
  python validate_solus_calibration.py --data path/to/predictions.jsonl --window-days 30
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def load_jsonl(path: str) -> list[dict]:
    rows = []
    p = Path(path)
    if not p.exists():
        return rows
    with open(p, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compute Brier and count from Solus assignment predictions JSONL",
    )
    parser.add_argument(
        "--data",
        default=".elizadb/solus/solus-assignment-predictions.jsonl",
        help="Path to solus-assignment-predictions.jsonl",
    )
    parser.add_argument(
        "--window-days",
        type=int,
        default=0,
        help="If > 0, only include rows resolved in the last N days (by resolvedAt ms)",
    )
    parser.add_argument(
        "--by-asset",
        action="store_true",
        help="Print Brier and count per asset",
    )
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.is_absolute():
        data_path = Path.cwd() / data_path

    rows = load_jsonl(str(data_path))
    resolved = [
        r
        for r in rows
        if r.get("resolvedAt") is not None
        and r.get("outcome") in (0, 1)
    ]

    if args.window_days > 0:
        import time
        cutoff_ms = int((time.time() - args.window_days * 86400) * 1000)
        resolved = [r for r in resolved if (r.get("resolvedAt") or 0) >= cutoff_ms]

    if not resolved:
        print("No resolved rows found.", file=sys.stderr)
        print("Resolve predictions (e.g. 'we got assigned' / 'we didn't get assigned') to populate Brier.", file=sys.stderr)
        sys.exit(0)

    brier_sum = sum(
        (float(r.get("predictedAssignProb", 0.5)) - int(r["outcome"])) ** 2
        for r in resolved
    )
    mean_brier = brier_sum / len(resolved)
    print(f"Resolved count: {len(resolved)}")
    print(f"Mean Brier (last {'all' if args.window_days <= 0 else args.window_days + 'd'}): {mean_brier:.4f}")

    if args.by_asset:
        from collections import defaultdict
        by_asset: dict[str, list[dict]] = defaultdict(list)
        for r in resolved:
            by_asset[(r.get("asset") or "?").upper()].append(r)
        print("\nBy asset:")
        for asset in sorted(by_asset.keys()):
            sub = by_asset[asset]
            b = sum((float(r.get("predictedAssignProb", 0.5)) - int(r["outcome"])) ** 2 for r in sub) / len(sub)
            print(f"  {asset}: n={len(sub)}, Brier={b:.4f}")


if __name__ == "__main__":
    main()
