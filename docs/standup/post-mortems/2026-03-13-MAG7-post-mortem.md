# Post-mortem: MAG7 long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- MAG7 long closed stop_loss: entry $60.91 -> exit $59.97, P&L $-89.13 (5564.50909090909 USD, 5x).
- Entry time (UTC): 2026-03-13T13:30:44.891Z
- Hold window target: intraday
- Max loss budget: $83.47 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 257 minutes
- Adverse move: 1.552%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context:** I need to know *when* you entered and exited (dates/times). Was this before or after a major CT sentiment shift? Did whale accounts or alpha accounts flip bearish on MAG7 while you were in? A $89 stop on a $60 entry suggests tight risk—sentiment can whip intraday, especially on mega-cap tech. Without the timeline, I can't tell if CT saw the risk before price did or if this was just volatility noise.

**Confidence: 0.3**

(Once you give me entry/exit timestamps, I can run X_PULSE for that period and tell you if sentiment was warning or if the move was just technical.)

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: entry timestamp, exit timestamp, and what triggered the stop (volatility spike, macro news, or just time decay?). That said—a $89 loss on $5.5K notional (1.6% drawdown) on a 5x MAG7 long is tight risk management, which is good. To frame this properly: were Polymarket tech/mega-cap prediction odds moving against you during that window (e.g., recession fears, rate surprise), or was this pure intraday chop? If it's the latter, your stop worked as designed—you cut a mean reversion miss cleanly. If macro shifted, the edge wasn't there to begin with.

**Confidence: 0.4** (need timestamps + trigger event to give you real feedback on regime vs. execution).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, volatility regime at entry/exit, and whether this was a thesis trade or momentum play. That said, the **5x leverage on a $60 stock is aggressive for a $5.5K notional position**—even a 2% move (normal for MAG7 intraday) hits your stop. For equity paper trades, 2-3x max on thesis positions, or 1x for momentum. The loss structure is sound (stop executed cleanly), but **sizing into leverage without a multi-day thesis window guarantees you'll get stopped on noise**. Paste the entry thesis and timeframe, and I'll assess whether the structure was right for the bet.

**Confidence: 0.6** (mechanics clear, but trade intent unclear).

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
- Risk budget: planned=$83.47, realized=$89.13, slippage=$5.66, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 5.66
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
  "holdMinutes": 257,
  "adverseMovePct": 1.552,
  "riskBudget": {
    "plannedRiskUsd": 83.47,
    "realizedRiskUsd": 89.13,
    "riskSlippageUsd": 5.66,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.552,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T13:30:44.891Z",
    "exitTimestampUtc": "2026-03-13T17:47:42.860Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T13:30:44.891Z",
    "exitTimestampUtc": "2026-03-13T17:47:42.860Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 83.47,
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
