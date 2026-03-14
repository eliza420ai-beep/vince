# Post-mortem: SNDK long (stop_loss)

**Date:** 2026-03-14

## Trade Snapshot

- SNDK long closed stop_loss: entry $669.41 -> exit $659.18, P&L $-105.12 (6658.212765957447 USD, 5x).
- Entry time (UTC): 2026-03-13T18:43:32.119Z
- Hold window target: intraday
- Max loss budget: $99.87 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 653 minutes
- Adverse move: 1.529%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on SNDK at entry vs. exit? Was this a macro rotation (risk-off) or stock-specific bearish shift? 

Without the sentiment timeline, I can't tell you if you got caught in a broader deleveraging cycle (where sentiment would've warned you earlier) or if SNDK-specific FUD blindsided retail while whales dumped. Check if macro was turning south or if SNDK chatter shifted from bullish → bearish in your hold window — that's where sentiment adds edge.

**Confidence: 0.3** (need entry date + CT pulse during hold period to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing key context:** I need the trade date/timeframe, the Polymarket odds for SNDK at entry vs. exit, and what thesis triggered the position (earnings, macro, technical). Without those, I can't tell you whether the stop was hit on market structure (wide spreads, thin liquidity) or fundamental repricing.

**What I can say:** A 1.5% stop on a 5x perp is tight—typical for scalps, not swing trades. If SNDK was pricing in event risk (earnings, sector rotation) that Polymarket didn't reflect, that's a regime mismatch worth examining. Ask VINCE for the chart context and I'll cross it against any relevant prediction markets.

**Confidence: 0.3** (too many unknowns to assess regime or pricing edge).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, IV/volatility regime at entry vs exit, and whether this was a scheduled paper trade or discretionary. That said: **6.6x leverage on a 1.5% stop is tight—you're risking assignment of the full 5x notional on a micro move.** For semiconductor names (SNDK), consider wider stops (2–3%) or lower leverage (2–3x) to survive intraday noise without getting stopped into reversals. If this was a scheduled bot trade, the stop itself was too aggressive for the asset's typical daily range; if discretionary, the position sizing didn't match your conviction.

**Confidence: 0.65** (structure feedback solid; execution context would sharpen it).

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$99.87, realized=$105.12, slippage=$5.25, breach=true
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
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 5.25
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 653,
  "adverseMovePct": 1.529,
  "riskBudget": {
    "plannedRiskUsd": 99.87,
    "realizedRiskUsd": 105.12,
    "riskSlippageUsd": 5.25,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.529,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T18:43:32.119Z",
    "exitTimestampUtc": "2026-03-14T05:36:33.210Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T18:43:32.119Z",
    "exitTimestampUtc": "2026-03-14T05:36:33.210Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 99.87,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ],
    "Oracle": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
