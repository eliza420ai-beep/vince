# Solus ML Feature Store

Where assignment-prediction data for ML training lives and how the training script uses it.

**When to read:** Running the Solus calibration training script, adding features to the ONNX model, or wiring TRAIN_SOLUS_CALIBRATION_WHEN_READY.

---

## Storage

| Storage   | Path                                                                                         | Purpose                                                   |
| --------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **JSONL** | `.elizadb/solus/solus-assignment-predictions.jsonl` (or `SOLUS_ASSIGNMENT_PREDICTIONS_PATH`) | One row per prediction; resolved rows = training samples. |

---

## Schema (per row)

| Field                 | Type    | Description                                            |
| --------------------- | ------- | ------------------------------------------------------ |
| `asset`               | string  | BTC, ETH, SOL, HYPE.                                   |
| `strike`              | number  | Strike price (USD).                                    |
| `expiryUtc`           | string  | ISO expiry (e.g. next Friday 08:00 UTC).               |
| `predictedAssignProb` | number  | Predicted P(assigned), 0–1.                            |
| `createdAt`           | number  | Unix ms when prediction was recorded.                  |
| `resolvedAt`          | number? | Unix ms when outcome was set; required for training.   |
| `outcome`             | 0 \| 1? | 1 = assigned, 0 = not assigned; required for training. |
| `spotAtRecord`        | number? | Spot at record time; used for moneyness.               |
| `atmIvAtRecord`       | number? | ATM IV % at record time; used for IV features.         |

**For ML we use only resolved rows:** `resolvedAt` and `outcome` present, `outcome` in {0, 1}.

---

## Derived features (at train time, in Python)

The training script builds these from the stored fields; they are not stored in the JSONL.

| Derived feature | Rule                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| **T_years**     | Time to expiry at record: `(parse(expiryUtc) - createdAt) / (365.25 * 24 * 60 * 60 * 1000)`.                |
| **moneyness**   | `spotAtRecord / strike` when spot and strike > 0; else 1.                                                   |
| **iv_bucket**   | From `atmIvAtRecord`: &lt;50 → 0, 50–60 → 1, &gt;60 → 2 (or one-hot); missing → sentinel (e.g. -1 or mode). |
| **asset\_\***   | Asset one-hot or label-encoded (e.g. asset_BTC, asset_ETH, …).                                              |

Feature order and names are written to `solus_training_metadata.json` as `assignment_calibrator_feature_names` so the inference service builds the same vector at runtime.

---

## Training script

- **Script:** `scripts/train_solus_calibration.py`
- **Input:** Path to the JSONL (default: `.elizadb/solus/solus-assignment-predictions.jsonl`).
- **Output:** `assignment_calibrator.onnx` and `solus_training_metadata.json` in the Solus models dir (default: `.elizadb/solus/models/` or `SOLUS_ML_MODELS_DIR`).
- **Min samples:** Use `--min-samples 50` (or 30); script exits with a clear message if resolved count is below.

See [README.md](README.md) § Solus ML / ONNX for run commands and env.
