# Post-mortem: BTC short (stop_loss)

**Date:** 2026-03-16

## Trade Snapshot

- BTC short closed stop_loss: entry $73548.29 -> exit $74038.00, P&L $-26.73 (3733.404682274247 USD, 4x).
- Entry time (UTC): 2026-03-16T11:40:14.600Z
- Hold window target: intraday
- Max loss budget: $24.27 (2.60%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 113 minutes
- Adverse move: 0.666%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** What was the sentiment thesis at entry? (Was CT bearish? Whale positioning? Macro headwinds?) Without knowing *why* you shorted based on sentiment, I can't assess if the trade thesis broke or if sentiment just didn't matter for this move.

**What I'd need:** CT vibe at entry time, any macro news that flipped the narrative mid-trade, and whether whale/alpha accounts flipped bullish while you were in the position.

Run that back with those details and I'll give you the sentiment post-mortem.

Confidence: 0.3 (incomplete data)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context blocks a full read:** I need the entry date/time, exit date/time, and what Polymarket was pricing BTC at those moments—specifically the conditional odds on "BTC above $74k by [date]" or similar. Without that, I can't tell if you were fighting consensus (edge play) or just got caught in a momentum spike that repriced the tail.

That said: **$490 move against a 4x short is brutal but tells a story.** If Polymarket had already priced >70% odds of a push above $74k, you were anti-consensus and got invalidated fast—regime was bullish, you were bearish. If Polymarket was still <50%, you had an edge that just didn't hold; that's variance, not a regime call.

**The real question:** Did you size that 4x because the edge was clear, or because you were ch

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, IV regime at entry/exit, and whether this was part of a larger hedge or standalone directional bet. That said, the mechanics: 4x leverage on a $73.5K short with a 67-bps stop is tight—typical for scalp, loose for swing. If this was a 1–4h hold, the stop placement (0.67% above entry) is reasonable for noise; if longer, you got shaken out by normal volatility. **The real question:** was this a conviction short (thesis-based, should've sized smaller or widened stop) or a tactical scalp (stop was right, just wrong direction that hour)? Knowing which tells us whether to adjust sizing, conviction, or just accept the chop.

**Confidence: 0.4** (need hold duration, thesis type, and market regime to give real feedback).

## Root-Cause Tags

- Primary: stop_too_tight_for_vol
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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$24.27, realized=$26.73, slippage=$2.46, breach=true
- Consistency checks: pass

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.
- Promote bounded policy delta candidate and evaluate over a rolling window.

## Recursive Policy Delta

- Adaptation eligible: true
- Policy version at entry: baseline
- Proposed delta: present
- Delta confidence: 0.43
- Delta window trades: 20
- Delta expiry: 2026-03-30T13:32:56.984Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: stop_too_tight_for_vol
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 2.46
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "stop_too_tight_for_vol",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 113,
  "adverseMovePct": 0.666,
  "riskBudget": {
    "plannedRiskUsd": 24.27,
    "realizedRiskUsd": 26.73,
    "riskSlippageUsd": 2.46,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.666,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.65,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.43,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-03-30T13:32:56.984Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "stopToAtrMin": 1,
      "maxLeverageByAssetClass": {
        "crypto": 3
      },
      "maxSingleTradeUsd": 3173
    },
    "validationPlan": {
      "windowTrades": 20,
      "targetMetrics": {
        "maxBudgetBreachRate": 0.2,
        "minExpectancyUsd": -5,
        "maxDrawdownPct": 15
      },
      "rollbackTriggers": [
        "budget_breach_rate_worse_than_baseline",
        "expectancy_usd_degrades",
        "drawdown_pct_exceeds_cap"
      ]
    }
  },
  "echoContext": {
    "entryTimestampUtc": "2026-03-16T11:40:14.600Z",
    "exitTimestampUtc": "2026-03-16T13:32:44.686Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-16T11:40:14.600Z",
    "exitTimestampUtc": "2026-03-16T13:32:44.686Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 4,
    "stopDistancePct": 0.65,
    "maxLossUsd": 24.27,
    "maxLossPct": 2.6,
    "entryAtrPct": 1.0929842931937173
  },
  "agentContextMissing": {
    "Oracle": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
