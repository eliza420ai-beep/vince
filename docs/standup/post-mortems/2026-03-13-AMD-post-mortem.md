# Post-mortem: AMD short (max_age)

**Date:** 2026-03-13

## Trade Snapshot

- AMD short closed max_age: entry $198.87 -> exit $199.22, P&L $-2.91 (1286.230779661017 USD, 5x).
- Entry time (UTC): 2026-03-13T00:22:17.845Z
- Hold window target: intraday
- Max loss budget: $19.29 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.176%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** Did you check CT sentiment on AMD before entry? Was there a macro catalyst (Fed speak, tech earnings, rate expectations) that shifted mid-trade? A $0.35 move against a short usually means either (1) retail/whale accumulation signal, or (2) broader tech rally you didn't hedge for. Without knowing if CT was bullish AMD going in, I can't tell if this was a sentiment miss or just tight stops on a macro headwind. **Confidence: 0.3** — I need the setup context to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id

**Missing context:** AMD condition_id from Polymarket (to check if prediction-market pricing diverged from spot), entry/exit timestamps (regime shift?), and whether this was a reversion trade or directional short. That said: **$35 move against you on a $5K position (5x) suggests you caught a momentum shift mid-trade—common in tech when macro sentiment flips.** Check if Polymarket's AMD-related markets (earnings, sector rotation) showed conviction shift at your exit; if they didn't, the spot move was noise and your entry thesis was sound. If they *did* reprrice, that's your signal the regime changed and you exited right.

**Confidence: 0.4** (need Poly context and timestamps to be precise).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry date, hold duration, and whether this was a hedge or standalone short. That said, the mechanics: $198.87→$199.22 is +0.18% move against you on 5x leverage = $1,286 notional loss on a $257 entry—reasonable stop if it was a tight risk-managed short, but the 1.4% loss on notional suggests either slippage on entry or a wider stop than intended. For AMD (low vol, tight spreads), 5x on a 0.18% move is aggressive sizing unless it was a defined hedge or part of a larger thesis rotation. **Next time:** paste entry timestamp, thesis duration (intraday/swing), and whether it was correlated to a long position—that context determines if the sizing was structurally sound or just unlucky.

**Confidence: 0.65** (need trade context

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
- Risk budget: planned=$19.29, realized=$2.91, slippage=$-16.38, breach=false
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
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -16.38
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
  "holdMinutes": 720,
  "adverseMovePct": 0.176,
  "riskBudget": {
    "plannedRiskUsd": 19.29,
    "realizedRiskUsd": 2.91,
    "riskSlippageUsd": -16.38,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.176,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T00:22:17.845Z",
    "exitTimestampUtc": "2026-03-13T12:22:37.098Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T00:22:17.845Z",
    "exitTimestampUtc": "2026-03-13T12:22:37.098Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 19.29,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
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
