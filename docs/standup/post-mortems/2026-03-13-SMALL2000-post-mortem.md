# Post-mortem: SMALL2000 short (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- SMALL2000 short closed stop_loss: entry $245.61 -> exit $249.30, P&L $-14.77 (951.584170212766 USD, 5x).
- Entry time (UTC): 2026-03-13T08:22:10.968Z
- Hold window target: intraday
- Max loss budget: $14.27 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 214 minutes
- Adverse move: 1.502%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: lane_coverage_gap

**Feedback:**

SMALL2000 was a micro-cap play — sentiment on that ticker wouldn't have shown up in my CT pulse anyway, so I can't tell you if retail/whale positioning was against you. What I *need* to know: **Was this a contrarian setup (CT loved it, you shorted)? Or did you miss a bearish narrative that was building on X?** Without the sentiment context around entry, I can't flag whether you fought the crowd or got caught in a crowded short. The stop was tight ($3.69 range on a $245 entry) — that's execution, not sentiment.

**Confidence: 0.2** *(I'm outside my lane without the macro/CT vibe at entry time.)*

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id, market_name

**Missing context:** I need the market condition_id or name to pull live Polymarket odds—without that, I can't compare your entry/exit to what the market was pricing. That said, a $3.69 move (1.5%) on a 5x micro position hitting stop suggests tight risk management, which is sound. If SMALL2000 was a binary event (yes/no), check whether the market repriced sharply into your exit or if you got caught in intraday noise—that distinction tells you whether the regime shifted or you just got whipsawed. 

**To give you real feedback:** Share the market name and I'll pull the orderbook + volume context around your entry/exit times.

Confidence: 0.3 (without market data, this is pattern-matching only).

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, IV/volatility regime at entry vs exit, and whether this was part of a hedge or standalone directional bet. On mechanics alone: $951 notional on 5x leverage into a small-cap index is tight sizing (you're risking ~$15 on a $950 position), and the 1.5% move to stop suggests your invalidation was well-defined—that's good discipline. **The real question:** was this a paper bot test or a live trade signal? If paper, log it and iterate; if it was testing a live edge, rerun the setup 10x more before going live. **Confidence: 0.3** (can't assess structure without trade duration and regime).

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

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: unclear
- Risk budget: planned=$14.27, realized=$14.77, slippage=$0.50, breach=true
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
- PM_PRIMARY_CAUSE: agent_lane_mismatch
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 0.5
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 79,
  "qualityEscalate": false,
  "primaryCause": "agent_lane_mismatch",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 214,
  "adverseMovePct": 1.502,
  "riskBudget": {
    "plannedRiskUsd": 14.27,
    "realizedRiskUsd": 14.77,
    "riskSlippageUsd": 0.5,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.502,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T08:22:10.968Z",
    "exitTimestampUtc": "2026-03-13T11:56:40.789Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T08:22:10.968Z",
    "exitTimestampUtc": "2026-03-13T11:56:40.789Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 14.27,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "lane_coverage_gap"
    ],
    "Oracle": [
      "condition_id",
      "market_name"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "unclear"
}
```
