# Post-mortem: SOL long (stop_loss)

**Date:** 2026-03-14

## Trade Snapshot

- SOL long closed stop_loss: entry $89.22 -> exit $87.04, P&L $-112.62 (4522.903963796161 USD, 3x).
- Entry time (UTC): 2026-03-13T09:38:41.935Z
- Hold window target: intraday
- Max loss budget: $180.92 (12.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 1441 minutes
- Adverse move: 2.44%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** What was CT sentiment on SOL at entry vs. exit? Was this a contrarian setup (CT bearish, you long) or consensus trade (CT bullish)? Did macro shift (BTC dump, Fed news) between entry and exit? Without the sentiment thesis, I can't tell if you fought the crowd or if the crowd turned on you mid-trade.

**Quick take:** A $112 loss on 3x SOL is tight risk management — the stop was tight. But if CT flipped bearish or macro deteriorated during your hold, that's a "sentiment changed, exit was right" vs. "got shaken out of a good setup" situation. Need the vibe at entry and exit to say which.

**Confidence: 0.3** — Not my lane without the sentiment context you were trading against.

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** SOL prediction-market odds at entry/exit (Polymarket SOL price bins), volume, and spread at those times—without that I can't tell if you were fighting consensus or if the market repriced on new info. **Regime read:** A $2.18 move (2.4%) on 3x is a normal intraday whipsaw; the stop was tight relative to volatility. **The ask:** Pull the Polymarket SOL price action and open interest during your trade window—if the market didn't move, you caught noise; if it repriced down, you were early or consensus shifted. That tells you whether to tighten stops, size down, or trust the edge longer.

**Confidence: 0.4** (need live Poly context to upgrade this).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

Stop hit at 2.4% drawdown on 3x leverage — tight but reasonable for SOL's volatility. Missing: entry thesis (support level? range break?), position hold time, and whether this was part of a larger hedge or standalone. If it was a solo long into resistance without a clear invalidation, the mechanics were sound but the setup selection may have been loose. **Confidence: 0.6** (structure OK, thesis unknown).

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

- Quality score: 77/100
- Escalate to Sentinel: true
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$180.92, realized=$112.62, slippage=$-68.30, breach=false
- Consistency checks: fail (stop_distance_mismatch)

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
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -68.3
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 77,
  "qualityEscalate": true,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 1441,
  "adverseMovePct": 2.44,
  "riskBudget": {
    "plannedRiskUsd": 180.92,
    "realizedRiskUsd": 112.62,
    "riskSlippageUsd": -68.3,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": false,
    "issues": [
      "stop_distance_mismatch"
    ],
    "adverseMovePctFromPrices": 2.44,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.688,
    "stopDistancePctDelta": 2.312,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T09:38:41.935Z",
    "exitTimestampUtc": "2026-03-14T09:40:08.910Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T09:38:41.935Z",
    "exitTimestampUtc": "2026-03-14T09:40:08.910Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 4,
    "maxLossUsd": 180.92,
    "maxLossPct": 12,
    "entryAtrPct": 5
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
