# Post-mortem: SMALL2000 short (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- SMALL2000 short closed max_age: entry $248.31 -> exit $248.54, P&L $-2.20 (1544.96 USD, 5x).
- Entry time (UTC): 2026-03-12T01:34:23.381Z
- Hold window target: intraday
- Max loss budget: $23.17 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 721 minutes
- Adverse move: 0.092%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter (timestamp)? What was CT sentiment on SMALL2000 at entry vs. exit? Was there a macro event (Fed, BTC dump, liquidation cascade) that shifted the vibe between those two points?

**On the trade itself:** A $2.20 move on a $248 entry is tight — that's a 0.88% whipsaw on 5x, which screams low conviction or fast reversal. If CT was neutral-to-bullish on SMALL2000 at entry and sentiment didn't shift materially by exit, this looks like a positioning/timing miss rather than a sentiment call being wrong. If sentiment *did* flip bearish between entry and exit, that's the real story — and I'd need to see the X vibe data to validate whether you were early or the crowd turned faster than expected.

**Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id, market_name

**Missing context:** I need the condition_id or market name for SMALL2000 to pull live Polymarket odds, orderbook depth, and volume regime at entry/exit—without that, I'm blind to whether you were fighting a consensus shift or just got clipped by spread friction. That said, a $2.20 loss on a $248 short in a 5x levered perp setup suggests tight stops or a quick whipsaw; if Poly was pricing SMALL2000 >50% at entry and tightened at exit, you were short consensus and got run. Pull the market detail and I'll give you regime + fair-value feedback.

**Confidence: 0.3** (no market data).

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, and what triggered the exit—was it a stop, time-based, or discretionary close? On mechanics alone: $248→$248.54 is a 0.09% move against you on 5x leverage, which costs ~$22.50 notional; your actual loss ($2.20) suggests the position was smaller than stated or fees/slippage ate the rest. The sizing (5x on a micro-cap like SMALL2000) is aggressive for a paper bot testing—consider 2–3x max until the edge is proven, and define exit rules (time, stop %, signal) before entry so you're not closing on emotion. Paste the full trade log (entry time, exit trigger, duration) and I'll give you the structural call.

**Confidence: 0.4** (missing entry/exit mechanics and hold duration)

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

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$23.17, realized=$2.20, slippage=$-20.97, breach=false
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
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -20.97
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 79,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 721,
  "adverseMovePct": 0.092,
  "riskBudget": {
    "plannedRiskUsd": 23.17,
    "realizedRiskUsd": 2.2,
    "riskSlippageUsd": -20.97,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.092,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T01:34:23.381Z",
    "exitTimestampUtc": "2026-03-12T13:34:54.900Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T01:34:23.381Z",
    "exitTimestampUtc": "2026-03-12T13:34:54.900Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 23.17,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "condition_id",
      "market_name"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
