#!/usr/bin/env python3
"""
Prove that ML-derived suggested_tuning (min strength / min confidence) improves selectivity.

Uses the same feature-store JSONL and logic as train_models.py:
- suggested_tuning = 25th percentile of profitable trades' strength and confidence
- Simulates "what if we had used these thresholds from the start"
- Reports: baseline win rate vs filtered win rate; % of skipped trades that were losers

Run from repo root:
  python3 src/plugins/plugin-vince/scripts/validate_ml_improvement.py --data .elizadb/vince-paper-bot/features

Or with synthetic:
  python3 src/plugins/plugin-vince/scripts/validate_ml_improvement.py --data synthetic_features.jsonl
"""

import argparse
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

try:
    import numpy as np
    import pandas as pd
except ImportError:
    print("Need pandas (and numpy). pip install pandas numpy", file=sys.stderr)
    sys.exit(1)

# Reuse train_models loader
try:
    from train_models import load_features
except ImportError:
    print("Could not import train_models.load_features. Run from repo root or ensure train_models.py is on path.", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate that ML suggested_tuning improves win rate on historical data")
    parser.add_argument("--data", type=str, default=".elizadb/vince-paper-bot/features",
                        help="Path to feature store JSONL file or directory")
    parser.add_argument("--quantile", type=float, default=0.25,
                        help="Quantile of profitable trades for suggested thresholds (default 0.25)")
    parser.add_argument("--min-profitable", type=int, default=20,
                        help="Minimum profitable trades to compute suggested_tuning (default 20)")
    args = parser.parse_args()

    df = load_features(args.data)
    if df.empty:
        print("No data loaded. Exiting.")
        return

    # Need outcomes and signal fields
    if "label_profitable" not in df.columns:
        print("No label_profitable column. Need feature store data with outcomes.")
        return

    df_trades = df[df["label_profitable"].notna()].copy()
    n_all = len(df_trades)
    if n_all == 0:
        print("No trades with outcomes.")
        return

    # Flattened names from load_features
    str_col = "signal_strength"
    conf_col = "signal_confidence"
    if str_col not in df_trades.columns or conf_col not in df_trades.columns:
        print("Missing signal_strength or signal_confidence. Cannot compute suggested_tuning.")
        return

    df_trades["profitable"] = df_trades["label_profitable"].astype(bool)
    wins = df_trades["profitable"].sum()
    baseline_win_rate = wins / n_all

    # Optional: show holdout metrics from last training run if available
    data_path = Path(args.data).resolve()
    candidates = [
        data_path.parent / "models" / "training_metadata.json",   # e.g. .../features -> .../models
        data_path.parent.parent / "models" / "training_metadata.json",
        SCRIPT_DIR.parent / ".elizadb" / "vince-paper-bot" / "models" / "training_metadata.json",
    ]
    meta_path = None
    for c in candidates:
        try:
            if c.resolve().is_file():
                meta_path = c.resolve()
                break
        except (OSError, RuntimeError):
            continue
    if meta_path and meta_path.is_file():
        try:
            with open(meta_path) as f:
                meta = json.load(f)
            holdout = (meta.get("improvement_report") or {}).get("holdout_metrics")
            if holdout:
                print("Holdout metrics (from last training run, for drift/sizing context):")
                for model_name, metrics in holdout.items():
                    print(f"  {model_name}: " + ", ".join(f"{k}={v:.4f}" for k, v in (metrics or {}).items()))
                print()
        except (json.JSONDecodeError, OSError):
            pass

    # Baseline metrics
    print("=" * 60)
    print("ML PARAMETER IMPROVEMENT VALIDATION")
    print("=" * 60)
    print(f"Total trades with outcome: {n_all}")
    print(f"Baseline win rate (all trades): {baseline_win_rate:.1%} ({wins} wins)")
    print()

    # Suggested tuning: same logic as train_models.py improvement report
    prof = df_trades[df_trades["profitable"]]
    if len(prof) < args.min_profitable:
        print(f"Not enough profitable trades ({len(prof)} < {args.min_profitable}) to compute suggested_tuning.")
        print("Collect more data and re-run.")
        return

    q_str = prof[str_col].quantile(args.quantile)
    q_conf = prof[conf_col].quantile(args.quantile)
    min_str = int(max(0, min(100, round(float(q_str)))))
    min_conf = int(max(0, min(100, round(float(q_conf)))))

    print(f"Suggested tuning (Q{args.quantile} of profitable trades): min_strength={min_str}, min_confidence={min_conf}")
    print()

    # Simulate: keep only trades that pass these thresholds
    mask = (df_trades[str_col] >= min_str) & (df_trades[conf_col] >= min_conf)
    filtered = df_trades[mask]
    skipped = df_trades[~mask]

    n_filtered = len(filtered)
    n_skipped = len(skipped)
    wins_filtered = filtered["profitable"].sum()
    wins_skipped = skipped["profitable"].sum()
    filtered_win_rate = wins_filtered / n_filtered if n_filtered else 0.0
    skipped_win_rate = wins_skipped / n_skipped if n_skipped else 0.0
    pct_skipped_losers = (1 - skipped_win_rate) * 100 if n_skipped else 0

    print("If we had used suggested_tuning from the start:")
    print(f"  Trades taken:    {n_filtered}  (win rate {filtered_win_rate:.1%})")
    print(f"  Trades skipped:  {n_skipped}  (of skipped, {pct_skipped_losers:.0f}% were losers)")
    print()

    # Proof statement
    improvement = filtered_win_rate - baseline_win_rate
    if n_filtered > 0 and improvement > 0:
        print("PROOF: Applying ML-derived thresholds would have IMPROVED win rate by {:.1%}.".format(improvement))
        if pct_skipped_losers > 50:
            print("       Skipped trades were mostly losers ({:.0f}% losers vs {:.0f}% in full set).".format(
                pct_skipped_losers, (1 - baseline_win_rate) * 100))
        else:
            print("       Fewer trades, higher bar: filtered set has better win rate than baseline.")
    elif n_filtered > 0 and improvement <= 0:
        print("RESULT: On this dataset, suggested_tuning did not improve win rate (filtered {:.1%} vs baseline {:.1%}).".format(
            filtered_win_rate, baseline_win_rate))
        print("       This can happen with small samples or when profitable trades are not clearly stronger/higher-confidence.")
    else:
        print("RESULT: No trades would pass the suggested thresholds; thresholds may be too strict for this data.")

    print()
    print("Conclusion: The ML logic CAN adjust parameters (min_strength, min_confidence) from data;")
    print("            improvement on live data depends on regime and data quality. Re-run after more trades.")
    print("=" * 60)


if __name__ == "__main__":
    main()
