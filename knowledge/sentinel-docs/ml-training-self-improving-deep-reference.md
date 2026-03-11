# ML Training Pipeline & Self-Improving Architecture — Deep Reference

> **Last updated:** 2026-02-17
> **Definitive reference** for the Sentinel paper bot's ML training pipeline, self-improving closed-loop architecture, and Python training script internals.

---

## Table of Contents

1. [Self-Improving Architecture Overview](#1-self-improving-architecture-overview)
2. [Feature Store](#2-feature-store)
3. [Python Training Script — Full Logic](#3-python-training-script--full-logic)
4. [Improvement Report](#4-improvement-report)
5. [Dynamic Config Self-Tuning](#5-dynamic-config-self-tuning)
6. [Training Schedule and Triggers](#6-training-schedule-and-triggers)
7. [ML Inference at Trade Time](#7-ml-inference-at-trade-time)
8. [Weight Bandit](#8-weight-bandit)
9. [Candidate Signal Factors](#9-candidate-signal-factors)
10. [How to Add a New Data Source](#10-how-to-add-a-new-data-source)

---

## 1. Self-Improving Architecture Overview

The system is a **closed-loop self-improving pipeline**. Each cycle feeds back into the next, so performance should monotonically improve over time (barring regime shifts).

### The Loop

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. Paper bot trades using signalAggregator weights & thresholds   │
│                          ↓                                          │
│  2. Every trade (and avoided trade) writes a feature record         │
│     → vinceFeatureStore.service.ts                                  │
│                          ↓                                          │
│  3. When 90+ complete trades accumulate:                            │
│     → train_models.py trains 4 XGBoost models → exports ONNX       │
│                          ↓                                          │
│  4. ONNX models loaded by mlInference.service.ts                    │
│     → used for signal quality, position sizing, TP/SL optimization  │
│                          ↓                                          │
│  5. build_improvement_report() identifies what to tune              │
│     → feature importances, suggested thresholds, action items       │
│                          ↓                                          │
│  6. improvementReportWeights.ts reads training_metadata.json        │
│     → adjusts dynamicConfig source weights based on importance      │
│                          ↓                                          │
│  7. parameterTuner.service.ts auto-tunes thresholds                 │
│     → minStrength, minConfidence, minConfirming based on perf       │
│                          ↓                                          │
│  8. weightBandit.service.ts (multi-armed bandit)                    │
│     → real-time source weight optimization via UCB1/Thompson        │
│                          ↓                                          │
│  9. Loop repeats — each cycle should be better than the last        │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Files

| Component | File |
|-----------|------|
| Feature Store | `vinceFeatureStore.service.ts` |
| Training Script | `train_models.py` |
| ML Inference | `mlInference.service.ts` |
| Improvement Report Weights | `improvementReportWeights.ts` |
| Parameter Tuner | `parameterTuner.service.ts` |
| Weight Bandit | `weightBandit.service.ts` |
| Dynamic Config | `dynamicConfig.ts` |
| Signal Aggregator | `signalAggregator.service.ts` |
| Training Scheduler | Task `TRAIN_ONNX_WHEN_READY` |

---

## 2. Feature Store

**File:** `vinceFeatureStore.service.ts`

Every trade (opened + closed) and every **avoided** trade generates a feature record. This is the raw data that feeds the ML pipeline.

### Feature Record Sections

Each record contains these sections:

#### Market Features
| Feature | Description |
|---------|-------------|
| `priceChange24h` | 24-hour price change percentage |
| `volumeRatio` | Current volume vs average volume ratio |
| `fundingPercentile` | Funding rate percentile (0-100) |
| `longShortRatio` | Binance long/short account ratio |
| `atrPct` | ATR as percentage of price |
| `rsi14` | 14-period RSI |
| `oiChange24h` | Open interest change over 24h |
| `dvol` | Deribit implied volatility index |
| `bookImbalance` | Order book bid/ask imbalance |
| `bidAskSpread` | Current bid-ask spread |
| `priceVsSma20` | Price relative to 20-period SMA |

#### Session Features
| Feature | Description |
|---------|-------------|
| `isWeekend` | Boolean — Saturday or Sunday |
| `isOpenWindow` | Boolean — within configured trading window |
| `utcHour` | Hour of day in UTC (0-23) |

#### Signal Features
| Feature | Description |
|---------|-------------|
| `strength` | Aggregated signal strength (0-100) |
| `confidence` | Aggregated confidence score (0-100) |
| `source_count` | Number of confirming sources |
| `hasCascadeSignal` | Boolean — cascade/momentum signal present |
| `hasFundingExtreme` | Boolean — funding rate at extreme levels |
| `hasWhaleSignal` | Boolean — whale activity detected |
| `hasOICap` | Boolean — OI capitulation signal |
| `xSentimentScore` | X/Twitter sentiment score |
| `direction` | "long" or "short" |
| `avgSentiment` | Average sentiment across sources |

#### Regime Features
| Feature | Description |
|---------|-------------|
| `marketRegime` | "bullish", "bearish", or "neutral" |
| `volatilityRegime` | "low", "normal", or "high" |

#### News Features
| Feature | Description |
|---------|-------------|
| `nasdaqChange` | NASDAQ 24h change percentage |
| `etfFlowBtc` | BTC ETF daily flow (millions USD) |
| `etfFlowEth` | ETH ETF daily flow (millions USD) |
| `macroRiskEnvironment` | "risk_on", "risk_off", or "neutral" |
| `avg_sentiment` | Average news sentiment score |

#### WTT (Wyckoff Trade Template) Features
| Feature | Description |
|---------|-------------|
| `primary` | Boolean — is this a primary WTT setup |
| `alignment` | 1-5 scale — how aligned with WTT framework |
| `edge` | 1-4 scale — edge quality |
| `payoffShape` | 1-5 scale — risk/reward shape |
| `timingForgiveness` | 1-4 scale — how forgiving the timing is |
| `invalidateHit` | Boolean — whether invalidation level was hit |

#### Labels (Computed from Outcome)
| Label | Description |
|-------|-------------|
| `profitable` | Boolean — did the trade make money |
| `rMultiple` | Realized R-multiple (profit / initial risk) |
| `optimalTpLevel` | Which TP level would have been optimal |
| `maxAdverseExcursion` | Maximum drawdown during the trade (% of entry) |

### Avoided Trade Records

When a signal is evaluated but **no trade is taken** (filtered out by thresholds, ML, or other logic), an avoided record is written. These records contain:
- ✅ Market, session, signal, regime, news snapshot
- ❌ No execution or outcome data

**Rate limit:** Maximum 1 avoided record per asset per 2 minutes (prevents flooding during high-signal periods).

### Storage

- **Primary:** Local JSONL files at `.elizadb/vince-paper-bot/features/`
- **Database:** PGLite (local) or Postgres
- **Cloud:** Optional Supabase dual-write for redundancy

---

## 3. Python Training Script — Full Logic

**File:** `train_models.py`

### 4 Models Trained

---

### Model 1: Signal Quality Predictor

- **Type:** `XGBClassifier` — binary classification
- **Target:** `profitable` (yes/no)
- **Objective:** `binary:logistic`
- **Eval metric:** AUC

**Core features:**
```
market_priceChange24h, market_volumeRatio, market_fundingPercentile,
market_longShortRatio, signal_strength, signal_confidence,
signal_source_count, signal_hasCascadeSignal, signal_hasFundingExtreme,
signal_hasWhaleSignal, session_isWeekend, session_isOpenWindow,
session_utcHour
```

**Plus:**
- Optional columns (see Common Features below)
- Regime binary features: `regime_volatility_high`, `regime_bullish`, `regime_bearish`
- Asset dummy columns (when multi-asset)
- Lag features (see Common Features)

**Training details:**
- `scale_pos_weight` computed for class imbalance (ratio of negative to positive samples)
- Early stopping: 15 rounds on time-based holdout (last 20% of data chronologically)
- Suggested threshold: F1-optimized scan over range `[0.3, 0.8]`
- **Platt calibration:** Sigmoid calibration applied post-training to align predicted probabilities with actual win rates

---

### Model 2: Position Sizing Model

- **Type:** `XGBRegressor` — regression
- **Target:** Optimal R-multiple (clipped to `[-2, 3]`)
- **Objective:** `reg:squarederror`

**Core features:**
```
signal_strength, signal_confidence, signal_source_count,
session_isWeekend, exec_streakMultiplier, market_atrPct
```

**Plus:**
- Optional columns
- Volatility ordinal: low=0, normal=1, high=2
- Lag features

---

### Model 3: TP Optimizer

- **Type:** `XGBClassifier` — multi-class classification
- **Target:** Best TP level (which take-profit tier maximizes outcome)
- **Objective:** `multi:softprob`

**Core features:**
```
signal_direction_num, market_atrPct, signal_strength, signal_confidence
```

**Plus:**
- Optional columns
- Volatility ordinal (0/1/2)
- Market regime ordinal (bearish=0, neutral=1, bullish=2)
- Lag features

---

### Model 4: SL Optimizer

- **Type:** `XGBRegressor` — quantile regression
- **Target:** Max adverse excursion (clipped to `[0, 5]`)
- **Objective:** `reg:quantileerror`
- **Quantile:** `quantile_alpha=0.95` — predicts 95th percentile of adverse movement

**Core features:** Same as TP Optimizer

---

### Common Features Added by `_add_common_features()`

Applied to all 4 models' feature sets:

#### OPTIONAL_FEATURE_COLUMNS
```python
OPTIONAL_FEATURE_COLUMNS = [
    "market_dvol",
    "market_rsi14",
    "market_oiChange24h",
    "market_fundingDelta",
    "market_bookImbalance",
    "market_bidAskSpread",
    "market_priceVsSma20",
    "signal_hasOICap",
    "signal_xSentimentScore",
    "wtt_primary",
    "wtt_alignment",
    "wtt_edge",
    "wtt_payoffShape",
    "wtt_timingForgiveness",
    "wtt_invalidateHit",
]
```

These are included **only if present** in the data and not mostly null. Graceful degradation — models train fine without them.

#### News Features
```python
"signal_avg_sentiment",
"news_avg_sentiment",
"news_nasdaqChange",
"news_etfFlowBtc",
"news_etfFlowEth",
"news_macro_risk_on",    # binary from macroRiskEnvironment
"news_macro_risk_off",   # binary from macroRiskEnvironment
```

#### Asset Dummies
When training on multi-asset data, one-hot encoded asset columns are added (e.g., `asset_BTC`, `asset_ETH`).

#### Lag Features
```python
LAG_WINDOWS = [1, 2, 3]

LAG_SOURCE_COLUMNS = [
    "priceChange24h", "volumeRatio", "fundingPercentile",
    "longShortRatio", "atrPct", "rsi14", "oiChange24h", "dvol"
]
```

For each source column and each lag window, creates:
- `market_{col}_lag{n}` — value from N trades ago
- `market_{col}_roll3_mean` — rolling 3-trade mean

This gives the model **temporal context** — not just current market state, but how it's been changing.

---

### Training Pipeline Details

#### Cross-Validation
- **TimeSeriesSplit** with 5 folds (respects temporal ordering)
- No random shuffling — prevents lookahead bias

#### Hyperparameter Tuning
- **Primary:** Optuna Bayesian optimization (50 trials) when `--tune-hyperparams` flag passed
- **Fallback:** GridSearchCV when Optuna not available
- Tunes: max_depth, learning_rate, n_estimators, subsample, colsample_bytree, min_child_weight, gamma, reg_alpha, reg_lambda

#### Sample Weights
- **Recency decay:** Recent trades weighted more heavily than older ones (exponential decay)
- **Asset balancing:** When multi-asset, weights adjusted so each asset contributes equally

#### Outlier Clipping
- Z-score based: features clipped at ±3σ
- Requires `scipy` (graceful skip if not installed)

#### Early Stopping
- 15 rounds patience on time-based holdout (last 20%)
- Prevents overfitting to training data

#### Model Export
- **ONNX export** with smoke test via `onnxruntime` (verifies model loads and produces output)
- **Feature manifests** (JSON) saved alongside each `.onnx` file — records exact feature names and order
- **SHA-256 hash** computed for model versioning and integrity checks
- **Joblib backup** saved for debugging and offline analysis

---

### Validation

#### Walk-Forward Validation
- Expanding window: train on all data up to time T, test on T+1 to T+k
- **Purge gap:** 2 rows between train and test sets to prevent leakage from lagged features
- Reports per-fold AUC, accuracy, precision, recall

#### Holdout Metrics
- Fresh model trained on chronological 80/20 split
- No hyperparameter tuning on holdout — pure out-of-sample evaluation
- Reports: AUC, accuracy, precision, recall, F1, Brier score

#### SHAP Analysis
- When `shap` package is installed:
  - Feature importance (mean absolute SHAP values)
  - Top feature interactions (SHAP interaction values)
  - Saved to improvement report for downstream weight tuning

---

## 4. Improvement Report

**Generated by:** `build_improvement_report()` in `train_models.py`

**Output file:** `training_metadata.json` (alongside model files)

### Report Sections

#### `feature_importances`
- Per model (signal_quality, position_sizing, tp_optimizer, sl_optimizer)
- Two sources:
  - **Gain-based:** XGBoost's built-in feature importance (total gain)
  - **SHAP-based:** Mean absolute SHAP values (when available)

#### `tp_level_performance`
- Win rate and trade count per TP level
- Identifies which TP levels are working and which aren't
- Example: `{ "tp1": { "win_rate": 0.72, "count": 45 }, "tp2": { "win_rate": 0.58, "count": 31 } }`

#### `decision_drivers_by_direction`
- Splits feature importances by long vs short trades
- Reveals if the model relies on different factors for different directions
- Helps identify directional biases

#### `suggested_signal_factors`
- Lists items from `CANDIDATE_SIGNAL_FACTORS` that are:
  - Not yet present in the training data, OR
  - Present but mostly null (>80% missing)
- These are the next features to wire up for potential improvement

#### `holdout_metrics`
- Out-of-sample performance metrics from the 80/20 holdout
- Used for **drift detection** — if holdout metrics degrade significantly from previous training, something changed

#### `suggested_tuning`
- `min_strength`: 25th percentile of strength among profitable trades
- `min_confidence`: 25th percentile of confidence among profitable trades
- Idea: filter out signals weaker than what historically worked

#### `wtt_performance`
- Comparison of WTT-flagged trades vs non-WTT trades
- Win rate, average R-multiple, trade count for each group
- Validates whether WTT framework adds value

#### `signal_quality_calibration`
- Platt scaling parameters (slope, intercept)
- Used by `mlInference.service.ts` to calibrate raw model probabilities

#### `action_items`
- Concrete, prioritized list of steps to improve the system
- Generated based on analysis results (e.g., "Add market_dvol — it's available but not yet in features")

---

## 5. Dynamic Config Self-Tuning

**File:** `dynamicConfig.ts`

### Threshold Bounds

| Parameter | Min | Max | Description |
|-----------|-----|-----|-------------|
| `minStrength` | 30 | 90 | Minimum signal strength to open trade |
| `minConfidence` | 30 | 90 | Minimum confidence to open trade |
| `minConfirming` | 2 | 5 | Minimum confirming sources |
| `strongStrength` | 50 | 95 | Threshold for "strong" signal classification |
| `highConfidence` | 50 | 95 | Threshold for "high confidence" classification |

### Source Weights
- Range: **0.1 to 3.0**
- Default: 1.0 for most sources
- Stored in `DEFAULT_SOURCE_WEIGHTS`

### Change Logging
- Every change logged with:
  - Timestamp
  - Old value → new value
  - Reason string (e.g., "improvement_report: MarketRegime importance increased")
  - Sample size and win rate at time of change
- **Max 100 history entries** (FIFO — oldest dropped)

### improvementReportWeights.ts

**Maps features to sources:**

```typescript
FEATURE_TO_SOURCE = {
    "regime_bullish": "MarketRegime",
    "regime_bearish": "MarketRegime",
    "regime_volatility_high": "MarketRegime",
    "signal_hasWhaleSignal": "BinanceTopTraders",
    "signal_hasCascadeSignal": "CascadeMomentum",
    "signal_hasFundingExtreme": "FundingRate",
    "signal_hasOICap": "OICapitulation",
    "signal_xSentimentScore": "XSentiment",
    // ... etc
}
```

**Weight adjustment formula:**
```
ratio = source_importance / mean_importance_across_all_sources
suggested = max(0.5, min(2.0, current * (0.85 + 0.3 * ratio)))
```

- If a source's features are **more important** than average → weight increases
- If **less important** → weight decreases
- Bounded to `[0.5, 2.0]` to prevent extreme swings
- The `0.85 + 0.3 * ratio` formula ensures:
  - At ratio=0.5 (half of average): multiplier = 1.0 (slight decrease)
  - At ratio=1.0 (average): multiplier = 1.15 (slight increase — bias toward proven sources)
  - At ratio=2.0 (double average): multiplier = 1.45 (moderate increase)

---

## 6. Training Schedule and Triggers

### Automatic Training

- **Task:** `TRAIN_ONNX_WHEN_READY`
- **Frequency:** Runs every **12 hours**
- **Minimum data:** 90 complete trades required
- **Cooldown:** 24 hours between training runs (prevents thrashing)

### Emergency Retrain

Bypasses the 24h cooldown when:
- Recent win rate (last 50 trades) **< 45%**
- AND have **20+ recent trades** (enough data to be meaningful)

This catches regime shifts or model degradation quickly.

### Post-Training Steps

1. ONNX models saved to `.elizadb/vince-paper-bot/models/`
2. Models uploaded to **Supabase storage** (backup + multi-device sync)
3. `mlInference.service.ts` **reloads** models (hot-swap, no restart needed)
4. `improvementReportWeights.ts` reads new `training_metadata.json`
5. Dynamic config weights adjusted based on improvement report
6. `parameterTuner.service.ts` checks if threshold adjustments needed

### Manual Training

```bash
python3 train_models.py \
    --data .elizadb/vince-paper-bot/features \
    --output .elizadb/vince-paper-bot/models
```

Optional flags:
- `--tune-hyperparams` — enable Optuna Bayesian tuning (slower, better)
- Additional flags for specific model selection, debug output, etc.

---

## 7. ML Inference at Trade Time

**File:** `mlInference.service.ts`

### Model Loading

- Loads ONNX models from `.elizadb/vince-paper-bot/models/`
- Uses `onnxruntime-node` for inference
- Models hot-swapped after retraining (no service restart)

### Inference Outputs

| Model | Output | Usage |
|-------|--------|-------|
| Signal Quality | Probability 0-1 | Gate: skip low-probability trades |
| Position Sizing | Optimal R-multiple | Determines position size (higher R = larger) |
| TP Optimizer | Recommended TP level | Sets take-profit target |
| SL Optimizer | Max adverse excursion estimate | Sets stop-loss distance |

### Feature Vector Construction

**Critical:** Feature vector must match **exact same order** as training.

- Reads `training_metadata.signal_quality_feature_names` from `training_metadata.json`
- For each feature name, calls `getSignalQualityFeatureValue()` to extract from current market state
- Missing features filled with 0 (same as training pipeline)
- Feature names are the contract between training and inference

### Calibration

- Raw signal quality probability passed through Platt calibration
- Uses `signal_quality_calibration` params from training metadata
- Result: calibrated probability where 0.6 actually means ~60% chance of profit

---

## 8. Weight Bandit

**File:** `weightBandit.service.ts`

### Algorithm

Multi-armed bandit for **real-time** source weight optimization.

- **UCB1 (Upper Confidence Bound)** or **Thompson Sampling** — selects which variant to use
- Each signal source is an "arm" in the bandit
- **Reward signal:** Trade outcome (profitable = positive reward, loss = negative)

### How It Works

1. Before each trade decision, bandit suggests source weight adjustments
2. Trade executes with those weights
3. After trade closes, outcome is fed back as reward
4. Bandit updates its beliefs about which sources are valuable

### Exploration vs Exploitation

- **Exploration:** Tries different weight combinations to discover better ones
- **Exploitation:** Sticks with proven weight combos
- UCB1 balances this via confidence bounds (less-tested arms get bonus)
- Thompson Sampling balances via posterior sampling (uncertainty = more exploration)

### Integration with dynamicConfig

- When active, bandit **overrides** dynamicConfig source weights
- Bandit weights are transient (not persisted across restarts by default)
- improvementReportWeights.ts provides the **baseline**; bandit provides **real-time adjustments**
- Updates after **each closed trade** — much faster feedback than the 12h training cycle

---

## 9. Candidate Signal Factors

**From `CANDIDATE_SIGNAL_FACTORS` in `train_models.py`**

These are features identified as potentially valuable but either not yet wired up or not yet consistently populated:

| Factor | Column Name | Status |
|--------|-------------|--------|
| Funding 8h delta | `market_fundingDelta` | Optional |
| Order book imbalance | `market_bookImbalance` | Optional |
| Bid-ask spread | `market_bidAskSpread` | Optional |
| RSI 14 | `market_rsi14` | Optional |
| Price vs SMA20 | `market_priceVsSma20` | Optional |
| DVOL (implied vol) | `market_dvol` | Optional |
| OI change 24h | `market_oiChange24h` | Optional |
| NASDAQ 24h change | `news_nasdaqChange` | News feature |
| ETF flow BTC | `news_etfFlowBtc` | News feature |
| ETF flow ETH | `news_etfFlowEth` | News feature |
| Macro risk env | `news_macroRiskEnvironment` | News feature |
| Source sentiment | `signal_avg_sentiment` | Signal feature |
| Win/loss streak | `exec_streakMultiplier` | Execution feature |
| HL OI cap | `signal_hasOICap` | Optional |
| HL funding extreme | `signal_hasFundingExtreme` | Core signal |
| Binance L/S ratio | `market_longShortRatio` | Core market |
| WTT alignment | `wtt_alignment` | WTT feature |
| WTT edge | `wtt_edge` | WTT feature |

The improvement report's `suggested_signal_factors` section automatically identifies which of these are missing or mostly null, prioritizing what to wire up next.

---

## 10. How to Add a New Data Source (End-to-End)

Adding a new data source touches 8 files. Here's the complete checklist:

### Step 1: Create the Service

**Location:** `services/`

```typescript
// services/myNewSource.service.ts
export class MyNewSourceService {
    async fetch(): Promise<MyNewSourceData> { /* fetch, parse, cache */ }
}
```

- Implement fetching, parsing, and caching
- Add rate limiting and error handling
- Cache results to avoid redundant API calls

### Step 2: Register in Signal Aggregator

**File:** `signalAggregator.service.ts`

- Add to the source collection
- Assign initial weight (typically 1.0)
- Wire up the fetch → signal conversion logic

### Step 3: Add to Dynamic Config

**File:** `dynamicConfig.ts`

- Add to `DEFAULT_SOURCE_WEIGHTS` with initial weight (1.0)
- This makes it tunable by the self-improving loop

### Step 4: Add Feature Columns to Feature Store

**File:** `vinceFeatureStore.service.ts`

- Add new columns to the feature record
- Wire up data extraction from the source's output
- Ensure both trade and avoided records capture the new features

### Step 5: Add to Training Script

**File:** `train_models.py`

- Add flattened column name(s) to `OPTIONAL_FEATURE_COLUMNS`
- The `_add_common_features()` function will automatically include it when present
- Mark as optional so training works even before data accumulates

### Step 6: Add to ML Inference

**File:** `mlInference.service.ts`

- Add to `SignalQualityInput` interface
- Add extraction logic in `getSignalQualityFeatureValue()`
- Ensures the feature is available at inference time with the same name as training

### Step 7: Add to Candidate Signal Factors

**File:** `train_models.py`

- Add to `CANDIDATE_SIGNAL_FACTORS` list
- The improvement report will track whether it's populated and useful

### Step 8: Retrain Models

```bash
python3 train_models.py \
    --data .elizadb/vince-paper-bot/features \
    --output .elizadb/vince-paper-bot/models
```

After enough trades accumulate with the new feature populated, the models will automatically start using it. The improvement report will show its importance relative to other features.

---

## Appendix A: File Locations

```
.elizadb/vince-paper-bot/
├── features/              # Feature store (JSONL files)
│   ├── trades.jsonl       # Completed trade features
│   └── avoided.jsonl      # Avoided trade features
├── models/                # Trained models
│   ├── signal_quality.onnx
│   ├── signal_quality_features.json
│   ├── position_sizing.onnx
│   ├── position_sizing_features.json
│   ├── tp_optimizer.onnx
│   ├── tp_optimizer_features.json
│   ├── sl_optimizer.onnx
│   ├── sl_optimizer_features.json
│   ├── training_metadata.json
│   └── *.joblib           # Joblib backups
└── config/
    └── dynamicConfig.json # Runtime tuned config
```

## Appendix B: Key Constants

```python
# train_models.py
MIN_TRADES = 90                    # Minimum trades to start training
EARLY_STOPPING_ROUNDS = 15        # Patience for early stopping
HOLDOUT_FRACTION = 0.20           # 20% time-based holdout
CV_FOLDS = 5                      # TimeSeriesSplit folds
OPTUNA_TRIALS = 50                # Bayesian tuning trials
OUTLIER_ZSCORE = 3.0              # Z-score clipping threshold
PURGE_GAP = 2                     # Walk-forward purge rows
LAG_WINDOWS = [1, 2, 3]           # Lag feature windows
R_MULTIPLE_CLIP = [-2, 3]         # Position sizing target bounds
MAE_CLIP = [0, 5]                 # SL optimizer target bounds
F1_THRESHOLD_RANGE = [0.3, 0.8]   # Signal quality threshold scan
QUANTILE_ALPHA = 0.95             # SL quantile regression target
```

```typescript
// dynamicConfig.ts
MIN_STRENGTH_BOUNDS = [30, 90]
MIN_CONFIDENCE_BOUNDS = [30, 90]
MIN_CONFIRMING_BOUNDS = [2, 5]
STRONG_STRENGTH_BOUNDS = [50, 95]
HIGH_CONFIDENCE_BOUNDS = [50, 95]
SOURCE_WEIGHT_BOUNDS = [0.1, 3.0]
MAX_HISTORY_ENTRIES = 100

// Training schedule
TRAIN_INTERVAL_HOURS = 12
TRAIN_COOLDOWN_HOURS = 24
EMERGENCY_WIN_RATE_THRESHOLD = 0.45
EMERGENCY_MIN_RECENT_TRADES = 20
EMERGENCY_RECENT_WINDOW = 50
```

```typescript
// improvementReportWeights.ts
WEIGHT_BOUNDS = [0.5, 2.0]        // Suggested weight range
FORMULA = current * (0.85 + 0.3 * ratio)
```

## Appendix C: Model Hyperparameter Search Space

When `--tune-hyperparams` is used, Optuna explores:

```python
{
    "max_depth": [3, 4, 5, 6, 7, 8],
    "learning_rate": [0.01, 0.3],          # log-uniform
    "n_estimators": [100, 500],
    "subsample": [0.6, 1.0],
    "colsample_bytree": [0.6, 1.0],
    "min_child_weight": [1, 10],
    "gamma": [0, 5],
    "reg_alpha": [1e-8, 10],              # log-uniform
    "reg_lambda": [1e-8, 10],             # log-uniform
}
```

GridSearchCV fallback uses a reduced grid:
```python
{
    "max_depth": [3, 5, 7],
    "learning_rate": [0.01, 0.05, 0.1],
    "n_estimators": [100, 200, 300],
    "subsample": [0.7, 0.8, 0.9],
}
```

---

*This document is the single source of truth for the ML training pipeline. When in doubt, check the actual source files — but this should cover 95% of questions about how the self-improving loop works.*
