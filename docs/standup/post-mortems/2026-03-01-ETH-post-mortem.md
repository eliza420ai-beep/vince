# Post-mortem: ETH long (stop_loss)

**Date:** 2026-03-01

## Trade Snapshot

- ETH long closed stop_loss: entry $1980.20 -> exit $1963.40, P&L $-47.18 (5252.253995571022 USD, 10x).
- Entry time (UTC): 2026-03-01T18:26:54.589Z
- Hold window target: intraday
- Max loss budget: $39.94 (7.60%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 55 minutes
- Adverse move: 0.848%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment at entry vs. exit? Was there a macro event (Fed speak, BTC dump, liquidation cascade) that triggered the stop, or pure technicals?

**On the trade itself:** A $47 stop on a $1980 entry is tight (2.4% buffer) — if CT was mixed-to-bearish on ETH at entry, that's a tough spot. The size (10x) amplifies any noise. Without knowing the sentiment backdrop, I can't tell if this was a "CT got it wrong" or "you were early into real bearish flow."

**What I need:** Entry timestamp + what X was saying about ETH/macro at that moment. Then I can tell you if sentiment was warning or if this was just volatility eating a tight stop.

Confidence: 0.3 (incomplete picture).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing critical context:** ETH/USD entry/exit timestamps, which Polymarket regime (macro, volatility, options expiry) was live, and whether this trade was sized against a specific options strike or macro hedge. That said: a $47 stop on a $1,980 entry (2.4% drawdown on 10x) is tight for ETH's typical intraday range—if you hit that in a low-volume window or against a liquidation cascade, the regime was likely choppy/mean-reverting rather than directional. Check whether ETH options (weekly puts, calls) were pricing tail risk that day; if IV was elevated and spot was consolidating, Polymarket macro markets (e.g., ETH price by Friday) would've shown low conviction, which matches a whipsaw close. **Recommendation:** Pull the 15m candles and compare to Polymarket orderbook depth at entry

### Solus

- Lane: options mechanics and sizing
- Confidence: 70%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold time, liquidation distance, and what triggered the stop (momentum shift vs. structural break). That said: **10x leverage on a $47 loss suggests tight stops—good discipline, but the position sizing (notional ~$52K on $5K stack) is aggressive for a paper bot learning edge.** If this was a scalp (hours), the structure is sound; if it was a swing (days+), you're fighting slippage and funding on thin margin. **Move:** Log hold time and reason for exit, then compare win/loss ratio across 10+ trades before scaling leverage. Confidence: 0.7

## Root-Cause Tags

- Primary: sizing_too_aggressive
- Secondary: stop_too_tight_for_vol

## Corrective Actions

1. [immediate] owner=vince due=next_trade
   - action: Cap leverage on this asset class and widen stop to volatility-adjusted range before next entry.
   - success_metric: Next trade includes complete PTQG fields and no missing_data flags.
   - rollback: If signal quality drops for 10+ trades, review cap thresholds.
2. [policy] owner=sentinel due=72h
   - action: Add weekly guardrail review for repeated root-cause tags by asset class.
   - success_metric: Post-mortems with pmevCompletenessPct >= 90% over rolling 7 days.
   - rollback: If operational overhead causes missed trades, reduce required manual fields.
3. [experiment] owner=solus due=7d
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 94/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 94
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 94,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 55,
  "adverseMovePct": 0.848,
  "echoContext": {
    "entryTimestampUtc": "2026-03-01T18:26:54.589Z",
    "exitTimestampUtc": "2026-03-01T19:21:48.722Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-01T18:26:54.589Z",
    "exitTimestampUtc": "2026-03-01T19:21:48.722Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.76,
    "maxLossUsd": 39.94,
    "maxLossPct": 7.6,
    "entryAtrPct": 1.5208376963350785
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
  "regimeVsExecution": "execution_miss"
}
```
