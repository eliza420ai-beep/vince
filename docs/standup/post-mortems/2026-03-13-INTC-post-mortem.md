# Post-mortem: INTC short (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- INTC short closed stop_loss: entry $45.66 -> exit $46.51, P&L $-62.00 (3250.660430769231 USD, 5x).
- Entry time (UTC): 2026-03-13T01:33:29.741Z
- Hold window target: intraday
- Max loss budget: $48.76 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 719 minutes
- Adverse move: 1.857%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context:** Did CT or macro sentiment shift *before* your stop hit? (e.g., Fed pivot chatter, chip sector rotation, INTC-specific news on X). Without knowing what the sentiment environment was at entry vs. exit, I can't tell if you got caught in a CT whipsaw or if the macro thesis broke.

**What I'd need to give you real feedback:** Timestamp of entry → timestamp of stop. Then I can X_PULSE that window and tell you if sentiment flipped, if whales were already rotating, or if it was pure technicals + leverage.

Confidence: 0.3 (can't diagnose without the timing and CT context).

### Oracle

- Lane: prediction market regime
- Confidence: 35%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need the Polymarket INTC prediction (condition, current odds, volume) and trade date/time to compare—was the market pricing a bounce into earnings, or did sentiment shift post-entry? Without that, I can only say: a $0.85 move (1.86%) stop on a 5x levered short is tight for intraday chop, especially in semi-conductors where macro/Fed flow dominates. If Poly showed >65% odds of INTC holding above $46 at entry, your stop was fighting the consensus. If it was sub-55%, the regime favored the short but execution timing (entry depth, slippage) likely cost you. 

**Ask:** What was the Polymarket INTC price prediction at entry, and did you check open interest/spreads before sizing?

Confidence: 0.35 (regime read requires live market

### Solus

- Lane: options mechanics and sizing
- Confidence: 72%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold duration, IV environment (if options-based), and whether this was a hedge or standalone directional bet. On mechanics alone: 5x leverage on a $45 stock ate a 1.9% move against you—tight stop but reasonable for a short. The real question is **position sizing relative to portfolio drawdown tolerance** — what % of $100K was this? If >5%, the leverage+size combo is too aggressive for a single-ticker short; if <2%, structure was sound but execution timing was off. **Recommendation:** Size down to 2-3x on single-name shorts, or require 2–3 correlated shorts (sector hedge) before running 5x.

**Confidence: 0.72** — solid mechanics feedback, but without hold time and portfolio % I can't assess if this was bad luck or bad structure.

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
- Risk budget: planned=$48.76, realized=$62.00, slippage=$13.24, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 13.24
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
  "holdMinutes": 719,
  "adverseMovePct": 1.857,
  "riskBudget": {
    "plannedRiskUsd": 48.76,
    "realizedRiskUsd": 62,
    "riskSlippageUsd": 13.24,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.857,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T01:33:29.741Z",
    "exitTimestampUtc": "2026-03-13T13:32:13.587Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T01:33:29.741Z",
    "exitTimestampUtc": "2026-03-13T13:32:13.587Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 48.76,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
