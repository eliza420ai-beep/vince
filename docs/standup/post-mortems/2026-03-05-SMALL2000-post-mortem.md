# Post-mortem: SMALL2000 long (max_age)

**Date:** 2026-03-05

## Trade Snapshot

- SMALL2000 long closed max_age: entry $262.45 -> exit $259.68, P&L $-45.96 (4153.9839999999995 USD, 5x).
- Entry time (UTC): 2026-03-05T00:33:20.521Z
- Hold window target: intraday
- Max loss budget: $62.31 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 871 minutes
- Adverse move: 1.056%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter/exit (time window)? What was CT sentiment on SMALL2000 during your hold — was there a narrative shift or whale dump you caught late? Without the timeline and sentiment backdrop, I can't tell if this was a sentiment mispricing that resolved faster than expected or if macro/on-chain flow killed the thesis.

**What I'd need to give you real feedback:** Entry/exit timestamps + the sentiment pulse on that token during your hold (was CT bullish → bearish, or did whales exit before retail noticed?).

Confidence: 0.3 (too little data to assess sentiment execution quality).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

Missing context blocks a clean read: **What's the condition_id?** (need live Polymarket odds to see if the market repriced against you or if entry/exit were both mispriced). **What's the thesis?** (directional bet, volatility crush, mean reversion?). **What triggered the exit?** (stop, time decay, realized vol spike?).

Assuming directional long on a micro/small-cap: $262.45 entry on 5x is tight—if Polymarket had you at >55% at entry and you exited at <50%, the market corrected a genuine edge. If you entered at fair value or underpriced, the loss is regime drift (vol, macro flow, or narrative shift). Either way, **the paper bot's entry model or exit discipline needs tuning**—5x leverage on a $45 loss suggests position sizing or stop placement wasn't tight enough

### Solus

- Lane: options mechanics and sizing
- Confidence: 75%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, what triggered the exit, and current market regime (bull/bear/range). That said, structurally: 5x leverage on SMALL2000 ($262 entry) means ~$1.3K notional with $260 collateral—tight margin for a micro-cap index with intraday swings of 2-3%. You took a 1.1% move against you and got stopped/liquidated; at 5x, that's a -5.5% account hit. For paper, the lesson is: either size down (2-3x max on micro-caps), widen stops to 2-3% to survive chop, or skip SMALL2000 entirely until you have conviction + macro tailwind. Confidence: 0.75.

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$62.31, realized=$45.96, slippage=$-16.35, breach=false
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

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -16.35
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 871,
  "adverseMovePct": 1.056,
  "riskBudget": {
    "plannedRiskUsd": 62.31,
    "realizedRiskUsd": 45.96,
    "riskSlippageUsd": -16.35,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.056,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T00:33:20.521Z",
    "exitTimestampUtc": "2026-03-05T15:04:26.983Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T00:33:20.521Z",
    "exitTimestampUtc": "2026-03-05T15:04:26.983Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 62.31,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
