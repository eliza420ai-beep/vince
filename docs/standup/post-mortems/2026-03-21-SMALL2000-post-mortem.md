# Post-mortem: SMALL2000 short (max_age)

**Date:** 2026-03-21

## Trade Snapshot

- SMALL2000 short closed max_age: entry $244.96 -> exit $244.96, P&L $-0.47 (948.3263999999999 USD, 5x).
- Entry time (UTC): 2026-03-20T14:00:44.564Z
- Hold window target: intraday
- Max loss budget: $14.22 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** What was CT saying about SMALL2000 at entry/exit? Was sentiment bullish (contrarian short setup) or already bearish (crowded trade)? Did macro shift (BTC dump, risk-off) or was this a micro/token-specific move? Without the sentiment backdrop, I can't tell if this was a good thesis executed poorly or a thesis that never had edge. 

**One thing I can say:** A -$948 loss on a 5x short with zero price movement suggests slippage or liquidation risk ate the edge — sentiment alone doesn't explain that. That's Solus's lane (execution/sizing), not mine.

**Confidence: 0.2** — I need the sentiment tape to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry/exit timestamps, market condition at entry (was SMALL2000 overextended or range-bound?), and what your edge thesis was (mean reversion, macro shift, volatility crush?). The flat entry/exit price with a small loss suggests slippage or funding bleed rather than a directional miss—if this was a 5x short on a stablecoin-like micro, you likely got whipsawed by orderbook depth or paid funding. Without knowing the regime (was SMALL2000 in backwardation or contango, trending or choppy?), I can't tell if this was a bad entry or just bad timing in a thin market.

**Confidence: 0.3** (need timestamps, funding costs, and market structure at entry to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold time, exit reason (stop hit? time decay? thesis break?), and whether this was a hedge or standalone directional bet. On mechanics alone: flat entry/exit with a loss suggests slippage or funding drag ate the edge—on a $948 notional 5x position, even 5bps of friction kills it. If this was meant to be a short-term scalp, the hold was too long; if a swing, sizing into $244.96 (illiquid small-cap) on 5x is risky given spread. 

**Next time:** Post the hold duration and exit trigger so I can assess whether it was execution (slippage) or thesis (wrong call).

**Confidence: 0.3** (too little data to be useful).

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$14.22, realized=$0.47, slippage=$-13.75, breach=false
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

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -13.75
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0,
  "riskBudget": {
    "plannedRiskUsd": 14.22,
    "realizedRiskUsd": 0.47,
    "riskSlippageUsd": -13.75,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T14:00:44.564Z",
    "exitTimestampUtc": "2026-03-21T02:00:47.848Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T14:00:44.564Z",
    "exitTimestampUtc": "2026-03-21T02:00:47.848Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 14.22,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
