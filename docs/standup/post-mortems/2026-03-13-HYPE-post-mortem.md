# Post-mortem: HYPE long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- HYPE long closed stop_loss: entry $37.63 -> exit $36.27, P&L $-149.64 (4099.797333333333 USD, 10x).
- Entry time (UTC): 2026-03-13T13:32:42.863Z
- Hold window target: intraday
- Max loss budget: $143.49 (35.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 125 minutes
- Adverse move: 3.6%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on HYPE at entry vs. exit? Was there a macro event or on-chain catalyst that shifted the vibe?

**What I can say now:** A $150 stop on a 10x micro-cap is tight — you got shaken out, likely on noise rather than thesis break. If CT sentiment was still bullish at your exit, that's a red flag (you sold into strength = panic). If sentiment had flipped bearish, the trade was correctly invalidated.

**To give you real feedback:** Run me the entry timestamp and I'll pull the X vibe from that moment, then compare it to your exit. That tells us if you got sentiment-whipsawed or if the thesis actually broke.

Confidence: 0.4 (need the data to be useful here).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing context:** I need the condition_id or market detail for HYPE to pull live Polymarket odds and volume—was the long thesis based on prediction-market pricing, or perps sentiment? Without that, I can't assess whether the stop loss was rational relative to what the market was pricing. **Quick take:** A 3.7% loss on 10x leverage is tight risk management, which is sound; the question is whether the entry thesis (macro, event catalyst, sentiment edge) broke or whether it was just noise in a thin orderbook. Pull the Polymarket odds at entry vs. exit and I can tell you if the market repriced the event or if you got shaken out of a valid position.

Confidence: 0.3 (need market data to be useful here).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry time (when), exit time (when), IV environment at entry/exit, funding rate at entry, and whether this was part of a planned hedge or standalone directional bet. That said: **10x leverage on a $4,100 notional position is aggressive for a paper trade**—you're testing conviction, not edge. The 3.7% loss ($37.63→$36.27) is mechanical noise at that leverage; what matters is *why* you entered and *what signal* closed it. If stop was hard-coded (not signal-based), you may be whipsawed by noise; if signal-based, check whether the signal fired early or late relative to the actual move. **For paper: tighten your entry/exit logic and log the signal, not just P&L.**

**Confidence: 0.6** (mechanics clear, context sparse).

## Root-Cause Tags

- Primary: thesis_invalid
- Secondary: sizing_too_aggressive

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

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: unclear
- Risk budget: planned=$143.49, realized=$149.64, slippage=$6.15, breach=true
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
- PM_PRIMARY_CAUSE: thesis_invalid
- PM_SECONDARY_CAUSES: sizing_too_aggressive
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 6.15
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 79,
  "qualityEscalate": false,
  "primaryCause": "thesis_invalid",
  "secondaryCauses": [
    "sizing_too_aggressive"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 125,
  "adverseMovePct": 3.6,
  "riskBudget": {
    "plannedRiskUsd": 143.49,
    "realizedRiskUsd": 149.64,
    "riskSlippageUsd": 6.15,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 3.6,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T13:32:42.863Z",
    "exitTimestampUtc": "2026-03-13T15:37:42.880Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T13:32:42.863Z",
    "exitTimestampUtc": "2026-03-13T15:37:42.880Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 3.5,
    "maxLossUsd": 143.49,
    "maxLossPct": 35,
    "entryAtrPct": 7
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "unclear"
}
```
