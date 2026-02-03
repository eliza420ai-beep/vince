# Plugin-Vince Scripts

Python scripts for offline ML training used by the VINCE paper-trading ML pipeline (Layer 3: ONNX inference).

## Scripts

| Script | Purpose |
|--------|--------|
| `train_models.py` | Trains XGBoost models (signal quality, position sizing, TP optimizer) on feature-store data and exports to ONNX for `VinceMLInferenceService`. |
| `generate_synthetic_features.py` | Generates synthetic feature-store JSONL (same shape as real trades) so you can run `train_models.py` and test the ML pipeline before you have 90+ real trades. |

**Input:** Path to a single JSONL file or to the feature directory (e.g. `.elizadb/vince-paper-bot/features`); the script loads all `features_*.jsonl` and `combined.jsonl` in that directory.  
**Output:** ONNX models, `training_metadata.json`, `improvement_report.md`, and optional joblib backups.

After each run, the script writes an **improvement report** so you can see which parameters and weights to improve. The report includes:
- **Decision drivers that influenced opens** – which data points (reasons/factors) led the bot to open each long or short; these are the same inputs that feed the ML models.
- **Suggested signal factors** – factors that are often predictive but missing or mostly null in your data (e.g. funding 8h delta, RSI, order book imbalance); consider adding them to the feature store.
- Feature importances per model, suggested signal-quality threshold, TP level performance (win rate/count), and action items.

The feature store records `decisionDrivers` (from the aggregator’s factors/reasons) when each trade is opened, so the JSONL and the improvement report can tie “what influenced this open” directly to train_models. See [PARAMETER_IMPROVEMENT.md](./PARAMETER_IMPROVEMENT.md) for the full flow. To get more factors per trade (so "WHY THIS TRADE" and ML see more data points), see [../SIGNAL_SOURCES.md](../SIGNAL_SOURCES.md).

## Training script TODO

Use this checklist to track improvements. Full rationale and detail are in [FEEDBACK.md](./FEEDBACK.md).

### Short-term (unblock production)

- [ ] **Load JSONL** – Feature store writes JSONL; script may assume single JSON. Use line-by-line read (e.g. `pd.read_json(..., lines=True)` or loop with `json.loads`) so training runs on real data.
- [ ] **SL Optimizer** – Either implement (quantile regression → ONNX, see FEEDBACK.md) or remove from docstring and CLAUDE.md “Layer 3” table so code and docs match.
- [ ] **Robust input** – Use safe access for nested keys (e.g. `r.get('market', {})`) so missing/malformed records don’t cause KeyErrors.
- [ ] **requirements.txt** – Add pinned deps (`xgboost`, `skl2onnx`, `onnxruntime`, `pandas`, etc.) for reproducible runs.
- [ ] **Logging** – Prefer `logging` over `print` for production runs.

### Medium-term (v2)

- [ ] Early stopping in XGBoost (`early_stopping_rounds` + `eval_set`).
- [ ] Optional hyperparameter tuning (e.g. GridSearchCV/Optuna) with `TimeSeriesSplit`.
- [ ] Validate ONNX after export (e.g. run a small batch with `onnxruntime`).
- [ ] Unit tests for load/prep (e.g. pytest with mocked JSONL).
- [ ] Optional: asset dummies or per-asset models if multi-asset; SHAP/feature selection.

## Running

From repo root (or plugin root), with a venv that has the training deps:

```bash
# Run on the feature store directory (loads all features_*.jsonl)
python src/plugins/plugin-vince/scripts/train_models.py --data .elizadb/vince-paper-bot/features --output .elizadb/vince-paper-bot/models
```

Ensure feature store has enough samples (script skips training if &lt; 90; default `--min-samples 90`). To test without real data, generate synthetic records then train:

```bash
python src/plugins/plugin-vince/scripts/generate_synthetic_features.py --count 120 --output .elizadb/vince-paper-bot/features/synthetic_90plus.jsonl
python src/plugins/plugin-vince/scripts/train_models.py --data .elizadb/vince-paper-bot/features/synthetic_90plus.jsonl --output .elizadb/vince-paper-bot/models --min-samples 90
```

## Testing that training improves paper trading parameters

To prove that `train_models.py` learns and improves paper trading algo parameters/weights:

```bash
# From repo root; requires deps from requirements.txt
pip install -r src/plugins/plugin-vince/scripts/requirements.txt
python3 src/plugins/plugin-vince/scripts/test_train_models.py
```

Or with pytest:

```bash
pytest src/plugins/plugin-vince/scripts/test_train_models.py -v
```

The test suite:

1. **test_training_produces_models_and_metadata** — Generates synthetic feature JSONL, runs `train_models.py`, and asserts that metadata is written and at least one model is fit (signal quality, position sizing, or TP optimizer).
2. **test_learning_improves_over_baseline** — Asserts that the signal quality model has non-trivial feature importances, varying predictions, and AUC ≥ 0.5.
3. **test_insufficient_data_exits_gracefully** — Ensures that with too few samples, no models are trained.

## Reference

- [PARAMETER_IMPROVEMENT.md](./PARAMETER_IMPROVEMENT.md) – How training on JSONL helps identify which parameters/weights to improve (true north: bot gets better over time with ML).
- [FEEDBACK.md](./FEEDBACK.md) – Full review of `train_models.py` (strengths, issues, suggestions).
- Plugin [CLAUDE.md](../CLAUDE.md) – V4 ML architecture, feature store paths, ONNX usage.
