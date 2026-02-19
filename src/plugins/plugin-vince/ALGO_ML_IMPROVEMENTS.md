# Improving the Paper Trading Algo with ML

**Purpose:** Concrete ways to use existing ML (and training outputs) more in the paper trading bot. Signal quality and similarity already affect confidence; **position sizing, TP, and SL are now wired** in `evaluateAndTrade()` and `openTrade()`.

---

## Current ML Usage

| Component                 | Used?  | Where                                                                                                                                                                                                                                                                             |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Signal quality**        | ✅ Yes | Signal aggregator: boost/penalize confidence; threshold from `training_metadata.json` (`suggested_signal_quality_threshold`)                                                                                                                                                      |
| **Similarity prediction** | ✅ Yes | Signal aggregator: "proceed" / "caution" / "avoid" → factor + confidence adjust                                                                                                                                                                                                   |
| **Position sizing**       | ✅ Yes | `evaluateAndTrade()`: after rule-based size (portfolio %, DVOL, regime, session, streak), calls `predictPositionSize()`; applies multiplier 0.5×–2× then `validateTrade()`                                                                                                        |
| **TP optimizer**          | ✅ Yes | `openTrade()` calls `predictTakeProfit()` when ML + ATR available; TP distance = ATR% × model value                                                                                                                                                                               |
| **SL optimizer**          | ✅ Yes | `openTrade()` calls `predictStopLoss()` when ML + ATR available; SL% = ATR% × model value, clamped                                                                                                                                                                                |
| **Improvement report**    | ✅ Yes | `suggested_signal_quality_threshold` (ML + aggregator); `tp_level_performance` → skip worst TP level in `openTrade()`; `suggested_tuning.min_strength` / `min_confidence` → filter in `evaluateAndTrade()`. Training writes `suggested_tuning` from profitable-trade percentiles. |

---

## Recommended Improvements (in order of impact)

### 1. Wire ML position sizing into `openTrade` (high impact)

**Idea:** After computing `baseSizeUsd` (and all rule-based multipliers), call ML and apply a final size multiplier.

**Inputs** (from `PositionSizingInput`):  
`signalQualityScore`, `strength`, `confidence`, `volatilityRegime`, `currentDrawdown`, `recentWinRate`, `streakMultiplier`.

**Where:** `vincePaperTrading.service.ts` → `evaluateAndTrade()`, after the win-streak adjustment and before `validateTrade()`. We have: signal (strength, confidence), regime, portfolio; we need: signal quality score (from aggregated signal if we pass it through), current drawdown (from trade journal or position manager), recent win rate (from trade journal), streak multiplier (already computed).

**Implementation:**

- Get ML service; if null, skip.
- Build `PositionSizingInput` from signal + regime + journal/streak.
- `multiplier = await mlService.predictPositionSize(input); baseSizeUsd *= clamp(multiplier.value, 0.5, 2.0);`
- Then run existing `validateTrade()` so risk limits still apply.

**Result:** Size scales with ML-predicted edge (quality, regime, drawdown, win rate) while staying within risk rules.

**Status:** ✅ Implemented in `vincePaperTrading.service.ts` (evaluateAndTrade, after streak adjustment). Uses signal.mlQualityScore, strength, confidence, volatilityRegime from regime, currentDrawdownPct from risk manager, recentWinRate from last 20 outcomes, streakMultiplier. Logs when multiplier ≠ 1.0.

---

### 2. Wire ML TP/SL into `openTrade` (high impact)

**Status:** ✅ Implemented in `vincePaperTrading.service.ts` → `openTrade()`. When ML inference and ATR are available, builds `TPSLInput` (direction, atrPct, strength, confidence, volatilityRegime, marketRegime), calls `predictTakeProfit()` and `predictStopLoss()`, then sets TP prices and SL% from ATR × model multiplier. Falls back to rule-based TP/SL on error or missing model.

**Idea:** Use `predictTakeProfit` and `predictStopLoss` to set TP distance and SL distance from ATR (or from current rule and then scale by ML).

**Inputs** (from `TPSLInput`):  
`direction`, `atrPct`, `strength`, `confidence`, `volatilityRegime`, `marketRegime`.

**Where:** `vincePaperTrading.service.ts` → `openTrade()`, when computing `takeProfitPrices` and `stopLossPct` / `stopLossPrice`.

**TP:**

- Get ATR % (e.g. from market data or existing ATR in openTrade).
- `tpPred = await mlService.predictTakeProfit({ direction, atrPct, strength, confidence, volatilityRegime, marketRegime });`
- Option A: Single TP at `entry ± (atrPct * tpPred.value)` as price distance.
- Option B: Keep multiple TP levels but choose which level to favor (e.g. first TP) using `tpPred.value` (e.g. map 1.0–4.0 to level index).

**SL:**

- `slPred = await mlService.predictStopLoss(...same TPSLInput);`
- `stopLossDistance = atrPct * slPred.value` (then convert to price and clamp to min/max SL %).
- Ensures SL is consistent with risk while using ML to adapt to regime/strength.

**Result:** TP and SL become data-driven (trained on your closed trades) instead of purely rule-based.

---

### 3. Block or hard-penalize when ML quality is very low (medium impact)

**Status:** ✅ Implemented in `evaluateAndTrade()`: before converting to `AggregatedTradeSignal`, if `signal.mlQualityScore` is below `mlService.getSignalQualityThreshold()`, the trade is rejected and skipped (with log).

**Idea:** If signal quality score is below the trained threshold, optionally **block** the trade in the risk manager (or paper trading), not only penalize confidence.

**Where:**

- Option A: In `validateSignal()` (risk manager), if the trade signal includes `mlQualityScore` and it is below `getSignalQualityThreshold()`, return `valid: false` with reason "ML quality below threshold".
- Option B: In `evaluateAndTrade()`, after `getSignal()` and before `validateSignal()`, if `signal.mlQualityScore != null` and `signal.mlQualityScore < threshold`, skip (continue to next asset).

**Requires:** Aggregated signal already has `mlQualityScore` from `applyMLEnhancement()`. Pass it on the trade signal or ensure risk manager can see it (e.g. extend `AggregatedTradeSignal` with optional `mlQualityScore`).

**Result:** Fewer trades in “low-quality” regimes that the model learned to avoid.

---

### 4. Consume improvement report in code (medium impact)

**Status:** ✅ Implemented. ML inference loads full `improvement_report` from `training_metadata.json`. **TP level preference:** `getTPLevelIndicesToUse()` skips the worst-performing level (win_rate &lt; 45%, count ≥ 5); paper trading uses it when building `takeProfitPrices`. **Min strength/confidence:** `getSuggestedMinStrength()` / `getSuggestedMinConfidence()` read `suggested_tuning`; when set, `evaluateAndTrade()` rejects signals below those values. Training script now writes `suggested_tuning` (25th percentile of strength/confidence among profitable trades, when ≥20 profitable).

**Idea:** Use `training_metadata.json` beyond the signal-quality threshold.

**Possible levers:**

- **Min strength / min confidence:** If improvement report or action items say “raise min strength”, Parameter Tuner or `dynamicConfig` could read a suggested value and apply it (or suggest it in logs).
- **TP level preference:** If `tp_level_performance` shows level 2 underperforms, prefer level 1 or 3 when building `takeProfitPrices` (e.g. skip level 2 or reduce its weight).
- **Source weights:** If feature importances show “BinanceFundingExtreme” is top for signal quality, ensure that source’s weight in the aggregator is not reduced; could periodically align `dynamicConfig` source weights with importances.

**Where:**

- `dynamicConfig.ts`: optional read of `training_metadata.json` (or a slim “tuning” JSON) and override defaults.
- Or a small “improvement report loader” that runs after training and writes a `suggested_tuning.json` that the bot reads on startup.

**Result:** Algo drifts toward what the improvement report recommends without manual edits every time.

---

### 5. Stronger similarity-based filter (medium impact)

**Status:** ✅ Implemented in `evaluateAndTrade()`. When `mlSimilarityPrediction.recommendation === "avoid"`, the trade is skipped (with log) before converting to `AggregatedTradeSignal`.

**Idea:** When similarity says **"avoid"**, treat it like a hard filter (e.g. skip trade) in addition to the current confidence penalty.

**Where:** In `evaluateAndTrade()`, after `getSignal()`: if `signal.mlSimilarityPrediction?.recommendation === "avoid"`, skip this asset (or require an extra “override” condition to still trade).

**Result:** Fewer trades in regimes that similar past trades showed should be avoided.

---

### 6. Bandit feedback loop (ongoing)

**Status:** ✅ Implemented. On open: `contributingSources` (from `signal.sourceBreakdown`) stored in `position.metadata.contributingSources`. On close: `weightBandit.recordOutcome({ sources, profitable, pnlPct })` with those names so arms get PnL-weighted updates.

**Idea:** Ensure weight bandit is updated from **trade outcomes** (win/loss, PnL), not only from signal presence.

**Where:** When a position is closed (win or loss), notify the bandit (e.g. reward = +1 for win, 0 for loss, or scaled by r-multiple). Bandit then updates arm weights so that sources that contributed to winning trades get higher weight over time.

**Result:** Source weights become adaptive to what actually makes money in your paper environment.

---

## Quick reference: inputs for ML calls

**PositionSizingInput** (for `predictPositionSize`):

- `signalQualityScore` – from aggregated signal `mlQualityScore` (or 0.5 if missing)
- `strength`, `confidence` – from signal
- `volatilityRegime` – 0/1/2 from market regime (low/normal/high)
- `currentDrawdown` – from trade journal or portfolio (e.g. peak-to-now % drawdown)
- `recentWinRate` – from trade journal (e.g. last 20 trades)
- `streakMultiplier` – already in paper trading (win/loss streak)

**TPSLInput** (for `predictTakeProfit` / `predictStopLoss`):

- `direction` – 0 = short, 1 = long
- `atrPct` – ATR as % of price (from market data)
- `strength`, `confidence` – from signal
- `volatilityRegime` – 0/1/2
- `marketRegime` – -1 bearish, 0 neutral, 1 bullish (from regime service)

---

## Summary

| #   | Improvement                                                | Impact  | Effort | Status  |
| --- | ---------------------------------------------------------- | ------- | ------ | ------- |
| 1   | ML position sizing in evaluateAndTrade                     | High    | Medium | ✅ Done |
| 2   | ML TP/SL in openTrade                                      | High    | Medium | ✅ Done |
| 3   | Block trade when ML quality &lt; threshold                 | Medium  | Low    | ✅ Done |
| 4   | Consume improvement report (thresholds, TP level, weights) | Medium  | Medium | ✅ Done |
| 5   | Hard-filter on similarity "avoid"                          | Medium  | Low    | ✅ Done |
| 6   | Bandit reward from trade outcomes                          | Ongoing | Medium | ✅ Done |

Doing **1** and **2** uses the models you already train (position_sizing, tp_optimizer, sl_optimizer) and makes the algo directly data-driven. **3** and **5** are small code changes that reduce bad trades. **4** and **6** make the system self-tune from the same training and outcome data you already have.

---

## Further ML flow improvements

Ideas to improve the end-to-end ML pipeline beyond the table above:

1. **Training data & labels**
   - Ensure every closed trade writes `labels` (profitable, r_multiple, tp_level_hit, sl_hit) and that `train_models.py` uses them (e.g. TP optimizer target = which level was hit; SL optimizer can use maxAdverseExcursion).
   - Add optional labels: `session`, `regime_at_entry`, `source_combo` for stratified analysis or future models.

2. **Model calibration**
   - Signal quality output is used as a threshold; consider calibrating so 0.6 really means ~60% historical win rate in that score band (e.g. Platt scaling or isotonic regression post-train).
   - Position sizing / TP / SL outputs are multipliers; log actual vs predicted (e.g. in improvement report) to detect drift.

3. **Retrain cadence & triggers**
   - Keep TRAIN_ONNX_WHEN_READY (90+ trades, max once per 24h). Optionally trigger retrain when win rate or Sharpe over last N trades drops below a bound (e.g. “retrain when last 50 trades &lt; 45% win rate”).

4. **Feature store → training alignment**
   - Keep feature names and order in sync between `VinceFeatureStoreService` (JSONL), `train_models.py` (flattened columns), and `mlInference.service.ts` (prepare\*Features). **Single source of truth:** [FEATURE-STORE.md § Feature name mapping](../../../FEATURE-STORE.md) documents store key → flattened column → inference input and how to add a new feature in all three places.
   - **New signal flags (more data sources):** `hasFundingExtreme` is true for either Binance or Hyperliquid funding extreme; `hasOICap` is set when `HyperliquidOICap` contributed. Training script uses `signal_hasOICap` as an optional feature when present. After retraining with data that includes `signal_hasOICap`, add this input to `SignalQualityInput` and `prepareSignalQualityFeatures()` in `mlInference.service.ts` so the ONNX input dimension matches the new model.

5. **A/B or shadow mode**
   - Optional: log “what would ML have done?” alongside rule-based decision (e.g. ML size vs actual size) without changing behavior, then analyze correlation of ML-overrule with better outcomes before tightening the loop.

---

## Leverage more data points

**Yes — we have many more data points available than are currently used** in both the trading algo and the feature store. The training script's improvement report (`training_metadata.json` → `suggested_signal_factors`) explicitly lists fields that are **present in the schema but 0% or low % non-null** (i.e. not populated at record time).

### Already wired (as of this update)

| Data point         | Source                                                     | Where                                                                               |
| ------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **OI 24h change**  | CoinGlass `getOpenInterest(asset).change24h`               | Feature store `collectMarketFeatures` → `market.oiChange24h`                        |
| **DVOL**           | MarketData `getDVOL(asset)` (Deribit)                      | Feature store → `market.dvol`                                                       |
| **RSI (estimate)** | MarketData `estimateRSI(asset)`                            | Feature store → `market.rsi14`                                                      |
| **ATR %**          | MarketData `getATRPercent(asset)` (Deribit when available) | Feature store → `market.atrPct` (was default only; now live when Deribit available) |

Training script (`train_models.py`) now **includes** `market_dvol`, `market_rsi14`, `market_oiChange24h` (and for position sizing, `market_atrPct`) in the feature lists when those columns exist, so new JSONL with these populated will improve signal quality, position sizing, TP, and SL models.

### Now wired (latest)

| Data point               | Where                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Funding 8h delta**     | Feature store: per-asset funding history cache; delta = current − rate from ~8h ago.                                                            |
| **Order book imbalance** | Feature store: Binance futures depth (BTC/ETH/SOL/HYPE); (bidVol − askVol) / total.                                                             |
| **Bid-ask spread**       | Same depth; (bestAsk − bestBid) / mid × 100.                                                                                                    |
| **Price vs SMA20**       | Feature store: rolling window of last 20 prices per asset; (price − SMA) / SMA × 100.                                                           |
| **News sentiment**       | `getOverallSentiment()` → sentimentScore (±confidence), sentimentDirection; `getActiveRiskEvents()` → hasActiveRiskEvents, highestRiskSeverity. |
| **Signal sentiment**     | Keyword scan over `signal.factors` → `signal.avgSentiment`; train script uses it as `signal_avg_sentiment` when present.                        |

### Still optional (macro / ETF)

| Data point                        | How to add                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **NASDAQ 24h / ETF flow / macro** | Add macro/ETF API and set `news.nasdaqChange`, `news.etfFlowBtc`, `news.etfFlowEth`, `news.macroRiskEnvironment` in the feature record. |

See **DATA_LEVERAGE.md** in this plugin for a short checklist and mapping from "suggested signal factors" to code paths.

---

## Train & Deploy Checklist

Use this after you have **90+ closed trades** (or enough for a meaningful train set) and when you want to refresh models.

1. **Export & prepare data**
   - [ ] Export closed trades / feature store to the format expected by the training pipeline (e.g. `synthetic_90plus.jsonl` or your script’s input).
   - [ ] Ensure labels/targets are correct (e.g. `profitable`, TP hit, SL hit, r-multiple).

2. **Train models**
   - [ ] Run signal quality training (if you use it for threshold / boosting).
   - [ ] Run position sizing training (inputs: quality, strength, confidence, regime, drawdown, win rate, streak).
   - [ ] Run TP optimizer training (inputs: direction, ATR%, strength, confidence, volatility/market regime).
   - [ ] Run SL optimizer training (same TPSL inputs).
   - [ ] Run similarity model training if you use "proceed / caution / avoid".

3. **Export ONNX**
   - [ ] Export each trained model to ONNX (correct input/output shapes and feature order).
   - [ ] Place ONNX files in the bot’s model directory (e.g. `.elizadb/vince-paper-bot/models/`):  
          `signal_quality.onnx`, `position_sizing.onnx`, `tp_optimizer.onnx`, `sl_optimizer.onnx` (and similarity if applicable).

4. **Update metadata**
   - [ ] Update `training_metadata.json` (or equivalent) with:
     - `suggested_signal_quality_threshold`
     - Any TP level performance notes or action items you want the system (or you) to follow.

5. **Deploy & verify**
   - [ ] Restart the paper trading service (or reload models if hot-reload is supported).
   - [ ] Confirm in logs that ML inference loads the new models (e.g. version or path).
   - [ ] Run a few cycles and check that TP/SL and position sizing logs show ML-driven values when expected.

6. **Optional: improvement report in code**
   - [ ] If you implemented “consume improvement report” (e.g. min strength, TP level preference), re-run training and update the tuning file so the bot picks up new suggestions.

---

## Latest training run (2026-02-03)

**Data:** 1,287 records, 1,250 trades with outcomes (real + synthetic). Models trained and deployed to `src/plugins/plugin-vince/models/`.

**Applied from `training_metadata.json`:**

- `suggested_tuning`: min_strength 54, min_confidence 48
- `suggested_signal_quality_threshold`: 0.48

**TP level performance (win rate):**

- TP0: 59.9% (309 trades)
- TP1: 54.8% (294)
- TP2: 53.0% (347) — review weight/tighten conditions
- TP3: 55.3% (300)

**Top feature importances (signal_quality):** regime_bearish, asset_BTC, regime_volatility_high, signal_hasWhaleSignal, session_utcHour, market_fundingPercentile, signal_confidence, market_oiChange24h.

**Backlog (suggested signal factors to populate):**

- Funding 8h delta
- Order book imbalance
- Bid-ask spread
- Price vs SMA20
- DVOL / volatility index
- NASDAQ 24h change
- ETF flow (BTC/ETH)
- Macro risk environment
- Signal source sentiment (20% non-null — consider boosting)
