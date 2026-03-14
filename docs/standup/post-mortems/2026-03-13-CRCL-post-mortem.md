# Post-mortem: CRCL long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- CRCL long closed stop_loss: entry $115.42 -> exit $113.60, P&L $-75.02 (4603.882517482518 USD, 5x).
- Entry time (UTC): 2026-03-13T14:48:22.237Z
- Hold window target: intraday
- Max loss budget: $69.06 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 182 minutes
- Adverse move: 1.579%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on CRCL at entry vs. exit? Was there a macro catalyst (Fed, BTC dump, sector rotation) that shifted the vibe between those two points?

Without the sentiment snapshot at your entry and the shift that triggered the stop, I can't give you a real post-mortem—I can't tell if CT missed a red flag, if macro killed it, or if it was just tight stops on low liquidity. Pull the timestamps and I'll run a vibe check on those exact moments.

**Confidence: 0.2** (not my domain without the data).

### Oracle

- Lane: prediction market regime
- Confidence: 62%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: entry/exit timestamps, whether this was a reaction trade or thesis-driven, and what the Polymarket odds were at entry vs. exit for CRCL-related events. That said: a $75 stop on a $115 entry (65 bps) is tight for a 5x levered perp in a volatile micro-cap regime—you likely got shaken out on noise rather than thesis break. If CRCL had active prediction markets (earnings, token unlock, regulatory event), cross-checking Poly odds at entry would tell you if the market repriced against you or if it was just perp liquidation cascades. Next time, check whether the Polymarket consensus shifted before taking the stop, or widen the stop to match the event uncertainty window.

Confidence: 0.62

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, and what triggered the stop (market move vs thesis break?). On mechanics alone: 5x leverage on a $115 stock with a $1.82 stop (1.58% risk) is tight—you're taking micro-moves as losses instead of noise. If this was a 1-2 day hold, the structure is sound (small risk, defined exit); if it was hours, you're fighting slippage and bid-ask spread more than thesis. For paper bot tuning: widen stops to 2-3% or reduce leverage to 2-3x to let thesis breathe, or confirm the entry was conviction-level (not just "looks bullish").

**Confidence: 0.65** (need hold duration and entry rationale to assess if stop placement was strategic or reactive).

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
- Risk budget: planned=$69.06, realized=$75.02, slippage=$5.96, breach=true
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

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 5.96
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 182,
  "adverseMovePct": 1.579,
  "riskBudget": {
    "plannedRiskUsd": 69.06,
    "realizedRiskUsd": 75.02,
    "riskSlippageUsd": 5.96,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.579,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T14:48:22.237Z",
    "exitTimestampUtc": "2026-03-13T17:50:46.402Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T14:48:22.237Z",
    "exitTimestampUtc": "2026-03-13T17:50:46.402Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 69.06,
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
