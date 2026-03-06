# Post-mortem: GOLD long (max_age)

**Date:** 2026-03-05

## Trade Snapshot

- GOLD long closed max_age: entry $5170.83 -> exit $5108.80, P&L $-51.91 (4153.9839999999995 USD, 5x).
- Entry time (UTC): 2026-03-05T00:40:46.061Z
- Hold window target: intraday
- Max loss budget: $62.31 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 864 minutes
- Adverse move: 1.2%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing critical context:** When did you enter (exact time)? What was CT sentiment on GOLD/USD at entry vs. exit? Was there a macro event (Fed, geopolitical) that shifted the vibe between those two points?

Without knowing the sentiment backdrop, I can't tell you if this was a "CT got it wrong" miss or a "you entered into contrarian extremes" setup. The 4h loss on a 5x lever is tight — if CT was universally bullish GOLD at entry and flipped bearish at exit, that's a data point; if sentiment was already mixed/cautious, you fought headwinds.

**What I need:** Entry timestamp + a quick "what was the X vibe on GOLD that hour?" and I can give you real feedback on whether sentiment alignment was the issue.

Confidence: 0.3 (can't assess without the sentiment timeline)

### Oracle

- Lane: prediction market regime
- Confidence: 58%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** entry/exit timestamps, Polymarket GOLD probability at entry vs exit, and whether you had a directional thesis (macro, technical, or prediction-market-driven). That said: a 62-bp loss on 5x levered long into a risk-off session suggests the paper bot caught a mean-reversion fade that didn't hold—common in commodity futures when macro uncertainty spikes faster than prediction markets price it. If Polymarket was pricing GOLD sub-50% at entry and stayed there through exit, the trade was fighting consensus; if it moved against you (prob rose), the market repriced risk faster than your entry thesis justified the hold. **Next time: cross-check entry thesis against live Polymarket odds for the directional bet (e.g., inflation/USD weakness) to see if you're ahead or behind the prediction market.** 

Confidence: 0.58 (need timestamps

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, exit date, hold time, IV environment (if options-related), and whether this was a hedge or directional bet. On mechanics alone: 5x leverage on a commodity with $62 range volatility is aggressive sizing for a $51 loss—you're risking $4.1K notional for a move that didn't materialize. If this was a short-term directional trade, the entry/exit timing and stop logic matter more than the P&L itself; if it was a hedge, the sizing was wrong relative to what you were protecting. Post-mortem: clarify the thesis (why long GOLD?), the hold duration, and whether you'd size down or skip similar setups going forward.

**Confidence: 0.4** (need entry/exit dates and thesis to assess structure).

## Root-Cause Tags

- Primary: unknown_insufficient_evidence
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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: unclear
- Risk budget: planned=$62.31, realized=$51.91, slippage=$-10.40, breach=false
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

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: unknown_insufficient_evidence
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -10.4
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "unknown_insufficient_evidence",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 864,
  "adverseMovePct": 1.2,
  "riskBudget": {
    "plannedRiskUsd": 62.31,
    "realizedRiskUsd": 51.91,
    "riskSlippageUsd": -10.4,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.2,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T00:40:46.061Z",
    "exitTimestampUtc": "2026-03-05T15:04:27.007Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T00:40:46.061Z",
    "exitTimestampUtc": "2026-03-05T15:04:27.007Z"
  },
  "solusContext": {
    "assetClass": "commodity",
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
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "unclear"
}
```
