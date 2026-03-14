# Post-mortem: CRCL long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- CRCL long closed stop_loss: entry $115.28 -> exit $113.50, P&L $-29.85 (1869.7208818272095 USD, 5x).
- Entry time (UTC): 2026-03-12T15:05:54.983Z
- Hold window target: intraday
- Max loss budget: $28.05 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 63 minutes
- Adverse move: 1.547%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: lane_coverage_gap

**Missing context:** Was this trade thesis built on CT sentiment divergence (WTT output), or was it a standalone TA/macro call? I need to know if the sentiment setup broke or if it was never there to begin with — that's the only way I can assess whether CT mispriced CRCL or if the trade was outside my lane from day one.

If it *was* a WTT trade: I'd want to see the original sentiment score, whale positioning at entry, and whether CT flipped bearish into your exit (which would tell us if sentiment killed it or if it was pure liquidation/market structure). Right now I can't tell if this is a sentiment failure or just execution/timing.

**Confidence: 0.2** — Need the setup origin to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

Missing key context: the timeframe (how long held?), what thesis drove the entry, and whether CRCL had active Polymarket positions pricing in a catalyst or reversal. A $1.78 move on 5x leverage is tight—suggests either a scalp that got shaken or a swing that lost conviction quickly. Without knowing if the market was repricing CRCL fundamentals or if you were fighting momentum, I can't isolate whether this was bad timing, bad sizing, or a legitimate thesis that just didn't play. Pull the Polymarket odds on CRCL if there's an active market—that'd show you what the crowd expected at entry vs. exit and flag whether you were fighting consensus or with it.

**Confidence: 0.3** (not enough regime/thesis data).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation for the long (support level? catalyst?), and did price break it cleanly or chop around it? 

**On mechanics:** $115.28 entry on CRCL with 5x leverage into a $1.87 stop is tight—only 1.6% buffer before liquidation risk spikes. If this was a mean-reversion or support bounce play, the stop should sit below structural support, not at noise. If it was a momentum breakout, you need wider conviction or smaller size. The $1,870 notional is reasonable for paper, but the leverage-to-stop ratio suggests either (1) conviction wasn't there, or (2) you sized for a tighter move than the asset typically allows.

**Call:** Widen stops to 2–3% of entry on 5x, or drop to 3x and keep the tight stop

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: unclear
- Risk budget: planned=$28.05, realized=$29.85, slippage=$1.80, breach=true
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
- PM_PRIMARY_CAUSE: agent_lane_mismatch
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 1.8
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "agent_lane_mismatch",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 63,
  "adverseMovePct": 1.547,
  "riskBudget": {
    "plannedRiskUsd": 28.05,
    "realizedRiskUsd": 29.85,
    "riskSlippageUsd": 1.8,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.547,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T15:05:54.983Z",
    "exitTimestampUtc": "2026-03-12T16:09:23.729Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T15:05:54.983Z",
    "exitTimestampUtc": "2026-03-12T16:09:23.729Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 28.05,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "lane_coverage_gap"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "unclear"
}
```
