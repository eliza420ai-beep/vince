# Post-mortem: META short (max_age)

**Date:** 2026-03-14

## Trade Snapshot

- META short closed max_age: entry $610.53 -> exit $611.16, P&L $-2.55 (1663.003782945736 USD, 5x).
- Entry time (UTC): 2026-03-14T01:31:37.989Z
- Hold window target: intraday
- Max loss budget: $24.95 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.104%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (timestamps)? What was CT sentiment on META at entry and exit? Was there a macro event (Fed speak, earnings surprise, tech sector rotation) that shifted the vibe between those two points?

**On the trade itself:** A 6bp loss on a 5x short suggests you got shaken out on noise rather than a real directional break — typical for tight stops in low-volatility consolidation. If CT was neutral-to-bullish on META during your hold, that's your answer: you were fighting consensus.

**What I'd need to give you real feedback:** X sentiment snapshot at entry + exit timestamps, so I can tell you if you missed a macro shift or just got caught in chop while the crowd was indifferent.

**Confidence: 0.4** (can't assess sentiment/macro without timestamps and CT vibe data).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was your entry thesis (Polymarket odds vs fair value, or pure technicals)? Did META's Polymarket prediction markets move against you pre-exit, or was this pure perp liquidation pressure?

**On the trade itself:** A $2.55 loss on a 5x short at that size suggests tight stop or forced exit—regime-wise, META's been range-bound in prediction markets (election/antitrust uncertainty), so shorting into that chop without a catalyst edge is friction-heavy. If you shorted on Poly odds diverging from spot, the real question is whether the odds were *actually* mispriced or you caught a micro-reversal. Next time: pull live Polymarket odds at entry and exit to see if the prediction market confirmed your thesis or contradicted it.

**Confidence: 0.6** (I don't have your entry thesis or Poly

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** entry time/date, exit time/date, IV environment at entry vs exit, and whether this was a hedge or standalone directional bet. On mechanics: $610→$611 is 10bps move against you on 5x leverage = $2.55 loss on $1,663 notional — sizing is tight but math is clean. **The real question:** was this a 5-min scalp (expected tighter stops, higher hit rate needed) or a swing (should've had wider invalidation)? Without timeframe and thesis, can't assess whether the structure was sound or the bet was undersized for the holding period. **Call:** Paste entry/exit timestamps and what you were betting on — then I can tell you if the sizing matched the edge.

Confidence: 0.4

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$24.95, realized=$2.55, slippage=$-22.40, breach=false
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

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -22.4
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.104,
  "riskBudget": {
    "plannedRiskUsd": 24.95,
    "realizedRiskUsd": 2.55,
    "riskSlippageUsd": -22.4,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.104,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-14T01:31:37.989Z",
    "exitTimestampUtc": "2026-03-14T13:31:39.021Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-14T01:31:37.989Z",
    "exitTimestampUtc": "2026-03-14T13:31:39.021Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 24.95,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
