# Post-mortem: US500 short (max_age)

**Date:** 2026-03-13

## Trade Snapshot

- US500 short closed max_age: entry $668.49 -> exit $670.48, P&L $-6.34 (1821.3888 USD, 5x).
- Entry time (UTC): 2026-03-13T02:01:28.891Z
- Hold window target: intraday
- Max loss budget: $27.32 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.298%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (timestamps)? What was CT sentiment on US500/macro at entry and exit? Was there a news catalyst or macro shift between entry/exit?

**Directionally:** A $6.34 loss on a 5x short is tight risk management, but without knowing the sentiment backdrop (was CT euphoric going in? did macro narrative flip?), I can't assess whether you fought sentiment or got blindsided by a shift. If CT was already cautious on equities at entry, shorting into that consensus is low-alpha; if CT flipped bullish mid-trade, that's a real sentiment whip you should flag for next time.

**Confidence: 0.4** — I need timestamps and CT vibe at entry/exit to give you actionable feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was your edge thesis at entry (Polymarket probability vs your model)? Did US500 prediction markets show >55% for "up" at your entry, and did that flip before exit? A $2 move on 5x leverage is tight—if you entered on a Polymarket overreaction signal and exited on mean reversion without the underlying thesis breaking, that's a regime miss, not a sizing problem. Without the prediction-market frame (what Poly said vs spot price), I can't isolate whether this was a timing whiff or a model failure.

**Confidence: 0.3** — Need the Polymarket context and your entry thesis to give you real feedback.

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold duration, and whether this was a hedge or directional bet—critical for assessing if the loss was mechanical (bad sizing into resistance) or timing (caught in a momentum spike). **On mechanics:** $6.34 loss on a $668 short with 5x leverage means you got stopped or closed into a ~0.95% move against you—tight stop for index volatility, or you sized into resistance without confluence. **Sizing note:** $1.8K notional on a $100K stack is reasonable, but if this was a hedge against long equity, the loss suggests your hedge was sized too small or entered too late. **Call:** Review entry logic (was resistance tested?) and stop placement (0.95% too tight for US500 on 5x?)—tighten the process, not the stops.

**Confidence: 0.6** (missing entry context and hold

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
- Risk budget: planned=$27.32, realized=$6.34, slippage=$-20.98, breach=false
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
- PM_RISK_SLIPPAGE_USD: -20.98
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
  "adverseMovePct": 0.298,
  "riskBudget": {
    "plannedRiskUsd": 27.32,
    "realizedRiskUsd": 6.34,
    "riskSlippageUsd": -20.98,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.298,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T02:01:28.891Z",
    "exitTimestampUtc": "2026-03-13T14:01:40.875Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T02:01:28.891Z",
    "exitTimestampUtc": "2026-03-13T14:01:40.875Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 27.32,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
