#!/usr/bin/env python3
"""
Solus assignment calibrator: train on resolved assignment predictions, export ONNX.

Reads .elizadb/solus/solus-assignment-predictions.jsonl (or --data path), keeps only
resolved rows (resolvedAt and outcome in {0,1}), builds features, trains a binary
classifier (XGBoost) for P(assigned), exports assignment_calibrator.onnx and
solus_training_metadata.json to the Solus models dir.

Usage:
  python train_solus_calibration.py
  python train_solus_calibration.py --data .elizadb/solus/solus-assignment-predictions.jsonl --output .elizadb/solus/models --min-samples 50

Features (fixed order for inference):
  asset_BTC, asset_ETH, asset_SOL, asset_HYPE, strike_norm, moneyness, atm_iv, T_years, predicted_assign_prob
- strike_norm = strike / 100_000 (BTC scale)
- moneyness = spot / strike when spot and strike > 0 else 1.0
- atm_iv = atmIvAtRecord / 100 (0-1), missing → 0.5
- T_years = (expiry_ts - createdAt) / (365.25 * 24 * 3600 * 1000) in years
- predicted_assign_prob = predictedAssignProb (0-1)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from pathlib import Path

import numpy as np
import pandas as pd

try:
    import xgboost as xgb
    import onnx
    from onnxmltools.convert.xgboost import convert as convert_xgboost
    from onnxmltools.convert.common.data_types import FloatTensorType
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    convert_xgboost = None
    FloatTensorType = None

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

ASSET_COLUMNS = ["asset_BTC", "asset_ETH", "asset_SOL", "asset_HYPE"]
FEATURE_ORDER = [
    "asset_BTC", "asset_ETH", "asset_SOL", "asset_HYPE",
    "strike_norm", "moneyness", "atm_iv", "T_years", "predicted_assign_prob",
]


def load_jsonl(path: str) -> list[dict]:
    """Load JSONL; return list of dicts."""
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


def parse_expiry_ms(expiry_utc: str) -> int | None:
    """Parse ISO expiry string to ms since epoch."""
    if not expiry_utc:
        return None
    try:
        from datetime import datetime
        # Accept both with and without Z
        s = expiry_utc.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        return int(dt.timestamp() * 1000)
    except Exception:
        return None


def build_features(rows: list[dict]) -> tuple[pd.DataFrame, pd.Series]:
    """Build feature matrix and target from resolved rows."""
    data = []
    for r in rows:
        if r.get("resolvedAt") is None or r.get("outcome") not in (0, 1):
            continue
        asset = (r.get("asset") or "BTC").upper()
        strike = float(r.get("strike", 0))
        spot = r.get("spotAtRecord")
        if spot is not None:
            spot = float(spot)
        atm_iv = r.get("atmIvAtRecord")
        if atm_iv is not None:
            atm_iv = float(atm_iv) / 100.0
        else:
            atm_iv = 0.5
        created = int(r.get("createdAt", 0))
        expiry_utc = r.get("expiryUtc", "")
        expiry_ms = parse_expiry_ms(expiry_utc)
        if expiry_ms is not None and created > 0:
            T_years = max(0.0, (expiry_ms - created) / (365.25 * 24 * 3600 * 1000))
        else:
            T_years = 7.0 / 365.0  # default ~1 week
        strike_norm = strike / 100_000.0 if strike > 0 else 0.0
        if spot is not None and strike > 0 and spot > 0:
            moneyness = spot / strike
        else:
            moneyness = 1.0
        pred_prob = float(r.get("predictedAssignProb", 0.5))
        pred_prob = max(0.0, min(1.0, pred_prob))

        row = {
            "asset_BTC": 1 if asset == "BTC" else 0,
            "asset_ETH": 1 if asset == "ETH" else 0,
            "asset_SOL": 1 if asset == "SOL" else 0,
            "asset_HYPE": 1 if asset == "HYPE" else 0,
            "strike_norm": strike_norm,
            "moneyness": moneyness,
            "atm_iv": atm_iv,
            "T_years": T_years,
            "predicted_assign_prob": pred_prob,
            "outcome": int(r["outcome"]),
        }
        data.append(row)

    if not data:
        return pd.DataFrame(), pd.Series(dtype=float)

    df = pd.DataFrame(data)
    y = df["outcome"]
    X = df[FEATURE_ORDER]
    return X, y


def _onnx_rename_io(onnx_model, input_name: str = "input", output_name: str = "output") -> None:
    """Rename graph input/output to input/output for onnxruntime-node."""
    g = onnx_model.graph
    if g.input:
        old_in = g.input[0].name
        if old_in != input_name:
            for node in g.node:
                for i, name in enumerate(node.input):
                    if name == old_in:
                        node.input[i] = input_name
            g.input[0].name = input_name
    if g.output:
        old_out = g.output[0].name
        if old_out != output_name:
            for node in g.node:
                for i, name in enumerate(node.output):
                    if name == old_out:
                        node.output[i] = output_name
            g.output[0].name = output_name


def export_to_onnx(model: xgb.XGBClassifier, X_sample: pd.DataFrame, output_path: str) -> bool:
    """Export XGBoost classifier to ONNX; I/O named input/output."""
    if not ONNX_AVAILABLE or convert_xgboost is None or FloatTensorType is None:
        logger.warning("ONNX export skipped (install onnx onnxmltools)")
        return False
    try:
        n_features = X_sample.shape[1]
        booster = model.get_booster()
        original_names = list(booster.feature_names) if booster.feature_names else []
        try:
            booster.feature_names = [f"f{i}" for i in range(n_features)]
            initial_types = [("input", FloatTensorType([None, n_features]))]
            onnx_model = convert_xgboost(model, initial_types=initial_types, target_opset=12)
            _onnx_rename_io(onnx_model, input_name="input", output_name="output")
            onnx.save_model(onnx_model, output_path)
            logger.info("Exported assignment_calibrator to %s", output_path)
            return True
        finally:
            if original_names:
                booster.feature_names = original_names
    except Exception as e:
        logger.warning("Failed to export ONNX: %s", e)
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Solus assignment calibrator (XGBoost → ONNX)")
    parser.add_argument(
        "--data",
        default=".elizadb/solus/solus-assignment-predictions.jsonl",
        help="Path to Solus assignment predictions JSONL",
    )
    parser.add_argument(
        "--output",
        default=".elizadb/solus/models",
        help="Output directory for ONNX and metadata",
    )
    parser.add_argument(
        "--min-samples",
        type=int,
        default=50,
        help="Minimum resolved rows to train (default 50)",
    )
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.is_absolute():
        data_path = Path.cwd() / data_path
    out_dir = Path(args.output)
    if not out_dir.is_absolute():
        out_dir = Path.cwd() / out_dir

    rows = load_jsonl(str(data_path))
    resolved = [r for r in rows if r.get("resolvedAt") is not None and r.get("outcome") in (0, 1)]
    logger.info("Loaded %d rows, %d resolved", len(rows), len(resolved))

    if len(resolved) < args.min_samples:
        logger.warning(
            "Need at least %d resolved rows for training (have %d). Resolve more predictions and re-run.",
            args.min_samples,
            len(resolved),
        )
        return

    X, y = build_features(resolved)
    if X.empty or len(X) < args.min_samples:
        logger.warning("Not enough valid samples after feature build")
        return

    from sklearn.model_selection import train_test_split
    X_tr, X_val, y_tr, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scale_pos = (y_tr == 0).sum() / max(1, (y_tr == 1).sum())
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        objective="binary:logistic",
        eval_metric="auc",
        random_state=42,
        scale_pos_weight=scale_pos,
    )
    model.fit(
        X_tr, y_tr,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    out_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = out_dir / "assignment_calibrator.onnx"
    export_ok = export_to_onnx(model, X.iloc[:1], str(onnx_path))

    metadata = {
        "assignment_calibrator_feature_names": FEATURE_ORDER,
        "assignment_calibrator_input_dim": len(FEATURE_ORDER),
        "n_resolved_train": len(resolved),
    }
    meta_path = out_dir / "solus_training_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info("Wrote %s", meta_path)

    if not export_ok:
        logger.warning("ONNX export failed; metadata written. Install: pip install onnx onnxmltools")


if __name__ == "__main__":
    main()
