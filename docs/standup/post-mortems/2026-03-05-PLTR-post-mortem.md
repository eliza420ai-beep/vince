# Post-mortem: PLTR short (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- PLTR short closed stop_loss: entry $150.37 -> exit $153.01, P&L $-17.30 (958.199086639676 USD, 5x).
- Entry time (UTC): 2026-03-05T17:35:00.018Z
- Hold window target: intraday
- Max loss budget: $14.37 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 195 minutes
- Adverse move: 1.756%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on PLTR at entry vs. exit? Was there a macro catalyst (Fed speak, earnings, sector rotation) that shifted the vibe between those two points?

Without the sentiment backdrop, I can't tell if you got caught in a crowded short (CT was already bearish, reversal was inevitable) or if macro whipped you (bullish surprise). **The move itself (+1.8%) on a 5x short is brutal but not unusual for a single-day reversal.** Run me those timestamps and I'll pull the CT pulse from entry to exit — that'll show if sentiment was against your thesis from the jump.

**Confidence: 0.3** (need the timing and sentiment data to give you real feedback)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the Polymarket odds on PLTR at entry and exit—was the market pricing a breakout above $150, or was consensus already north of $153? That tells us if you were fighting consensus or if the move caught the market flat-footed. Also: what was the paper bot's thesis (mean reversion, momentum fade, vol crush)? The $2.64 move on 5x is ~1.75% notional, which is normal intraday noise unless there was a catalyst. If Poly had PLTR >$153 priced in, your short was fighting the consensus from the jump; if it was <$150, the market repriced against you mid-trade and the bot's signal aged poorly.

**Direct take:** Without live odds context, I can't tell if this was a regime miss (bot caught a mean-reversion fade that didn't happen) or a data

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, IV/vol regime at entry vs exit, and whether this was part of a defined hedge or standalone directional bet. On mechanics alone: 5x leverage on a $150 stock is tight—$2.64 move (1.75%) stopped you out, which suggests either (1) stop was too close for the volatility profile, or (2) entry timing caught a reversion spike. If this was a short into strength without a vol/sentiment filter, that's the real leak—not the sizing. **Confidence: 0.4** (need trade thesis + context to assess structure).

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
- Risk budget: planned=$14.37, realized=$17.30, slippage=$2.93, breach=true
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
- PM_RISK_SLIPPAGE_USD: 2.93
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
  "holdMinutes": 195,
  "adverseMovePct": 1.756,
  "riskBudget": {
    "plannedRiskUsd": 14.37,
    "realizedRiskUsd": 17.3,
    "riskSlippageUsd": 2.93,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.756,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T17:35:00.018Z",
    "exitTimestampUtc": "2026-03-05T20:50:29.390Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T17:35:00.018Z",
    "exitTimestampUtc": "2026-03-05T20:50:29.390Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 14.37,
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
