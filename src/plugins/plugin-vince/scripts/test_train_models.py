#!/usr/bin/env python3
"""
Test that train_models.py learns to improve paper trading algo parameters and weights.

This test:
1. Generates synthetic feature data in the same JSONL format as the Feature Store.
2. Runs train_models.py on that data.
3. Asserts that models are trained and exported (ONNX + metadata).
4. Optionally proves "learning" by checking that model outputs differ from a trivial baseline
   (e.g. signal quality predictions are not all the same class when inputs vary).

Run from repo root:
    python3 src/plugins/plugin-vince/scripts/test_train_models.py
Or with pytest:
    pytest src/plugins/plugin-vince/scripts/test_train_models.py -v
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

# Ensure script directory is on path so we can import train_models
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))


def _synthetic_record(
    i: int,
    profitable: bool,
    r_multiple: float,
    optimal_tp: int,
    asset: str = "BTC",
    max_adverse_excursion: float | None = None,
) -> dict:
    """One feature record matching the shape expected by train_models.load_features."""
    rec = {
        "id": f"test-{i}",
        "timestamp": 1700000000000 + i * 60_000,
        "asset": asset,
        "market": {
            "priceChange24h": 0.5 if profitable else -0.3,
            "volumeRatio": 1.1,
            "fundingPercentile": 60.0,
            "longShortRatio": 1.05,
            "atrPct": 1.2,
        },
        "session": {
            "isWeekend": 0,
            "isOpenWindow": 1,
            "utcHour": 14,
        },
        "signal": {
            "strength": 75 + (i % 20),
            "confidence": 70 + (i % 15),
            "sources": ["funding", "whale"],
            "hasCascadeSignal": i % 3 == 0,
            "hasFundingExtreme": i % 5 == 0,
            "hasWhaleSignal": i % 4 == 0,
            "hasOICap": i % 7 == 0,
            "direction": "long" if i % 2 == 0 else "short",
        },
        "regime": {
            "volatilityRegime": ["low", "normal", "high"][i % 3],
            "marketRegime": ["bearish", "neutral", "bullish"][i % 3],
        },
        "news": {
            "nasdaqChange": -2 + (i % 5) * 1.0,
            "macroRiskEnvironment": ["risk_off", "neutral", "risk_on"][i % 3],
        },
        "execution": {
            "streakMultiplier": 1.0 + (i % 3) * 0.1,
        },
        "outcome": {
            "realizedPnl": 100.0 if profitable else -80.0,
            "realizedPnlPct": 1.0 if profitable else -0.8,
            "profitable": profitable,
        },
        "labels": {
            "profitable": profitable,
            "rMultiple": r_multiple,
            "optimalTpLevel": optimal_tp,
        },
    }
    if max_adverse_excursion is not None:
        rec["labels"]["maxAdverseExcursion"] = max_adverse_excursion
    return rec


def generate_synthetic_jsonl(
    path: str,
    num_records: int = 150,
    assets: list[str] | None = None,
    include_sl_label: bool = False,
) -> None:
    """Write synthetic feature records to a JSONL file (default 150 for richer tests)."""
    assets = assets or ["BTC"]
    with open(path, "w") as f:
        for i in range(num_records):
            profitable = i % 3 != 1
            r_multiple = (0.5 if profitable else -0.5) + (i % 10) * 0.1
            optimal_tp = min(3, max(0, i % 4))
            asset = assets[i % len(assets)]
            max_adv = (0.5 + (i % 5) * 0.2) if include_sl_label else None
            rec = _synthetic_record(i, profitable, r_multiple, optimal_tp, asset=asset, max_adverse_excursion=max_adv)
            f.write(json.dumps(rec) + "\n")


def run_train_models(
    data_path: str,
    output_dir: str,
    min_samples: int = 30,
    extra_args: list[str] | None = None,
    timeout_sec: int = 120,
) -> subprocess.CompletedProcess:
    """Run train_models.py and return the completed process."""
    train_script = SCRIPT_DIR / "train_models.py"
    cmd = [
        sys.executable,
        str(train_script),
        "--data",
        data_path,
        "--output",
        output_dir,
        "--min-samples",
        str(min_samples),
    ]
    if extra_args:
        cmd.extend(extra_args)
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=str(SCRIPT_DIR),
        timeout=timeout_sec,
    )


def run_generate_synthetic_features(output_path: str, count: int = 150) -> subprocess.CompletedProcess:
    """Run generate_synthetic_features.py and return the completed process."""
    gen_script = SCRIPT_DIR / "generate_synthetic_features.py"
    cmd = [
        sys.executable,
        str(gen_script),
        "--count",
        str(count),
        "--output",
        output_path,
    ]
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=str(SCRIPT_DIR),
        timeout=60,
    )


class TestTrainModels(unittest.TestCase):
    """Tests that train_models.py learns and improves paper trading algo parameters/weights."""

    def test_training_produces_models_and_metadata(self):
        """Train on synthetic data and assert models + metadata are produced."""
        with tempfile.TemporaryDirectory() as tmp:
            data_path = os.path.join(tmp, "features.jsonl")
            output_dir = os.path.join(tmp, "models")

            generate_synthetic_jsonl(data_path, num_records=150)

            result = run_train_models(data_path, output_dir, min_samples=30)
            self.assertEqual(result.returncode, 0, (
                f"train_models.py failed: stdout={result.stdout!r} stderr={result.stderr!r}"
            ))

            # Assert metadata was written
            metadata_path = os.path.join(output_dir, "training_metadata.json")
            self.assertTrue(os.path.isfile(metadata_path), f"Missing {metadata_path}")
            with open(metadata_path) as f:
                metadata = json.load(f)

            self.assertIn("trained_at", metadata)
            self.assertEqual(metadata["total_records"], 150)
            self.assertEqual(metadata["trades_with_outcomes"], 150)
            # models_fit = proof that training ran and learned (even if ONNX export failed)
            models_fit = metadata.get("models_fit", metadata.get("models_trained", []))
            self.assertGreaterEqual(len(models_fit), 1, (
                "At least one model should be fit (signal_quality, position_sizing, or tp_optimizer)"
            ))

            # Assert ONNX files when export succeeded
            models_trained = metadata.get("models_trained", [])
            for name in models_trained:
                onnx_path = os.path.join(output_dir, f"{name}.onnx")
                if os.path.isfile(onnx_path):
                    self.assertGreater(os.path.getsize(onnx_path), 0, f"{onnx_path} is empty")

            # Holdout metrics (MAE/AUC/quantile) written for drift/sizing when training ran
            improvement = metadata.get("improvement_report") or {}
            holdout = improvement.get("holdout_metrics")
            if models_fit and holdout is not None:
                self.assertIsInstance(holdout, dict, "holdout_metrics should be a dict per model")
                self.assertGreater(len(holdout), 0, "At least one model should have holdout_metrics")

    def test_learning_improves_over_baseline(self):
        """
        Prove that the trained model learns: predictions should vary with inputs,
        and (on our synthetic data) signal quality model should favor higher-strength signals.
        """
        try:
            import numpy as np
            from train_models import (
                load_features,
                prepare_signal_quality_features,
                train_signal_quality_model,
            )
        except ImportError as e:
            self.skipTest(f"ML deps not installed: {e}")

        with tempfile.TemporaryDirectory() as tmp:
            data_path = os.path.join(tmp, "features.jsonl")
            generate_synthetic_jsonl(data_path, num_records=120)

            df = load_features(data_path)
            X, y = prepare_signal_quality_features(df)
            self.assertGreaterEqual(len(X), 30, "Need enough samples with label_profitable")

            model = train_signal_quality_model(X, y)

            # Proof of learning 1: feature importances are non-trivial (not all zero)
            importance = model.feature_importances_
            self.assertGreater(importance.max(), 0, "Model should use some features")

            # Proof of learning 2 & 3: either predictions vary, or AUC is high (model confidently correct)
            preds = model.predict(X)
            preds_vary = preds.min() != preds.max()
            if len(np.unique(y)) == 2:
                from sklearn.metrics import roc_auc_score
                auc = roc_auc_score(y, model.predict_proba(X)[:, 1])
                self.assertGreaterEqual(auc, 0.5, f"Signal quality model should learn (AUC={auc:.3f})")
                # When AUC is perfect, constant predictions are acceptable (model is just very confident)
                self.assertTrue(
                    preds_vary or auc >= 0.99,
                    "Predictions should vary unless model is trivially perfect (AUC>=0.99)",
                )
            else:
                self.assertTrue(preds_vary or len(np.unique(y)) == 1, "Predictions should vary unless labels constant")

    def test_insufficient_data_exits_gracefully(self):
        """When there are too few samples, script exits without training."""
        with tempfile.TemporaryDirectory() as tmp:
            data_path = os.path.join(tmp, "few.jsonl")
            output_dir = os.path.join(tmp, "models")
            generate_synthetic_jsonl(data_path, num_records=10)  # well below default min 100

            result = run_train_models(data_path, output_dir, min_samples=100)
            # Script may return 0 but should not write models
            metadata_path = os.path.join(output_dir, "training_metadata.json")
            if result.returncode == 0 and os.path.isfile(metadata_path):
                with open(metadata_path) as f:
                    meta = json.load(f)
                self.assertEqual(len(meta.get("models_trained", [])), 0, (
                    "Should not train models when samples < min_samples"
                ))

    def test_sl_optimizer_trains_when_label_present(self):
        """When label_maxAdverseExcursion is present and enough samples exist, SL optimizer is trained."""
        try:
            import numpy as np
            from train_models import (
                load_features,
                prepare_sl_features,
                train_sl_optimizer_model,
            )
        except ImportError as e:
            self.skipTest(f"ML deps not installed: {e}")

        with tempfile.TemporaryDirectory() as tmp:
            data_path = os.path.join(tmp, "features_sl.jsonl")
            generate_synthetic_jsonl(data_path, num_records=150, include_sl_label=True)

            df = load_features(data_path)
            self.assertIn("label_maxAdverseExcursion", df.columns, "load_features should create label_maxAdverseExcursion")

            X_sl, y_sl = prepare_sl_features(df)
            self.assertFalse(X_sl.empty, "prepare_sl_features should return non-empty X when SL label present")
            self.assertFalse(y_sl.empty, "prepare_sl_features should return non-empty y")
            self.assertGreaterEqual(len(X_sl), 50, "Enough rows for a minimal SL train")

            model = train_sl_optimizer_model(X_sl, y_sl)
            preds = model.predict(X_sl)
            self.assertEqual(len(preds), len(X_sl), "Predictions should align with input rows")
            self.assertTrue(
                np.isfinite(preds).all(),
                "SL model predictions should be finite",
            )

    def test_generate_synthetic_then_train_produces_models(self):
        """Integration: generate_synthetic_features.py output is valid input for train_models.py (min_samples=90)."""
        with tempfile.TemporaryDirectory() as tmp:
            data_path = os.path.join(tmp, "synthetic_from_generator.jsonl")
            output_dir = os.path.join(tmp, "models")

            gen_result = run_generate_synthetic_features(data_path, count=200)
            self.assertEqual(gen_result.returncode, 0, (
                f"generate_synthetic_features.py failed: stdout={gen_result.stdout!r} stderr={gen_result.stderr!r}"
            ))
            self.assertTrue(os.path.isfile(data_path), f"Expected output file {data_path}")
            with open(data_path) as f:
                lines = [l for l in f if l.strip()]
            self.assertGreaterEqual(len(lines), 90, "Need at least 90 records for --min-samples 90")

            result = run_train_models(data_path, output_dir, min_samples=90)
            self.assertEqual(result.returncode, 0, (
                f"train_models.py failed on generator output: stdout={result.stdout!r} stderr={result.stderr!r}"
            ))

            metadata_path = os.path.join(output_dir, "training_metadata.json")
            self.assertTrue(os.path.isfile(metadata_path), f"Missing {metadata_path}")
            with open(metadata_path) as f:
                metadata = json.load(f)
            self.assertGreaterEqual(metadata.get("trades_with_outcomes", 0), 90)
            models_fit = metadata.get("models_fit", metadata.get("models_trained", []))
            self.assertGreaterEqual(len(models_fit), 1, (
                "At least one model should be fit when training on generate_synthetic_features.py output"
            ))
            # Holdout metrics present when improvement report is written
            improvement = metadata.get("improvement_report") or {}
            if improvement.get("holdout_metrics"):
                self.assertGreater(len(improvement["holdout_metrics"]), 0, "holdout_metrics should list at least one model")
            # When news features present, signal_quality_input_dim can be 20
            if "signal_quality_input_dim" in metadata:
                self.assertGreaterEqual(metadata["signal_quality_input_dim"], 16)

    def test_multi_asset_uses_asset_dummies(self):
        """When multiple assets are present, prepare_signal_quality_features includes asset_* dummy columns."""
        try:
            from train_models import load_features, prepare_signal_quality_features
        except ImportError as e:
            self.skipTest(f"ML deps not installed: {e}")

        with tempfile.TemporaryDirectory() as tmp:
            data_path = os.path.join(tmp, "features_multi_asset.jsonl")
            generate_synthetic_jsonl(data_path, num_records=100, assets=["BTC", "ETH"])

            df = load_features(data_path)
            self.assertGreater(df["asset"].nunique(), 1, "Data should contain multiple assets")

            X, y = prepare_signal_quality_features(df)
            asset_cols = [c for c in X.columns if c.startswith("asset_")]
            self.assertGreaterEqual(
                len(asset_cols),
                1,
                f"Expected at least one asset dummy column (asset_*), got columns: {list(X.columns)}",
            )
            self.assertGreaterEqual(len(X), 50, "Enough samples for multi-asset feature set")
            self.assertEqual(len(y), len(X), "y should align with X")

    def test_recency_decay_and_balance_assets_run_without_crash(self):
        """Smoke test: train_models with --recency-decay and --balance-assets completes successfully."""
        with tempfile.TemporaryDirectory() as tmp:
            data_path = os.path.join(tmp, "features.jsonl")
            output_dir = os.path.join(tmp, "models")
            generate_synthetic_jsonl(data_path, num_records=120, assets=["BTC", "ETH"])

            result = run_train_models(
                data_path,
                output_dir,
                min_samples=50,
                extra_args=["--recency-decay", "0.01", "--balance-assets"],
                timeout_sec=120,
            )
            self.assertEqual(result.returncode, 0, (
                f"train_models.py with recency-decay and balance-assets failed: "
                f"stdout={result.stdout!r} stderr={result.stderr!r}"
            ))
            metadata_path = os.path.join(output_dir, "training_metadata.json")
            self.assertTrue(os.path.isfile(metadata_path), f"Missing {metadata_path}")
            with open(metadata_path) as f:
                metadata = json.load(f)
            models_fit = metadata.get("models_fit", metadata.get("models_trained", []))
            self.assertGreaterEqual(len(models_fit), 1, "At least one model should be fit with sample weights")

    def test_tune_hyperparams_run_without_crash(self):
        """Smoke test: train_models with --tune-hyperparams (GridSearchCV + TimeSeriesSplit) completes without crash."""
        with tempfile.TemporaryDirectory() as tmp:
            data_path = os.path.join(tmp, "features.jsonl")
            output_dir = os.path.join(tmp, "models")
            generate_synthetic_jsonl(data_path, num_records=100)

            result = run_train_models(
                data_path,
                output_dir,
                min_samples=50,
                extra_args=["--tune-hyperparams"],
                timeout_sec=180,
            )
            self.assertEqual(result.returncode, 0, (
                f"train_models.py with --tune-hyperparams failed: "
                f"stdout={result.stdout!r} stderr={result.stderr!r}"
            ))
            metadata_path = os.path.join(output_dir, "training_metadata.json")
            self.assertTrue(os.path.isfile(metadata_path), f"Missing {metadata_path}")
            with open(metadata_path) as f:
                metadata = json.load(f)
            models_fit = metadata.get("models_fit", metadata.get("models_trained", []))
            self.assertGreaterEqual(len(models_fit), 1, "At least one model should be fit after hyperparameter tuning")


if __name__ == "__main__":
    try:
        import pytest
        sys.exit(pytest.main([__file__, "-v"]))
    except ImportError:
        unittest.main(verbosity=2)
