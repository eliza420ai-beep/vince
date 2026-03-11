# How to trigger more HIP-3 paper trades

The paper bot evaluates **all 39 assets** (4 core + 35 HIP-3) each cycle when HIP-3 is enabled, but only opens when several gates pass. Below is why HIP-3 trades can be rare and **concrete levers** to increase them.

## Why HIP-3 trades are few

1. **Signal must be non-neutral**  
   The aggregator uses weighted votes; direction is long/short only when one side leads by a margin (`voteDifference`). A single strong HIP-3 source (e.g. HIP3Momentum) is usually enough to set direction.

2. **At least one primary source**  
   HIP3Momentum, HIP3Funding, HIP3OIBuild, HIP3PriceAction, and WTT are primary. If none contribute for that asset, the bot skips it.

3. **Strength/confidence thresholds**  
   HIP-3 uses relaxed minimums (see `SIGNAL_THRESHOLDS.HIP3_MIN_STRENGTH` and `HIP3_MIN_CONFIDENCE` in `paperTradingDefaults.ts`). If the aggregated signal is below these, `validateSignal` rejects.

4. **Confirming count**  
   HIP-3 only needs 1 confirming source (core needs more). So this gate is already relaxed.

5. **Valid price**  
   `openTrade` needs a positive entry price; for HIP-3 there is a fallback via the HIP-3 service when market data returns 0.

6. **Risk limits**  
   Total exposure and per-position size must stay within limits (e.g. max 30% total, 10% per position).

## Levers to trigger more HIP-3 paper trades

| Lever | Where | Effect |
|-------|--------|--------|
| **Lower HIP-3 thresholds** | `paperTradingDefaults.ts` → `SIGNAL_THRESHOLDS.HIP3_MIN_STRENGTH` / `HIP3_MIN_CONFIDENCE` | More single-signal HIP-3 passes `validateSignal`. Defaults are tuned so modest 24h moves (e.g. 0.5%+) can pass; lowering (e.g. 45/40) allows more trades. |
| **Lower momentum gate** | `signalAggregator.service.ts` → HIP-3 block: `Math.abs(change) > 0.5` | More assets get a HIP3Momentum signal (e.g. 0.3% → any asset with |change24h| > 0.3% gets a signal). |
| **WTT daily pick** | What’s the Trade task produces one HIP-3-capable pick per day (e.g. GOOGL). | Ensures at least one HIP-3-style trade opportunity per day when the pick is HIP-3 and passes validation. |
| **Aggressive mode** | Runtime setting `vince_paper_aggressive=true` | Relaxes ML filters and position sizing; can allow more HIP-3 (and core) trades. |
| **Vote threshold (advanced)** | `signalAggregator.service.ts` → `voteDifference` | For HIP-3-only assets, a smaller `voteDifference` would make a single signal more likely to set direction; currently one strong HIP-3 signal usually suffices. |

## What we changed to help

- **HIP-3 thresholds** are set to 45 strength / 40 confidence so more HIP-3 signals pass validation.
- **Momentum gate** for HIP-3 is 0.3% (was 0.5%), so more assets get a HIP3Momentum primary signal.
- **HIP-3 price fallback** in `openTrade` uses the HIP-3 service when market data has no price.
- **WTT “traded today” guard** prevents duplicate opens of the same day’s pick.

After changes, run the bot and watch for:
- `[VincePaperTrading] HIP-3 signal: ASSET long|short | str=... conf=...`
- `[VincePaperTrading] HIP-3 trade passing validation: ASSET ...`
- `[VincePaperTrading] ... trade opened: long|short ASSET`

If you still see few HIP-3 opens, check logs for “no primary signal”, “strength/confidence below minimum”, or “SYMBOL VALIDATION FAILED” to see which gate is blocking.
