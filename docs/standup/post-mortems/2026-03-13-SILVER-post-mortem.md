# Post-mortem: SILVER short (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- SILVER short closed stop_loss: entry $84.13 -> exit $85.41, P&L $-36.33 (2311.8347107438017 USD, 5x).
- Entry time (UTC): 2026-03-12T20:20:28.694Z
- Hold window target: intraday
- Max loss budget: $34.68 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 286 minutes
- Adverse move: 1.521%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on SILVER/commodities at entry vs. exit? Was there a macro catalyst (Fed speak, USD move, inflation data) that shifted the vibe between those two points?

**On the trade itself:** A $36 loss on a 5x short in a commodity that's been range-bound is typical friction — sentiment alone doesn't drive SILVER like it does crypto. If CT was neutral-to-bullish on inflation/USD weakness at entry and that flipped, that's your real culprit, not sentiment mispricing.

**To give you actual feedback:** Pull the timestamp, and I'll run a sentiment pulse from that window. Right now I'm flying blind on macro context.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Silver prediction-market odds at entry/exit (Polymarket or equivalent), and whether this was a directional hedge against a perps position or a standalone bet. That said: a 1.28-point stop on a 5x short suggests tight risk management, but the real question is whether the market repriced Silver *faster than the paper algo predicted*—if Polymarket odds shifted bullish into your entry, that's regime drift, not execution failure. **Confidence: 0.4** (need live market odds and your thesis at entry to assess whether this was a model miss or just bad timing in a volatile regime).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** Entry date, hold duration, IV/vol at entry vs exit, and whether this was a scheduled paper test or live signal. That said: **$36 loss on a $2.3K notional position at 5x is acceptable slippage for a stop-hit in silver (low-liquidity, wide spreads)**—the real question is *why* you sized 5x on a commodity with that spread profile. If this was a test of position-sizing logic, it worked; if it was a signal execution, silver's liquidity tier doesn't justify leverage. **Next: post entry rules—what was the thesis invalidation threshold, and did it trigger or did price just clip your stop?** Confidence: 0.6 (need hold time + vol context to assess structure).

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
- Risk budget: planned=$34.68, realized=$36.33, slippage=$1.65, breach=true
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
- PM_RISK_SLIPPAGE_USD: 1.65
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
  "holdMinutes": 286,
  "adverseMovePct": 1.521,
  "riskBudget": {
    "plannedRiskUsd": 34.68,
    "realizedRiskUsd": 36.33,
    "riskSlippageUsd": 1.65,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.521,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T20:20:28.694Z",
    "exitTimestampUtc": "2026-03-13T01:06:56.942Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T20:20:28.694Z",
    "exitTimestampUtc": "2026-03-13T01:06:56.942Z"
  },
  "solusContext": {
    "assetClass": "commodity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 34.68,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
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
