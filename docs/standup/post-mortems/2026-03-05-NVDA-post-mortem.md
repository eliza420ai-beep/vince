# Post-mortem: NVDA long (max_age)

**Date:** 2026-03-05

## Trade Snapshot

- NVDA long closed max_age: entry $183.52 -> exit $182.58, P&L $-16.38 (2922.8032 USD, 5x).
- Entry time (UTC): 2026-03-05T00:25:56.108Z
- Hold window target: intraday
- Max loss budget: $43.84 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.51%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** Did CT have a bullish or bearish lean on NVDA/mega-cap tech into that entry? Was there a macro headwind (Fed speak, rate expectations, AI narrative shift) that you missed in the pre-trade pulse?

**On the loss itself:** A $16 stop on a $183 entry is tight for a 5x leveraged equity trade — sentiment can whip that in minutes. If CT was split or cooling on mega-cap AI (common lately), that's a yellow flag you'd want to catch pre-entry.

**What I'd need:** CT sentiment *at entry time* on NVDA specifically, and whether macro (yields, Fed, AI rotation) was shifting that day.

Confidence: 0.4 (not enough data to assess the sentiment angle properly).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing critical context:** I need the entry/exit *timestamp* and whether this was a directional bet or a hedge against options positioning. That said, the $1 move on 5x leverage is tight—if this was a quick scalp in low vol, slippage ate you; if it was a hold across a vol spike or earnings window, the regime shifted against you. Check whether Polymarket prediction markets (tech earnings, macro risk-on/off) signaled a reversal you missed, or whether the paper bot's entry was ahead of a vol contraction. Without timestamps and the broader portfolio context (were you short vega elsewhere?), I can't isolate whether this was model failure or bad timing.

**Confidence: 0.3**

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold time, invalidation thesis, and what triggered the exit (stop hit, thesis break, or time decay?). On mechanics alone: 5x leverage on a $183 stock with $16 drawdown is tight—you're risking ~9% notional on a single leg with no hedge, which violates our 10-20% position risk rule. If this was a directional bet without a defined stop or time horizon, the structure was weak before entry. **Call:** Define invalidation and max loss upfront next time; 2-3x leverage on single-name equities is safer unless you have a pair or short hedge.

**Confidence: 0.65** (mechanics clear, but trade context incomplete)

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$43.84, realized=$16.38, slippage=$-27.46, breach=false
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

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -27.46
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.51,
  "riskBudget": {
    "plannedRiskUsd": 43.84,
    "realizedRiskUsd": 16.38,
    "riskSlippageUsd": -27.46,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.51,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T00:25:56.108Z",
    "exitTimestampUtc": "2026-03-05T12:26:08.426Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T00:25:56.108Z",
    "exitTimestampUtc": "2026-03-05T12:26:08.426Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 43.84,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
