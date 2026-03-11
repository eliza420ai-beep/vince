# Post-mortem: ETH short (stop_loss)

**Date:** 2026-03-11

## Trade Snapshot

- ETH short closed stop_loss: entry $2065.19 -> exit $2084.40, P&L $-32.39 (3304.219002319073 USD, 10x).
- Entry time (UTC): 2026-03-11T16:35:22.976Z
- Hold window target: intraday
- Max loss budget: $25.63 (7.76%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 51 minutes
- Adverse move: 0.93%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

Here's what I'd need to give you real feedback: **What was CT sentiment on ETH at entry vs. exit?** Was the short against consensus (contrarian alpha) or with the crowd (crowded trade)? Also—**what macro/on-chain narrative shifted during the hold?** Did whale accumulation flip, or did macro news (Fed, BTC moves) invalidate the thesis mid-trade?

Without that context, I can't tell if you fought sentiment headwinds (lesson: respect the tape) or missed a sentiment inflection (lesson: tighter stops on macro pivots). The sizing and leverage look disciplined, but sentiment timing is everything on shorts.

**What I'd run:** X_PULSE filtered to whale/alpha accounts on ETH + macro during your hold window. That tells us if you were early, late, or just unlucky.

Confidence: 0.3 (need the sentiment data

### Oracle

- Lane: prediction market regime
- Confidence: 0%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing critical context:** What was your thesis entry point (Polymarket ETH price prediction, IV crush, macro sentiment)? And what timeframe—was this a hours/days hold? 

**What I see:** $2065 entry on a 10x short is aggressive sizing into what looks like consolidation (small loss on a $19 move suggests tight stops). If you were shorting on a Polymarket signal (e.g., ETH price prediction cooling), the regime shift against you tells me either the market repriced faster than the signal decayed, or you were fighting macro momentum that hadn't peaked yet.

**The ask:** Pull the Polymarket ETH price markets from that window—if open interest and volume spiked *after* your entry, you were early on a repricing, not wrong on direction. If they stayed flat, your sizing was the issue, not the call.

**Confidence: 0

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry thesis (macro/micro invalidation trigger), position hold time, and whether this was paper-bot or manual. **On mechanics:** $3.3K loss on 10x leverage is acceptable bleed for a stop-hit; the issue is whether the entry had a clear invalidation (e.g., "hold if ETH > $2080") or you were sizing blind. If the bot entered without a defined exit framework, that's the structural leak—not the loss itself. **Call:** Post the entry thesis and hold duration; I'll assess whether the stop was placed correctly or if you're chasing invalidations too tight.

**Confidence: 0.6** (need entry context to grade structure).

## Root-Cause Tags

- Primary: sizing_too_aggressive
- Secondary: stop_too_tight_for_vol

## Corrective Actions

1. [immediate] owner=vince due=next_trade
   - action: Cap leverage on this asset class and widen stop to volatility-adjusted range before next entry.
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

- Quality score: 90/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$25.63, realized=$32.39, slippage=$6.76, breach=true
- Consistency checks: pass

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.
- No automatic policy mutation due to data/quality gate.

## Recursive Policy Delta

- Adaptation eligible: false
- Policy version at entry: baseline
- Proposed delta: none

## Machine-Readable Summary

- PM_QUALITY_SCORE: 90
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 6.76
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 90,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 51,
  "adverseMovePct": 0.93,
  "riskBudget": {
    "plannedRiskUsd": 25.63,
    "realizedRiskUsd": 32.39,
    "riskSlippageUsd": 6.76,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.93,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.776,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T16:35:22.976Z",
    "exitTimestampUtc": "2026-03-11T17:26:20.177Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T16:35:22.976Z",
    "exitTimestampUtc": "2026-03-11T17:26:20.177Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.776,
    "maxLossUsd": 25.63,
    "maxLossPct": 7.76,
    "entryAtrPct": 1.5512041884816752
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
