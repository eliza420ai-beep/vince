# Training script review: train_models.py

## Quick checklist (see [scripts/README.md](README.md) for tracking)

| Priority    | Item                                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Short-term  | Load **JSONL** (feature store format); fix or remove **SL Optimizer** in docs; **robust key access**; **requirements.txt**; **logging** |
| Medium-term | Early stopping; hyperparameter tuning; ONNX validation; unit tests; asset/feature enhancements                                          |

---

## Overview

This script is a solid foundation for training ML models to optimize a trading bot (VINCE, apparently part of ElizaOS) using historical paper trade data from Hyperliquid (a crypto perpetuals exchange). It focuses on post-trade analysis to predict signal quality, suggest position sizes, and optimize take-profit (TP) levels based on features like market conditions, signal strength, session timing, and regimes. The use of XGBoost is appropriate for tabular data with mixed feature types, and exporting to ONNX is smart for efficient inference in a production setup (e.g., low-latency predictions in a bot).The script assumes input data in a JSON format (not JSONL as mentioned in your query—might be a minor mismatch; JSONL would require line-by-line reading with json.loads in a loop). It flattens nested trade records into a Pandas DataFrame, engineers features, trains models with time-series-aware cross-validation (good for avoiding lookahead bias in trading data), and skips training if fewer than 100 samples are available. Overall, it's well-structured, modular, and trading-specific, but there's room for improvements in completeness, robustness, and advanced techniques.StrengthsTrading-Relevant Modeling: Signal Quality Predictor (binary classification): Predicts if a signal leads to a profitable trade. Features like signal strength, source count, funding extremes, and market regimes make sense for sentiment-based indicators in crypto perps.
Position Sizing Model (regression): Uses R-multiple (risk-reward ratio) as a target to suggest size multipliers. Clipping outliers (-2 to 3) prevents extreme values from skewing training.
TP Optimizer (multi-class classification): Classifies optimal TP levels (0-3, assuming discrete buckets like 1x, 2x, 3x ATR). Incorporating volatility and market regime is clever for adaptive exits.

Time-Series Handling: TimeSeriesSplit for CV is crucial in trading to simulate walk-forward optimization and prevent data leakage.
Feature Engineering: Pragmatic flattening of nested JSON, handling of categoricals (e.g., regime mapping to numerics), and fallback to available columns. Normalization is applied, which isn't strictly needed for tree-based models like XGBoost but can stabilize training.
Efficiency and Deployment: ONNX export ensures compatibility with various runtimes (e.g., ONNX Runtime for fast inference). The metadata JSON is useful for tracking.
Thresholds and Safeguards: Min samples check prevents overfitting on tiny datasets. Positive rate and distribution prints help diagnose data quality.

Potential Issues and BugsMissing SL Optimizer: The docstring lists "4. SL Optimizer - Quantile regression (max adverse excursion)", but the code doesn't implement it—no prepare_sl_features, no training function, and no export. If this is intentional (maybe phased out), update the docstring to avoid confusion. If not, you'd need to add it: e.g., target could be max drawdown percentile, using quantile loss in XGBoost (objective='reg:quantileerror', quantile_alpha=0.95).
Data Assumptions:Assumes all records have consistent nested keys; if the JSON structure varies (e.g., missing 'outcome' in some), it could lead to NaNs or KeyErrors. Add more robust checks, like r.get('market', {}).
JSON vs. JSONL: If your files are truly JSONL (one JSON object per line), switch to pd.read_json(filepath, lines=True) or a loop to avoid load errors.
Asset-Specific Handling: All assets (e.g., BTC-PERP, ETH-PERP on Hyperliquid) are treated uniformly. If volatility differs wildly (e.g., meme coins vs. majors), consider asset dummies or separate models per asset.

Feature Gaps:Skips arrays like 'signal.sources' and 'news' lists—could extract aggregates (e.g., avg sentiment from sources) for richer features.
No handling for multicollinearity or feature selection (e.g., via SHAP or recursive elimination); top features are printed, but not acted on.
Categorical Encoding: Regimes are manually mapped, but others (e.g., 'asset') aren't used—encode 'asset' if multi-asset.

Model-Specific:Signal Quality: Uses AUC for eval, which is good for imbalanced classes (trading wins are often <50%). But if positives are rare, consider class weights.
Position Sizing: MAE for regression is fine, but for trading, MAPE or custom loss (e.g., penalizing undersizing wins more) might better align with risk management.
TP Optimizer: Assumes 4 classes (num_class=4); confirm this matches your labeling. Multi-class accuracy can be misleading if imbalanced—log class distribution in metadata.
Hyperparams: Fixed (n_estimators=100, max_depth=4)—add GridSearchCV or Optuna for tuning, wrapped in TimeSeriesSplit.

ONNX Export: Relies on skl2onnx, which works for XGBoost but can fail on complex boosters. Test inference post-export (e.g., with onnxruntime).
Dependencies and Portability: Warns if ONNX missing, good. But no version pins—add a requirements.txt. Also, no GPU config for XGBoost (add tree_method='gpu_hist' if available).
Error Handling: Limited; e.g., if no trades with outcomes, it prints and exits gracefully, but file I/O or DF ops could crash—wrap in try-except.

Suggestions for ImprovementAdd SL Optimizer: Mirror TP structure. Features could include ATR, volatility regime, and signal direction. Target: predicted max adverse excursion (MAE) via quantile regression to set conservative stops.
Enhance Data Prep:Add outlier detection (e.g., z-score on numerics).
Incorporate more sentiment indicators: If sources are text-based, extract TF-IDF or embeddings (but keep it lightweight).
Time Features: 'session_utcHour' is there, but add day-of-week or holidays for better session modeling.

Advanced Training:Early Stopping: Add to XGBoost fit (e.g., early_stopping_rounds=10 with eval_set).
Ensemble or Stacking: Combine models (e.g., use signal quality prob as input to sizing).
Backtesting Integration: After training, simulate trades with predictions to compute metrics like Sharpe ratio.

Testing and Validation:Unit Tests: Add pytest for functions like load_features (mock JSON).
Logging: Use logging module instead of print for production.
Data Augmentation: For small datasets, synthetic trades via SMOTE (for classification) or noise injection.

Scalability: If datasets grow large, switch to Dask for DF ops or XGBoost's distributed training.
Ethical/Practical Notes: Since this is for Hyperliquid (crypto perps), models could amplify losses in volatile markets—emphasize paper trading validation. Also, sentiment indicators can be noisy; backtest against baselines like random sizing.

If you share sample data (e.g., a small features.json), I could test-run the script or prototype fixes. Overall, this is a thoughtful setup—polish the gaps, and it'd be production-ready for bot optimization!
