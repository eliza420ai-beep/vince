# Post-mortem: COPPER long (max_age)

**Date:** 2026-03-14

## Trade Snapshot

- COPPER long closed max_age: entry $5.72 -> exit $5.71, P&L $-8.90 (3854.651162790697 USD, 5x).
- Entry time (UTC): 2026-03-14T01:31:04.801Z
- Hold window target: intraday
- Max loss budget: $57.82 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.181%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (timestamps)? What was CT sentiment on COPPER during that window — was there a macro shock, whale dump, or shift in narrative? Without the timing and sentiment backdrop, I can't tell if this was a sentiment mispricing that failed to resolve or just bad timing on a sound thesis.

**What I'd need to give you real feedback:** Run an X_PULSE on COPPER for the entry/exit period so I can see if CT was pricing in the move or if sentiment diverged from price action.

Confidence: 0.3 (incomplete data)

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

I need the Polymarket odds for COPPER at entry and exit to give you regime context—was the market pricing a different outcome than your thesis, or did sentiment shift? Missing: entry/exit timestamps, what catalyst you expected, and whether volume was thin (which would explain slippage on a 5x). Without those, I can only say a $0.01 move on a leveraged micro-cap commodity is noise-level, but if you were trading a real edge in Poly odds, the loss suggests either timing (you caught a dead cat bounce) or the market repriced faster than your setup. 

**Confidence: 0.3** — need Polymarket context to diagnose whether this was regime shift, poor entry, or just volatility tax.

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry/exit timestamps (was this a hold or scalp?), what triggered the exit (stop, target, discretion?), and whether this was part of a broader COPPER thesis or a standalone trade. On mechanics alone: $8.90 loss on a $5.72 entry across 3.8K notional at 5x is tight—suggests either slippage on entry/exit or a whipsaw through a tight stop. If this was meant to be a swing, the 1.75¢ move (0.3%) got stopped out by execution friction; if a scalp, sizing at 5x for that tight a range was overlevered. **Next time:** clarify intent (swing vs scalp) and size accordingly—swings need wider stops or lower leverage; scalps need tighter entries or higher conviction.

**Confidence: 0.6** (need trade intent

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

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$57.82, realized=$8.90, slippage=$-48.92, breach=false
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

- PM_QUALITY_SCORE: 79
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -48.92
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 79,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.181,
  "riskBudget": {
    "plannedRiskUsd": 57.82,
    "realizedRiskUsd": 8.9,
    "riskSlippageUsd": -48.92,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.181,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-14T01:31:04.801Z",
    "exitTimestampUtc": "2026-03-14T13:31:09.370Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-14T01:31:04.801Z",
    "exitTimestampUtc": "2026-03-14T13:31:09.370Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 57.82,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
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
