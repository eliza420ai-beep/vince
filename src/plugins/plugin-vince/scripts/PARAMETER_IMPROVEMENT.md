# Does Training on JSONL Clearly Identify Which Parameters to Improve?

**Short answer:** Running the script on feature-store JSONL **does** make the paper trading bot better over time by producing improved ONNX models (signal quality, position sizing, TP/SL). It **partially** identifies which parameters and weights matter—the script now also writes an **improvement report** that calls out specific levers. For the report to be actionable, you need to run the script regularly and use the report together with your rule-based config.

## True north: bot gets better over time with ML

The pipeline is:

1. **Paper trading** → writes feature records + outcomes to the Feature Store (JSONL).
2. **Train script** → reads JSONL, trains XGBoost models, exports ONNX + **improvement report**.
3. **Bot** → loads ONNX models (and optional fallback thresholds); ML inference replaces or augments rule-based decisions.

So **yes**: running the script on the JSONL files is part of how the paper trading bot gets better over time. The models directly affect:

- **Signal quality** – whether to take/boost/dampen a signal (replaces or augments fixed thresholds).
- **Position sizing** – multiplier on base size (replaces or augments fixed min/max %).
- **TP optimizer** – which take-profit level to favor (replaces or augments fixed TP multipliers).
- **SL optimizer** – estimate of max adverse excursion (informs stop placement when label is present).

## What the script does *not* do by default (and what we added)

By default the script does **not** print a clear, human-readable list like “raise signal quality threshold to 0.65” or “TP level 2 underperforms.” It only produced ONNX files and a small metadata JSON.

To better support the goal of **identifying which parameters and weights can and must be improved**, the script now:

1. **Writes an improvement report** (see below) so you can see:
   - Which **features** each model relies on (feature importances).
   - A **suggested signal-quality threshold** from the trained classifier (for fallback or tuning).
   - **TP level performance** (win rate / count per level) so you know which levels to favor or avoid.
   - Short **action items** (parameters to review).

2. **Uses the same data you care about**: labels come from your paper-trade outcomes (`profitable`, `rMultiple`, `optimalTpLevel`, and when available `maxAdverseExcursion` from the feature store).

So: running the script on the JSONL files **does** help you improve the bot over time, and the **improvement report** is there to make “which parameters and weights can and must be improved” more explicit and actionable.

## Which data points influenced the bot to open long or short?

To make that explicit and part of the improvement flow:

1. **At open time** the feature store now records **`decisionDrivers`**: the human-readable reasons/factors (e.g. “Extreme funding: longs paying 0.05%”, “Cascade: $2M liquidated”) that led to opening that long or short. Those are the same `signal.factors` / `signal.reasons` produced by the aggregator.
2. **In the JSONL** each record can include `decisionDrivers` (and the loader also accepts `signal.factors` for older data). So the data points that influenced each open are persisted and available for training.
3. **In the improvement report** the first section is **“Decision drivers that influenced opens (long / short)”**: it summarizes the most common reasons that led to long opens vs short opens. That ties “which data points influenced the bot” directly to the same report you use to improve the algo with train_models.

So the flow is: **open decision** → **decisionDrivers + features stored** → **JSONL** → **train_models** → **improvement report** (decision drivers + feature importances + action items). Improving the algo then means tuning how those drivers and features map to outcomes.

## How to use the improvement report

After each run you get:

- **`training_metadata.json`** – includes an `improvement_report` section (decision drivers by direction, feature importances, suggested threshold, TP level stats, action items).
- **`improvement_report.md`** – same content in markdown for quick reading.

Use them to:

- **Rule-based fallbacks**: The ML inference service reads `training_metadata.json` on startup and, when `improvement_report.suggested_signal_quality_threshold` is present, uses it for fallback logic and exposes it via `getSignalQualityThreshold()`. The signal aggregator uses this threshold for the "low ML quality" cutoff (instead of the static `minMLQualityScore`). So after each training run, the next agent restart applies the suggested threshold automatically.
- **Parameter tuner** (e.g. min strength/confidence): cross-check with **feature importances**; if “signal_strength” or “signal_confidence” are top for signal quality, those thresholds are good candidates to tune.
- **TP/SL design**: use **tp_level_performance** to see which levels are worth emphasizing; use SL model and labels when you have `maxAdverseExcursion` in the feature store.

## What still has to be true for this to work

1. **Enough closed trades** – Feature Store must record outcomes; you need at least `--min-samples` completed trades (default 100) for training to run meaningfully.
2. **Labels in JSONL** – Records must include `outcome` and `labels` (and for SL, outcome `maxAdverseExcursion` or equivalent so the script can derive `label_maxAdverseExcursion`).
3. **Deploying the new models** – Copy the new ONNX files to the bot’s model directory (e.g. `.elizadb/vince-paper-bot/models/`) and restart so the bot uses the updated models.
4. **Optional: use the report in code** – The Parameter Tuner or dynamic config could later read `training_metadata.json` and apply suggested thresholds automatically; for now the report is for human review and manual tuning.

## Summary

| Question | Answer |
|----------|--------|
| Will running the script on JSONL help the paper trading bot get better over time? | **Yes.** It produces ONNX models that the bot uses for signal quality, position sizing, and TP/SL. |
| Will it clearly identify which parameters and weights can and must be improved? | **Partially by default; explicitly with the improvement report.** The report highlights feature importances, a suggested signal-quality threshold, TP level performance, and action items so you know which parameters to adjust. |
| True north: bot gets better with ML? | **Yes.** Train regularly on new JSONL, deploy new ONNX models, and use the improvement report to tune rule-based parameters and thresholds. |
