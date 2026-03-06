# Post-mortem: BTC long (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- BTC long closed stop_loss: entry $72297.46 -> exit $71436.00, P&L $-37.99 (3059.7517241379305 USD, 3x).
- Entry time (UTC): 2026-03-04T23:33:40.140Z
- Hold window target: intraday
- Max loss budget: $35.58 (3.49%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 953 minutes
- Adverse move: 1.192%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing critical context:** What was CT's sentiment *during* your entry and exit? Was this a contrarian fade (CT euphoric = short setup) or a momentum follow (CT bullish = long setup)? The loss itself tells me nothing about whether sentiment was mispriced — I need the X vibe snapshot from entry time and whether whale accounts were aligned or diverging. Once you give me that, I can tell you if sentiment missed the signal or if you just got stopped into noise. **Confidence: 0.3** (can't assess without the sentiment frame).

### Oracle

- Lane: prediction market regime
- Confidence: 65%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

That's a tight stop on a $860 move—you got shaken out in noise, not a regime break. Missing: what was the Polymarket BTC price action at entry/exit, and did macro (Fed speakers, inflation data) shift the consensus that day? If Poly showed >55% on "BTC above $75K by [date]" at your entry but flipped <45% at exit, you were fighting repricing, not just volatility. If Poly stayed flat, you took directional risk without an edge signal—paper bot should weight prediction-market conviction (via POLYMARKET_EDGE_CHECK) before sizing. **Confidence: 0.65** (need the Poly context and trade thesis to dial this in).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** leverage (3x noted), hold time, and your invalidation thesis at entry—was this a directional bet or a range play that broke? **On mechanics:** $3,060 loss on 3x leverage across a $862 move is tight risk management (good), but if this was a weekly conviction trade, you're sizing too small relative to conviction—either the thesis was weak (skip next time) or you're under-leveraging a solid edge. **The call:** Post next week's paper trade with entry thesis + invalidation baked in, and I'll help you calibrate whether the stop was right or the size was wrong.

**Confidence: 0.6** (need more structure on your process to give better feedback).

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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 95/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$35.58, realized=$37.99, slippage=$2.41, breach=true
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

- PM_QUALITY_SCORE: 95
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 2.41
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 95,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 953,
  "adverseMovePct": 1.192,
  "riskBudget": {
    "plannedRiskUsd": 35.58,
    "realizedRiskUsd": 37.99,
    "riskSlippageUsd": 2.41,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.192,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.163,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-04T23:33:40.140Z",
    "exitTimestampUtc": "2026-03-05T15:26:20.784Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-04T23:33:40.140Z",
    "exitTimestampUtc": "2026-03-05T15:26:20.784Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.163,
    "maxLossUsd": 35.58,
    "maxLossPct": 3.49,
    "entryAtrPct": 1.162722513089005
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
