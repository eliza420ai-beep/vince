# Plugin-Vince Scripts

Python scripts for offline ML training used by the VINCE paper-trading ML pipeline (Layer 3: ONNX inference).

## Scripts

| Script | Purpose |
|--------|--------|
| `train_models.py` | Trains XGBoost models (signal quality, position sizing, TP optimizer) on feature-store data and exports to ONNX for `VinceMLInferenceService`. |
| `generate_synthetic_features.py` | Generates synthetic feature-store JSONL (same shape as real trades) so you can run `train_models.py` and test the ML pipeline before you have 90+ real trades. |
| `validate_ml_improvement.py` | **Proves** that ML-derived `suggested_tuning` (min strength/confidence) improves selectivity: loads feature-store data, computes 25th % of profitable trades, simulates applying those thresholds, and reports baseline vs filtered win rate. See [../ML_IMPROVEMENT_PROOF.md](../ML_IMPROVEMENT_PROOF.md). |

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

From **repo root**, with a venv that has the training deps:

```bash
# Run on the feature store directory (loads all features_*.jsonl)
python3 src/plugins/plugin-vince/scripts/train_models.py --data .elizadb/vince-paper-bot/features --output .elizadb/vince-paper-bot/models
```

From **plugin directory** (no need to remember repo-root paths):

```bash
cd src/plugins/plugin-vince
bun run train-models
```

This runs the same command from repo root (paths are resolved automatically). Requires Python 3 and `pip3 install -r scripts/requirements.txt`.

Ensure feature store has enough samples (script skips training if &lt; 90; default `--min-samples 90`).  
**"0 trades with outcomes"** means every record in the feature store was written when a trade was **opened**, but none have **outcome/labels** yet. Outcomes are written when trades **close**; the feature store now keeps open-trade records in memory until close, then flushes them with outcome/labels. So you need the paper bot to **close** at least 90 trades (TP/SL/max_age/manual) for training to see them.

To **reset the feature store** and start from a clean slate (e.g. after fixing outcome flushing):  
`rm -f .elizadb/vince-paper-bot/features/features_*.jsonl .elizadb/vince-paper-bot/features/combined.jsonl .elizadb/vince-paper-bot/features/synthetic_*.jsonl` (from repo root).

### Synthetic data (no real trades yet)

Generate enough synthetic records (same shape as feature store), then train. Default `--count 150` meets `--min-samples 90` and exercises all four models (signal quality, position sizing, TP optimizer, SL optimizer).

```bash
python3 src/plugins/plugin-vince/scripts/generate_synthetic_features.py --count 150 --output .elizadb/vince-paper-bot/features/synthetic_90plus.jsonl
python3 src/plugins/plugin-vince/scripts/train_models.py --data .elizadb/vince-paper-bot/features/synthetic_90plus.jsonl --output .elizadb/vince-paper-bot/models --min-samples 90
```

**Generate more synthetic data** (e.g. to stress-test training or get a larger dataset):
- Larger single file: `--count 400 --output .elizadb/vince-paper-bot/features/synthetic_400.jsonl`
- Append to existing file (timestamps continue after last record): `--count 200 --output features.jsonl --append`
- `train_models.py --data .elizadb/vince-paper-bot/features` loads all `synthetic_*.jsonl` and `features_*.jsonl` in that directory, so you can mix real and multiple synthetic files.

Optional: `--win-rate 0.55`, `--sentiment-fraction 0.2` (populates `signal_avg_sentiment` for some records), `--seed 123` (reproducibility).

### Real vs synthetic: when to use which

- **Synthetic data** is for pipeline testing and development (e.g. before you have 90+ real trades, or to stress-test with `--count 400`). Models trained only on synthetic data learn the generator’s distribution, not the market—do not rely on them for production.
- **Production:** Once you have enough real trades (e.g. 90+), train on real data. Use `--real-only` so the script loads only `features_*.jsonl` and `combined.jsonl` and excludes `synthetic_*.jsonl`:

```bash
python3 src/plugins/plugin-vince/scripts/train_models.py --data .elizadb/vince-paper-bot/features --output .elizadb/vince-paper-bot/models --real-only
```

Or from **repo root** with bun (extra args after `--` are passed to the Python script):

```bash
bun run train-models -- --real-only
```

- **Mixed runs** (default, no `--real-only`): The script loads both real and synthetic files from the directory. Use for dev or when you intentionally want to blend data; for production models, prefer `--real-only` when you have enough real samples.

## Testing that training improves paper trading parameters

To prove that `train_models.py` learns and improves paper trading algo parameters/weights:

```bash
# From repo root; requires deps from requirements.txt
pip3 install -r src/plugins/plugin-vince/scripts/requirements.txt
python3 src/plugins/plugin-vince/scripts/test_train_models.py
```

Or with pytest:

```bash
pytest src/plugins/plugin-vince/scripts/test_train_models.py -v
```

The test suite:

1. **test_training_produces_models_and_metadata** — Generates minimal synthetic feature JSONL, runs `train_models.py`, and asserts that metadata is written and at least one model is fit.
2. **test_generate_synthetic_then_train_produces_models** — Integration: runs `generate_synthetic_features.py` (150 records), then `train_models.py` with `--min-samples 90`, and asserts at least one model is fit (validates the two scripts together).
3. **test_learning_improves_over_baseline** — Asserts that the signal quality model has non-trivial feature importances, varying predictions, and AUC ≥ 0.5.
4. **test_insufficient_data_exits_gracefully** — Ensures that with too few samples, no models are trained.
5. **test_sl_optimizer_trains_when_label_present** — SL optimizer trains when `label_maxAdverseExcursion` is present.
6. **test_multi_asset_uses_asset_dummies** — Multi-asset data gets asset_* dummy columns.

## Reference

- [PARAMETER_IMPROVEMENT.md](./PARAMETER_IMPROVEMENT.md) – How training on JSONL helps identify which parameters/weights to improve (true north: bot gets better over time with ML).
- [FEEDBACK.md](./FEEDBACK.md) – Full review of `train_models.py` (strengths, issues, suggestions).
- Plugin [CLAUDE.md](../CLAUDE.md) – V4 ML architecture, feature store paths, ONNX usage.
