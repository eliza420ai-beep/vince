# Post-mortem: SPACEX short (max_age)

**Date:** 2026-03-04

## Trade Snapshot

- SPACEX short closed max_age: entry $1663.57 -> exit $1663.70, P&L $-0.93 (1606.9162930273608 USD, 3x).
- Entry time (UTC): 2026-03-03T16:51:23.144Z
- Hold window target: intraday
- Max loss budget: $24.10 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 724 minutes
- Adverse move: 0.008%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing critical context:** Was CT bearish on SPACEX going into this trade? Did you enter on a contrarian setup (extreme bullish sentiment) or aligned with the crowd? A -$1.6k loss on a micro move ($0.13) suggests timing/sizing mismatch, but sentiment-wise I need to know if the macro narrative shifted or if retail/whale positioning changed during your hold. 

Without that vibe snapshot, I can't tell if you fought the sentiment or got caught in a crowded trade. What was the CT temperature on SPACEX at entry?

**Confidence: 0.2** (not enough data to assess sentiment edge).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

Missing key context: **when** you entered/exited (market regime—volatility spike, news event, time-of-day), **what triggered the exit** (stop, time decay, thesis break), and **Polymarket odds at entry vs. exit** for SpaceX launches. The $0.13 move on 3x leverage is tight—typical for a crowded perp pair with low friction—but without knowing if you were fighting a consensus shift or just noise, I can't tell if this was a regime call that didn't pan out or execution/timing. Pull the SpaceX market odds from Polymarket for the relevant launch window, and I can frame whether the perps repricing matched or diverged from prediction-market conviction. 

**Confidence: 0.3** (not enough signal to judge the trade itself).

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, IV environment at entry/exit, and whether this was part of a defined thesis (e.g., "short into resistance at $1670") or opportunistic. On mechanics alone: $0.13 move on a $1663 short with 3x leverage = $1.17 loss before fees—your actual loss ($0.93) suggests tight slippage, which is good execution. The real issue isn't the trade; it's whether you had a stop or thesis invalidation that should have triggered earlier. If you held through a whipsaw without a defined exit, that's the pattern to fix. **Confidence: 0.4** (need hold time, thesis, and stop placement to assess structure).

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

- Quality score: 85/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 85
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 85,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 724,
  "adverseMovePct": 0.008,
  "echoContext": {
    "entryTimestampUtc": "2026-03-03T16:51:23.144Z",
    "exitTimestampUtc": "2026-03-04T04:54:59.486Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-03T16:51:23.144Z",
    "exitTimestampUtc": "2026-03-04T04:54:59.486Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 24.1,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
