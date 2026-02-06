# Proving ML Adjusts Essential Parameters to Improve the Algo

**Goal:** Show that our ML logic can and does adjust essential parameters in a way that improves the paper trading algo (better selectivity, win rate, or risk-adjusted return).

---

## 1. What “Essential Parameters” ML Adjusts

| Parameter                                                 | Source                                                                                                                                     | Where applied                                                                | Effect                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **min_strength / min_confidence**                         | Offline: `train_models.py` → 25th percentile of **profitable** trades’ strength/confidence → `training_metadata.json` → `suggested_tuning` | `evaluateAndTrade()`: reject signals below these when not in aggressive mode | Fewer trades; only those above the bar that historically won  |
| **Signal quality threshold**                              | Offline: Signal Quality model + improvement report → `suggested_signal_quality_threshold`                                                  | Aggregator + `evaluateAndTrade()`: reject when `mlQualityScore < threshold`  | Filters low-quality regimes the model learned to avoid        |
| **TP / SL multipliers**                                   | Offline: TP and SL ONNX models trained on outcomes (R-multiple, MAE)                                                                       | `openTrade()`: `predictTakeProfit()`, `predictStopLoss()` → ATR × multiplier | TP/SL distances adapt to regime and signal strength           |
| **Position size multiplier**                              | Offline: Position Sizing ONNX model                                                                                                        | `evaluateAndTrade()`: `predictPositionSize()` → 0.5×–2× on base size         | Size scales with predicted edge (quality, drawdown, win rate) |
| **minStrength / minConfidence / minConfirming** (runtime) | Online: **Parameter Tuner** (Bayesian optimization) from trade outcomes                                                                    | `dynamicConfig` → risk manager `validateSignal()`                            | Thresholds drift toward parameter sets that performed well    |
| **Source weights**                                        | Online: **Weight Bandit** (Thompson Sampling) from PnL per source                                                                          | `dynamicConfig` source weights → signal aggregator                           | More weight to sources that contributed to wins               |

So we have **offline** levers (training → metadata → bot) and **online** levers (tuner + bandit → dynamicConfig → bot).

---

## 2. Causal Chain (Data → Training → Application)

```
Feature Store (JSONL)     →  train_models.py
  • outcome.profitable         • suggested_tuning = 25th % of profitable (strength, confidence)
  • signal_strength            • suggested_signal_quality_threshold
  • signal_confidence          • tp_level_performance, ONNX models
  • outcome.realizedPnl, etc.  →  training_metadata.json
  • improvement_report: feature_importances, holdout_metrics (AUC/MAE/quantile), suggested_signal_quality_threshold, signal_quality_calibration (Platt)
                                        ↓
Bot (evaluateAndTrade / openTrade)
  • getSuggestedMinStrength() / getSuggestedMinConfidence()  →  reject if below (when not aggressive)
  • getSignalQualityThreshold()                               →  reject if mlQualityScore below
  • getTPLevelIndicesToUse()                                  →  skip worst TP level
  • predictTakeProfit() / predictStopLoss()                   →  TP/SL distance from ATR × model
  • predictPositionSize()                                     →  size multiplier
```

**Parameter Tuner (online):**  
Trade outcomes → `VinceParameterTunerService` → Bayesian proposal over (minStrength, minConfidence, minConfirming) → `dynamicConfig.updateThreshold()` → risk manager uses new thresholds on next signals.

**Weight Bandit (online):**  
Trade outcomes per `contributingSources` → `VinceWeightBanditService` → Thompson Sampling → `dynamicConfig` source weights → aggregator uses new weights.

---

## 3. How to Prove It

### A. Offline: “Suggested tuning improves selectivity”

Run the **validation script** on your feature store data (same JSONL as training):

```bash
# From repo root; use your feature store path (e.g. .elizadb/vince-paper-bot/features)
python3 src/plugins/plugin-vince/scripts/validate_ml_improvement.py --data .elizadb/vince-paper-bot/features
```

The script:

1. Optionally prints **holdout_metrics** from the last training run (if `training_metadata.json` is found nearby), for drift/sizing context.
2. Loads all trades with outcomes (profitable, strength, confidence).
3. Computes **baseline** win rate (all trades) and **suggested_tuning** (25th percentile of profitable trades’ strength/confidence, same as `train_models.py`).
4. Simulates “what if we had used these thresholds from the start”: keeps only trades that pass `strength >= minStr` and `confidence >= minConf`.
5. Reports:
   - Baseline: N trades, win rate W0.
   - With suggested_tuning: M trades, win rate W1.
   - If W1 > W0 and we skipped mostly losers, that is evidence that **ML-derived thresholds improve selectivity** (fewer trades, higher win rate).

So the “proof” is: on the same data that generated the suggestion, applying it would have improved win rate (or another chosen metric). That shows the **logic can** adjust parameters to improve the algo; live improvement still depends on data quality and regime.

### B. Unit test: “Training produces models, metadata, and holdout metrics”

`scripts/test_train_models.py` (8 tests) generates synthetic features, runs `train_models.py`, and asserts:
- Models and metadata are produced; ONNX files when export succeeds.
- **Holdout metrics** appear in `improvement_report.holdout_metrics` when training runs (for drift/sizing).
- **Smoke tests** for `--recency-decay`/`--balance-assets` and `--tune-hyperparams` (code paths complete without crash).

Optional strengthening: assert that after training on synthetic data where profitable trades have higher strength/confidence, `suggested_tuning` is stricter than the baseline (e.g. min_strength > 40).

### C. Online: “Parameter Tuner and Bandit change behavior”

- **Parameter Tuner:** Check `bayesian-tuner-state.json` (or equivalent) and `tuned-config.json` after many trades; thresholds should differ from defaults and `adjustmentHistory` should show updates with reasons.
- **Weight Bandit:** Check `weight-bandit-state.json`; source weights should diverge from initial values and reflect which sources contributed to wins/losses.

So the proof for “can adjust” is: (1) offline validation script shows that applying suggested_tuning improves a metric on historical data, and (2) online state files show that the tuner and bandit actually change parameters over time.

---

## 4. Summary

- **Essential parameters** ML adjusts: min strength/confidence (offline + online), signal quality threshold, TP/SL multipliers, position size multiplier, source weights (online).
- **Chain:** Data (Feature Store) → Training / Tuner / Bandit → `training_metadata.json` or `dynamicConfig` → applied in `evaluateAndTrade()` and `openTrade()`.
- **Proof that ML logic can improve the algo:**
  1. Run `validate_ml_improvement.py` on your feature store; if filtered win rate (with suggested_tuning) is higher than baseline, that demonstrates that ML-derived thresholds improve selectivity on that data. The script also prints holdout_metrics from the last training run when available.
  2. Run `test_train_models.py` to show training produces models, metadata (including improvement_report.holdout_metrics), and that sample-weight and hyperparameter-tuning paths run successfully.
  3. Inspect tuner and bandit state after many trades to show online parameter updates.

For a one-command “proof” on real or synthetic data, run the validation script (and optionally the training test) as above.
