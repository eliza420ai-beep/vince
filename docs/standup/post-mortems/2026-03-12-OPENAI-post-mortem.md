# Post-mortem: OPENAI long (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- OPENAI long closed max_age: entry $925.33 -> exit $923.35, P&L $-3.03 (1151.465572173913 USD, 3x).
- Entry time (UTC): 2026-03-12T08:00:56.228Z
- Hold window target: intraday
- Max loss budget: $17.27 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.213%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (exact timestamps)? What was CT sentiment on OPENAI/tech at entry vs. exit? Was there a macro event (Fed speak, market shock, earnings) that shifted the vibe between those two points?

Without the timing and CT pulse around your entry/exit, I can't tell if you got caught in a sentiment flip or macro whipsaw. If this was intraday, CT moves fast — a single whale thread or macro headline can swing retail positioning in minutes. Pull the timestamps and I'll run X_PULSE for those windows to see if sentiment diverged from your thesis.

**Confidence: 0.3** (need data to be useful here).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id

I'd need the entry/exit timestamps and the Polymarket odds for OPENAI stock price at those moments to give you regime context—was this a mean-reversion scalp into overbought, or did macro shift the fair value? The $1.95 drawdown on 3x leverage is tight execution, but without knowing *when* you entered relative to market structure (volume, spread, news cycle), I can't tell if you got whipsawed by noise or if the thesis broke. Missing: entry/exit time, relevant Poly market condition_id and prices at those times, and what triggered the exit.

**Confidence: 0.3**

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** entry date, hold duration, IV environment at entry/exit, and whether this was part of a defined thesis (e.g. "AI infra dip-buy") or discretionary. On mechanics alone: 3x leverage on a $923 stock with $3.03 loss suggests tight stop or fast reversal—either the thesis broke immediately or position sizing was too aggressive for the conviction. **Call:** If this was a short-duration scalp, the loss is noise; if it was a multi-day thesis trade, re-examine entry timing (was IV/momentum against you?) and whether 3x was justified by edge. **Next:** Paste entry timestamp, hold time, and what triggered the exit—then I can assess whether this was execution error or thesis failure.

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

- Quality score: 77/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$17.27, realized=$3.03, slippage=$-14.24, breach=false
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

- PM_QUALITY_SCORE: 77
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -14.24
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 77,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.213,
  "riskBudget": {
    "plannedRiskUsd": 17.27,
    "realizedRiskUsd": 3.03,
    "riskSlippageUsd": -14.24,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.213,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T08:00:56.228Z",
    "exitTimestampUtc": "2026-03-12T20:01:25.905Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T08:00:56.228Z",
    "exitTimestampUtc": "2026-03-12T20:01:25.905Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 17.27,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp",
      "condition_id"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
