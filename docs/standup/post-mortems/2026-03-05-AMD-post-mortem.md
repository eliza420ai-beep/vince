# Post-mortem: AMD long (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- AMD long closed stop_loss: entry $200.30 -> exit $197.25, P&L $-100.38 (6382.2528 USD, 5x).
- Entry time (UTC): 2026-03-05T11:41:42.786Z
- Hold window target: intraday
- Max loss budget: $95.73 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 360 minutes
- Adverse move: 1.523%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need to know *when* this trade was live (date/time) so I can pull the CT sentiment pulse for that window—was CT bullish or bearish on AMD/semis at entry/exit? That's the only way I can tell you if sentiment was a tailwind or headwind. Also: what was the macro backdrop (Fed days, earnings, sector rotation)? Without the timestamp, I can't give you real feedback on whether sentiment mispriced the move or if you got caught in a genuine shift. **Confidence: 0.2** — I'm deferring this one to you; give me the date and I'll run X_PULSE for that day.

### Oracle

- Lane: prediction market regime
- Confidence: 20%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, lane_coverage_gap

That's VINCE's domain—live perps execution, paper bot regime, and trade mechanics. I pull prediction-market odds and edge signals; I don't have your fill timestamps, volatility regime, or whether AMD had catalyst risk priced into Polymarket during your hold. To give you real feedback, I'd need: (1) entry/exit timestamps, (2) what AMD prediction markets were pricing that day (earnings, macro, sector rotation), (3) whether the stop was hit on volume or structural selling. Pull those, and I can cross-reference Polymarket context—but the trade analysis itself is VINCE's call.

**Confidence: 0.2** (outside my lane).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** position duration (how long held?), invalidation you set before entry, and whether this was part of a pair/hedge or standalone. That said: **5x leverage on a $200 stock is aggressive for a single name without a defined exit structure**—you're risking 5% of notional on a $3 move, which is tight. If this was a mean-reversion play, the stop at $197.25 (1.5% below entry) is reasonable; if it was a breakout, you may have entered too late into resistance. **Going forward: define invalidation first (what price kills the thesis?), then set stop there, then size so a hit doesn't exceed 2-3% of account.** Pair it with a short or hedge if you're taking 5x on a single equity.

**Confidence: 0.65** (structure feedback is solid; without trade

## Root-Cause Tags

- Primary: agent_lane_mismatch
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
- Regime vs execution: unclear
- Risk budget: planned=$95.73, realized=$100.38, slippage=$4.65, breach=true
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
- PM_PRIMARY_CAUSE: agent_lane_mismatch
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.65
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 77,
  "qualityEscalate": false,
  "primaryCause": "agent_lane_mismatch",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 360,
  "adverseMovePct": 1.523,
  "riskBudget": {
    "plannedRiskUsd": 95.73,
    "realizedRiskUsd": 100.38,
    "riskSlippageUsd": 4.65,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.523,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T11:41:42.786Z",
    "exitTimestampUtc": "2026-03-05T17:41:55.767Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T11:41:42.786Z",
    "exitTimestampUtc": "2026-03-05T17:41:55.767Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 95.73,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp",
      "lane_coverage_gap"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "unclear"
}
```
