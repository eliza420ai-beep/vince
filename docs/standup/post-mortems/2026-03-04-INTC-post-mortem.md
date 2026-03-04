# Post-mortem: INTC long (stop_loss)

**Date:** 2026-03-04

## Trade Snapshot

- INTC long closed stop_loss: entry $43.57 -> exit $42.60, P&L $-113.63 (4973.7885260370695 USD, 5x).
- Entry time (UTC): 2026-03-03T16:51:21.004Z
- Hold window target: intraday
- Max loss budget: $74.61 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 621 minutes
- Adverse move: 2.235%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need to know *when* you entered (date/time) and the CT/macro sentiment *at that moment* — was INTC being discussed on X? Was there a macro headwind (rates, semis rotation, Fed event)? Without the timestamp, I can't tie sentiment to your entry thesis.

**What I can say:** INTC has been a perennial CT punching bag (foundry fears, geopolitical fab risk). If you caught a bounce into overhead resistance without a clear sentiment catalyst (earnings beat, geopolitical de-risk, semis rotation), the setup was fragile. A 5x lever on a counter-trend INTC move in a macro headwind is exactly where sentiment reversals bite hardest.

**Post-mortem:** Check if CT macro sentiment shifted *during* your hold (Fed speak, China news, rate expectations). That's usually where INTC longs

### Oracle

- Lane: prediction market regime
- Confidence: 35%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing critical context:** I need the trade date, duration held, and what triggered the stop—was it a wick or sustained breakdown? Also, what was the macro regime (Fed day, earnings, sector rotation)? 

**From Polymarket lens:** If this was during a risk-off window (tech selloff, rate spike), the stop made sense—paper bot should weight regime filters heavier. If it was a brief liquidity dip on light volume, that's a tuning miss: tighter stop or wider entry on micro-cap vol would've survived it.

**Direct take:** Without the timing, I can't say if this was *bad execution* or *bad entry signal*. Ask VINCE whether the model had regime flags live—if not, that's the lever.

Confidence: 0.35 (need trade timestamp and vol context to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 72%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing:** invalidation level (where was the hard stop?), catalyst window (earnings, macro event?), and position sizing relative to total paper capital. **Mechanics issue:** 5x leverage on a single-name tech stock in a choppy regime is aggressive for a paper bot—you're fighting slippage and bid/ask spread on entry/exit. If INTC was a thesis trade (not a scalp), the stop at $42.60 (2.2% loss) is tight; if it was a scalp, 5x is oversized for the expected move. **Call:** Tighten position sizing to 2-3x max on single names, widen stops to 3-5% for thesis trades, or cut leverage entirely if you're testing signal quality (not PNL). Confidence: 0.72.

## Root-Cause Tags

- Primary: regime_conflict
- Secondary: none

## Corrective Actions

1. [immediate] owner=vince due=next_trade
   - action: Require PTQG completion and explicit max-loss check before next entry.
   - success_metric: Next trade includes complete PTQG fields and no missing_data flags.
   - rollback: If signal quality drops for 10+ trades, review cap thresholds.
2. [policy] owner=sentinel due=72h
   - action: Add weekly guardrail review for repeated root-cause tags by asset class.
   - success_metric: Post-mortems with pmevCompletenessPct >= 90% over rolling 7 days.
   - rollback: If operational overhead causes missed trades, reduce required manual fields.
3. [experiment] owner=solus due=7d
   - action: A/B test defined-risk structure recommendation vs spot leverage entries.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 89/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 621,
  "adverseMovePct": 2.235,
  "echoContext": {
    "entryTimestampUtc": "2026-03-03T16:51:21.004Z",
    "exitTimestampUtc": "2026-03-04T03:12:12.908Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-03T16:51:21.004Z",
    "exitTimestampUtc": "2026-03-04T03:12:12.908Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 74.61,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
