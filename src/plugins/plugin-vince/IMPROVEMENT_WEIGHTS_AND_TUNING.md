# Improvement Report Weights & Tuning

Short reference for data-driven aggregator weights, Binance 451 handling, and threshold tuning.

## Improvement report → aggregator weights

**What:** After each ML retrain, `training_metadata.json` includes `improvement_report.feature_importances.signal_quality`. These feature importances are mapped to signal aggregator **source names** (e.g. `regime_bearish` → MarketRegime, `signal_hasWhaleSignal` → BinanceTopTraders). The plugin can use this to keep source weights data-driven so the agent improves as models retrain.

**How:**

- On plugin init, `improvementReportWeights.ts` looks for `training_metadata.json` under `.elizadb/vince-paper-bot/models` or `plugin-vince/models/`.
- It logs top signal_quality features and per-source importance.
- If **`VINCE_APPLY_IMPROVEMENT_WEIGHTS=true`**, it nudges `dynamicConfig` source weights toward the importance ratios (weights clamped 0.5–2.0; disabled sources stay at 0).

**Run manually (dry-run or apply):**

```bash
# From repo root
bun run src/plugins/plugin-vince/scripts/run-improvement-weights.ts

# From plugin-vince
bun run scripts/run-improvement-weights.ts
# or
bun run improvement-weights
```

Set `VINCE_APPLY_IMPROVEMENT_WEIGHTS=true` to apply; otherwise only logs.

**Tunables (in code):**

- Nudge formula: `suggested = current * (0.85 + 0.3 * (importance / maxImportance))`, then clamped to [0.5, 2.0]. Adjust the 0.85 and 0.3 in `improvementReportWeights.ts` if you want stronger/weaker alignment.
- Feature → source mapping: `FEATURE_TO_SOURCE` in `improvementReportWeights.ts`. Add new features there when the ML pipeline adds new signal_quality inputs.

---

## Binance 451 handling

**What:** Binance can return HTTP 451 (Unavailable For Legal Reasons). Repeated 451s are tracked; after a threshold the signal aggregator skips Binance so the rest of the pipeline keeps working.

**How:**

- `binance.service.ts`: on any 451, `record451()` increments `consecutive451Count`; on any 2xx, `recordSuccess()` resets it to 0.
- When `consecutive451Count >= CONSECUTIVE_451_DEGRADE`, `isDegraded()` returns true.
- `signalAggregator.service.ts` (Phase 1): if `binanceService?.isDegraded()`, it skips Binance and adds `"Binance (451 degraded)"` to `triedNoContribution`.

**Tunable:**

- `CONSECUTIVE_451_DEGRADE` in `binance.service.ts` (default **3**). Increase to tolerate more 451s before degrading; decrease to degrade sooner.

---

## Threshold tuning (more sources contributing)

Relaxed so more sources contribute factors more often:

| Source                 | Threshold (before → after)                                                              |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Binance Top Traders    | long: > 65 → **> 62**; short: < 35 → **< 38**                                           |
| Binance Taker Volume   | long: > 1.3 → **> 1.25**; short: < 0.7 → **< 0.75**                                     |
| Binance L/S Ratio      | long crowded: > 1.5 → **> 1.4**; short crowded: < 0.67 → **< 0.72**                     |
| News (bullish/bearish) | confidence > 50 → **≥ 45**                                                              |
| Liquidation Pressure   | intensity > 40 → **> 35**                                                               |
| Deribit IV Skew        | fearful/bullish only → **+ neutral** (weak factor when skew neutral)                    |
| Deribit Put/Call       | > 1.3 / < 0.7 → **> 1.2 / < 0.82**                                                      |
| MarketRegime           | non-neutral only → **+ neutral + volatile** (weak factors so regime always contributes) |
| Sanbase Flows/Whales   | accumulation/distribution, bullish/bearish only → **+ neutral** (weak factor)           |

Defined in `signalAggregator.service.ts`. News contributes when sentiment is neutral with confidence ≥ 40.

---

## Tests and scripts

- **Unit test:** `src/__tests__/improvementReportWeights.test.ts` — `sourceImportancesFromReport` mapping and `logAndApplyImprovementReportWeights(false)` no-throw.
- **Script:** `scripts/run-improvement-weights.ts` — dry-run or apply from CLI.
