# Training script review: train_models.py

**Status (2026-02-16):** All short-term and medium-term items addressed. Script loads JSONL (line-by-line), implements all four models including SL Optimizer (quantile regression for max adverse excursion), uses robust key access (`r.get('market', {})` etc.), has `requirements.txt`, and uses the `logging` module. Early stopping and asset dummies are in place. TP/SL now use the same optional news/signal features as signal quality and position sizing. Latest refactor (2026-02-16) added: DRY feature prep helpers, removed train/serve StandardScaler skew, fixed holdout data leakage, fixed walk-forward fold ordering, Optuna + walk-forward + SHAP for all 4 models, feature name manifests, ONNX SHA-256 hashing, parallel training mode, and lag feature engineering. See repo root [scripts/README.md](../../../../scripts/README.md) for the correct run command.

## Quick checklist

| Priority    | Item                                               | Status                                                                                                |
| ----------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Short-term  | Load JSONL (feature store format)                  | Done — `load_features()` reads JSONL, supports dir of `features_*.jsonl` / `synthetic_*.jsonl`        |
| Short-term  | SL Optimizer in docs/code                          | Done — implemented; docstring lists all four models                                                   |
| Short-term  | Robust key access                                  | Done — `r.get('market', {})`, etc.                                                                    |
| Short-term  | requirements.txt; logging                          | Done — `scripts/requirements.txt`; `logging` module with file handler                                 |
| Medium-term | Early stopping                                     | Done — XGBoost `early_stopping_rounds` with time-based holdout                                        |
| Medium-term | Asset/feature enhancements                         | Done — asset dummies when multi-asset; OPTIONAL_FEATURE_COLUMNS; TP/SL use news + signal features     |
| Medium-term | Hyperparameter tuning; ONNX validation; unit tests | Done — Optuna (all 4 models) with GridSearchCV fallback; onnxruntime smoke test; test_train_models.py |
| Medium-term | SHAP / feature explanation                         | Done — `_shap_analysis()` for all 4 models; SHAP importance + top interactions in improvement report  |
| Medium-term | Walk-forward validation                            | Done — `_walk_forward_validation()` with expanding window + purge gap for all 4 models                |
| Medium-term | Lag features                                       | Done — `add_lag_features()` creates lag1/2/3 + rolling mean for key market columns per asset          |
| Correctness | Remove StandardScaler (train/serve skew)           | Done — XGBoost is tree-based; scaler was never saved for ONNX inference                               |
| Correctness | Fix holdout data leakage                           | Done — `_holdout_metrics()` now trains a fresh model on train split only                              |
| Correctness | Fix walk-forward fold order                        | Done — folds advance forward in time (expanding window)                                               |
| Correctness | Fix `_clip_outliers` in-place mutation             | Done — returns a copy to prevent cross-model contamination                                            |
| Ops         | Feature name manifest                              | Done — `{model}_features.json` saved alongside ONNX; maps f0/f1/... to column names                   |
| Ops         | ONNX SHA-256 hash                                  | Done — stored in `training_metadata.json` for model versioning                                        |
| Ops         | Parallel training                                  | Done — `--parallel` flag; `ProcessPoolExecutor` for concurrent model training                         |
| Ops         | DRY feature prep                                   | Done — `_add_common_features()` + `_finalize_features()` shared helpers                               |

---

## Overview

This script is a solid foundation for training ML models to optimize a trading bot (VINCE, apparently part of ElizaOS) using historical paper trade data from Hyperliquid (a crypto perpetuals exchange). It focuses on post-trade analysis to predict signal quality, suggest position sizes, and optimize take-profit (TP) levels based on features like market conditions, signal strength, session timing, and regimes. The use of XGBoost is appropriate for tabular data with mixed feature types, and exporting to ONNX is smart for efficient inference in a production setup (e.g., low-latency predictions in a bot).The script assumes input data in a JSON format (not JSONL as mentioned in your query—might be a minor mismatch; JSONL would require line-by-line reading with json.loads in a loop). It flattens nested trade records into a Pandas DataFrame, engineers features, trains models with time-series-aware cross-validation (good for avoiding lookahead bias in trading data), and skips training if fewer than 100 samples are available. Overall, it's well-structured, modular, and trading-specific, but there's room for improvements in completeness, robustness, and advanced techniques.StrengthsTrading-Relevant Modeling: Signal Quality Predictor (binary classification): Predicts if a signal leads to a profitable trade. Features like signal strength, source count, funding extremes, and market regimes make sense for sentiment-based indicators in crypto perps.
Position Sizing Model (regression): Uses R-multiple (risk-reward ratio) as a target to suggest size multipliers. Clipping outliers (-2 to 3) prevents extreme values from skewing training.
TP Optimizer (multi-class classification): Classifies optimal TP levels (0-3, assuming discrete buckets like 1x, 2x, 3x ATR). Incorporating volatility and market regime is clever for adaptive exits.

Time-Series Handling: TimeSeriesSplit for CV is crucial in trading to simulate walk-forward optimization and prevent data leakage.
Feature Engineering: Pragmatic flattening of nested JSON, handling of categoricals (e.g., regime mapping to numerics), and fallback to available columns. Normalization is applied, which isn't strictly needed for tree-based models like XGBoost but can stabilize training.
Efficiency and Deployment: ONNX export ensures compatibility with various runtimes (e.g., ONNX Runtime for fast inference). The metadata JSON is useful for tracking.
Thresholds and Safeguards: Min samples check prevents overfitting on tiny datasets. Positive rate and distribution prints help diagnose data quality.

**Potential Issues and Bugs (addressed where noted)**

- **SL Optimizer:** Implemented — `prepare_sl_features`, `train_sl_optimizer_model` (quantile regression, `reg:quantileerror`), and ONNX export. Target: `label_maxAdverseExcursion` (clipped 0–5).
- **Data assumptions:** Robust key access — `r.get('market', {})`, `r.get('signal', {})`, etc. Missing keys yield NaNs or safe defaults; invalid lines skipped.
- **JSONL:** Input is JSONL (one JSON object per line). Script reads line-by-line with `json.loads`; supports a directory of `features_*.jsonl` / `synthetic_*.jsonl` / `combined.jsonl`.
- **Asset-specific:** Asset dummies used when `df["asset"].nunique() > 1` in all four prepare\_\* functions.

**Feature gaps (partial):** Signal source count and avg sentiment from `signal.sources` are extracted; news dict flattened to `news_*` columns. Optional columns (OI cap, funding extreme, NASDAQ, macro risk, ETF flow) used when present. Top features logged and fed into improvement report for weight tuning (improvementReportWeights.ts). Asset encoded as dummies when multi-asset.

Model-Specific: Signal quality uses AUC and scale_pos_weight for class imbalance. Position sizing: MAE; R-multiple clipped -2 to 3. TP optimizer: num_class from data; class distribution logged. SL: quantile regression (quantile_alpha=0.95). Hyperparams: n_estimators=200, max_depth=4; early stopping on time-based holdout. GridSearch/Optuna not added (optional). ONNX: uses onnxmltools (not skl2onnx); booster feature names set to f0, f1, … for converter. requirements.txt present; tree_method='hist' (GPU optional via tree_method='gpu_hist'). Error handling: main pipeline in try/except per model; minimal report written when &lt; min_samples.

**Suggestions (status)**

- SL Optimizer: Done. Outlier clipping (z-score) in `_clip_outliers` (optional, scipy). Sentiment from sources: `signal_avg_sentiment`, `news_*` columns. Session: `session_utcHour`, `session_isOpenWindow`, `session_isWeekend`.
- Early stopping: Done (XGBoost `early_stopping_rounds` with time-based holdout).
- Logging: Done (`logging` module, file handler to `train.log`).
- Unit tests: `test_train_models.py` (6 tests).
- Optional backlog: GridSearch/Optuna, ensemble (signal quality prob → sizing), backtest integration, SMOTE/synthetic augmentation.

Scalability: If datasets grow large, switch to Dask for DF ops or XGBoost's distributed training.
Ethical/Practical Notes: Since this is for Hyperliquid (crypto perps), models could amplify losses in volatile markets—emphasize paper trading validation. Also, sentiment indicators can be noisy; backtest against baselines like random sizing.

---

## Further improvement suggestions

Prioritized ideas to improve the training pipeline and ML loop (see also ALGO_ML_IMPROVEMENTS.md § "Further ML flow improvements").

### High impact

| Idea                                       | What                                                                                          | Status                                                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Calibrate signal-quality probabilities** | Post-train Platt scaling so the score band matches historical win rate.                       | Done — `_platt_calibration()` in train_models.py; saved to `improvement_report.signal_quality_calibration`; mlInference applies in `predictSignalQuality()`. |
| **ONNX smoke test after export**           | After `export_to_onnx()`, run one inference with `onnxruntime` and assert output shape/value. | Done — `verify_onnx_inference()` called after each export; optional dependency on onnxruntime.                                                               |
| **Retrain trigger on performance**         | Besides "90+ trades, max once/24h", allow retrain when recent win rate &lt; 45%.              | Done — TRAIN_ONNX_WHEN_READY uses `loadRecords(30)`, last 50 complete trades; if ≥20 trades and win rate &lt; 45%, bypass 24h cooldown.                      |

### Medium impact

| Idea                                | What                                                                                                                  | Status                                                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Log actual vs predicted**         | Holdout MAE / quantile loss / AUC in improvement report.                                                              | Done — `_holdout_metrics()`; `improvement_report.holdout_metrics` per model; in `training_metadata.json` and `improvement_report.md`. |
| **Stratification / sample weights** | Optional recency weighting or per-asset balancing so one symbol doesn’t dominate training.                            | Done — `--recency-decay`, `--balance-assets`; `_compute_sample_weights()`; passed into all four `train_*` fits.                       |
| **Hyperparameter search**           | GridSearchCV over max_depth, learning_rate, n_estimators with TimeSeriesSplit.                                        | Done — `--tune-hyperparams`; `_tune_signal_quality`, `_tune_position_sizing`; run e.g. every 500 trades.                              |
| **Remove StandardScaler**           | XGBoost is tree-based (monotonic-invariant); scaler was never persisted for ONNX inference, causing train/serve skew. | Done — StandardScaler removed entirely; no scaler warnings possible.                                                                  |

### Lower priority / backlog

| Idea                         | What / how to add                                                                                                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| **Ensemble**                 | Add signal-quality prob as input to position-sizing: in `prepare_position_sizing_features` add column from `model_sq.predict_proba(X_sq)[:, 1]` aligned by index (train signal_quality first); inference already has `signalQualityScore` in `PositionSizingInput`. |
| **SHAP / feature selection** | Done — `_shap_analysis()` with `shap.TreeExplainer` for all 4 models; mean                                                                                                                                                                                          | SHAP | values + top interactions in improvement report. Feature selection (RFE) remains backlog. |
| **Backtest harness**         | Load holdout from JSONL; run `model.predict(X_holdout)`; compute win rate, Sharpe, max DD; write `backtest_report.json` or add to improvement report.                                                                                                               |
| **A/B shadow mode**          | In `evaluateAndTrade()` / `openTrade()` log `{ mlSuggestedSize, actualSize, asset, timestamp }` to table or file; later analyze correlation of following ML with outcomes.                                                                                          |

### Doc / ops

- **Single source of feature names:** Document the full list "feature store key → flattened column → inference input" in FEATURE-STORE.md or ALGO_ML_IMPROVEMENTS.md so new features are added in all three places (store, train_models, mlInference).
- **Run from plugin dir:** Add a small `package.json` script in plugin-vince that invokes `train_models.py` with the correct paths so you can run `bun run train-models` from the plugin root without remembering the repo-root path.
