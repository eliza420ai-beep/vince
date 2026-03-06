# Post-mortem: SOL long (stop_loss)

**Date:** 2026-03-06

## Trade Snapshot

- SOL long closed stop_loss: entry $90.96 -> exit $88.83, P&L $-34.48 (1440.1187263387958 USD, 3x).
- Entry time (UTC): 2026-03-05T00:28:15.104Z
- Hold window target: intraday
- Max loss budget: $57.60 (12.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 1441 minutes
- Adverse move: 2.344%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

Missing key context: **When did you enter vs. exit?** (date/time). That timing matters for sentiment analysis — was CT bullish SOL when you entered, and did sentiment flip before your stop? 

**Rough take (low confidence without timing):** SOL has been riding macro risk-on vibes, but it's also a crowded long on CT. If you entered during peak bullish sentiment and exited into a macro headwind (Fed talk, BTC weakness, etc.), that's a sentiment trap — not your fault, just the market repricing risk. Check if whale SOL positions were lightening before your stop hit; that's often a leading indicator.

**What I'd need:** Entry timestamp, exit timestamp, and a quick X_PULSE from those dates to give you real feedback on whether CT sentiment was actually with you.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 0%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** SOL/USD timeframe (4h? daily?), entry signal source (technicals, macro flow, Polymarket edge?), and whether this was a hedge against a Polymarket position or standalone perp flow.

**Read:** A $34.48 loss on 3x leverage into a $2 drawdown suggests tight stops—reasonable risk management. Without knowing your entry thesis (trend, mean reversion, macro catalyst), I can't assess whether the regime shifted against you or if the signal was weak to begin with. If this was a Polymarket-informed trade (e.g., SOL contract odds shifted), pull those odds at entry/exit and compare to the perp move—that tells you if the market repriced faster than your risk model expected.

**Next move:** Post the entry catalyst and I'll cross it against Polymarket SOL context for that window.

Confidence: 0.

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold time, IV regime at entry/exit, and whether this was part of a directional thesis or hedge. That said: **3x leverage on a $1,440 notional SOL long is tight sizing for a $100K stack**—you're risking ~1.4% on a single trade, which is acceptable, but the stop at $88.83 (2.3% below entry) is aggressive for spot; you likely got clipped by intraday noise rather than thesis break. **Mechanics call:** If this was a perp hedge against options positions, the loss is cost-of-carry; if it was directional conviction, tighten your thesis invalidation (what price/time kills the trade?) before entry, not after. **Next:** Post entry thesis + invalidation price, and I'll assess whether the stop was rational or emotion-driven.

**Confidence:

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

- Quality score: 65/100
- Escalate to Sentinel: true
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$57.60, realized=$34.48, slippage=$-23.12, breach=false
- Consistency checks: fail (stop_distance_mismatch,truncated_agent_findings)

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Escalate this loss to Sentinel weekly governance review.
- No temporary leverage override required.
- No automatic policy mutation due to data/quality gate.

## Recursive Policy Delta

- Adaptation eligible: false
- Policy version at entry: baseline
- Proposed delta: none

## Machine-Readable Summary

- PM_QUALITY_SCORE: 65
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -23.12
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 65,
  "qualityEscalate": true,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 1441,
  "adverseMovePct": 2.344,
  "riskBudget": {
    "plannedRiskUsd": 57.6,
    "realizedRiskUsd": 34.48,
    "riskSlippageUsd": -23.12,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": false,
    "issues": [
      "stop_distance_mismatch",
      "truncated_agent_findings"
    ],
    "adverseMovePctFromPrices": 2.344,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.688,
    "stopDistancePctDelta": 2.312,
    "hasTruncatedFindings": true
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T00:28:15.104Z",
    "exitTimestampUtc": "2026-03-06T00:29:26.901Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T00:28:15.104Z",
    "exitTimestampUtc": "2026-03-06T00:29:26.901Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 4,
    "maxLossUsd": 57.6,
    "maxLossPct": 12,
    "entryAtrPct": 5
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
