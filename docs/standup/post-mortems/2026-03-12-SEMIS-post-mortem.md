# Post-mortem: SEMIS long (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- SEMIS long closed max_age: entry $398.02 -> exit $395.57, P&L $-9.95 (1494.6471849056604 USD, 5x).
- Entry time (UTC): 2026-03-12T01:29:30.539Z
- Hold window target: intraday
- Max loss budget: $22.42 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.615%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

I'd need to know: **when did you enter and exit?** (Was this during a CT bearish spike on tech/macro? Did you exit into strength or capitulation?) and **what was the macro backdrop?** (Fed speak, yields, risk-off day?). SEMIS are sentiment-heavy — if you entered into frothy CT euphoria and exited into fear, that's a timing/macro read miss, not a sentiment signal failure. Without the timestamp and macro context, I can't tell if CT was actually bullish on semis at entry or if you were fighting headwinds.

**Confidence: 0.3** (need more data to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: entry/exit timestamps, Polymarket SEMIS prediction at those points, and whether this was a counter-trend scalp or directional hold. That said: a $9.95 loss on $1.5K notional (5x) across a $2.45 move suggests tight stops in a choppy regime—if Poly had SEMIS bullish >60% at entry and you caught a liquidation cascade or macro sell-off, the trade was well-sized but caught a tail move. Without the timing and market probability snapshot, I can't say if this was regime miss (you were right, market repriced) or execution miss (you entered into resistance). Pull the Poly odds at your entry timestamp and we can triangulate whether the market was pricing against you from the jump.

**Confidence: 0.4** (regime assessment requires Polymarket context and trade timestamps).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, IV/vol regime at entry vs exit, and whether this was a scheduled rebalance or a stop-loss exit. That said: **$9.95 loss on a 5x leveraged $1.5K position is acceptable slippage on a micro trade**, but the real question is whether you sized it to *learn* or to *profit*—if it's paper bot calibration, this is noise; if it's a live-fire test of your SEMIS thesis, you need to know whether the thesis broke or just got unlucky on timing/entry. Check: did SEMIS fundamentals change, or did you just get shaken out of a good setup? Confidence: **0.65** (sizing is reasonable for paper, but without entry logic and hold time, can't assess whether this was a structure problem or just variance).

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$22.42, realized=$9.95, slippage=$-12.47, breach=false
- Consistency checks: pass

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.
- No automatic policy mutation due to data/quality gate.

## Recursive Policy Delta

- Adaptation eligible: false
- Policy version at entry: baseline
- Proposed delta: none

## Machine-Readable Summary

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -12.47
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.615,
  "riskBudget": {
    "plannedRiskUsd": 22.42,
    "realizedRiskUsd": 9.95,
    "riskSlippageUsd": -12.47,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.615,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T01:29:30.539Z",
    "exitTimestampUtc": "2026-03-12T13:29:48.619Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T01:29:30.539Z",
    "exitTimestampUtc": "2026-03-12T13:29:48.619Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 22.42,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
