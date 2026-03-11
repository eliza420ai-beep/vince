# Post-mortem: ANTHROPIC long (stop_loss)

**Date:** 2026-02-28

## Trade Snapshot

- ANTHROPIC long closed stop_loss: entry $530.35 -> exit $515.12, P&L $-73.73 (2524.156391887801 USD, 3x).
- Entry time (UTC): 2026-02-27T18:06:28.600Z
- Hold window target: intraday
- Max loss budget: $37.86 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 119 minutes
- Adverse move: 2.871%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter vs. exit (date/time)? What was CT sentiment on ANTHROPIC at entry and exit — was it a crowded trade or contrarian? Did macro (Fed, BTC, AI narrative) shift between those points?

**General take:** If you entered into frothy AI hype and exited into a sentiment dump, that's a timing miss on the macro/narrative layer — my lane would flag whether CT was overbought going in. If sentiment stayed stable and price just ran, that's execution/sizing (Solus' lane). Need the timestamp and vibe snapshot to give you real feedback.

Confidence: 0.3 (too much missing to assess sentiment's role in the loss).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing critical context:** I need the trade date/time, which Polymarket(s) you were tracking for ANTHROPIC sentiment, and whether this was a regime shift (macro pivot, earnings surprise, competitor news). Without that, I can't tell you if the market repriced faster than the prediction markets signaled, or if you got caught in noise.

**What I can say:** A $73 loss on 3x leverage suggests tight stops—good risk discipline. If ANTHROPIC prediction-market odds didn't flash the repricing before your exit, that's a discovery gap we should close (were you watching the right markets?). If they *did* signal it and you got stopped anyway, that's a regime/volatility call, not an odds problem.

**Next move:** Pull the trade timestamp and send me which Polymarket conditions you were monitoring. I'll cross-check the price action against prediction-market flow to see if there

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage ratio (3x noted but unclear if that's your intent or a platform default), position duration (hours? days?), and what triggered the stop—was it a clean invalidation or noise? That said: **3x on a single equity trade is aggressive for your paper bot's edge-building phase.** If ANTHROPIC was a thesis play (AI infra conviction), 1-2x with a wider stop teaches the bot better; if it was short-term momentum, the sizing is OK but the stop at -2.8% is tight for equities (expect 3-5% noise). **For next trade: match leverage to conviction level and timeframe—thesis plays 1x, momentum 2x max, and widen stops by asset class.** 

Confidence: 0.6 (mechanics only; missing trade rationale and bot parameters).

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

- Quality score: 87/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 87
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 87,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 119,
  "adverseMovePct": 2.871,
  "echoContext": {
    "entryTimestampUtc": "2026-02-27T18:06:28.600Z",
    "exitTimestampUtc": "2026-02-27T20:05:33.552Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-02-27T18:06:28.600Z",
    "exitTimestampUtc": "2026-02-27T20:05:33.552Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 37.86,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
