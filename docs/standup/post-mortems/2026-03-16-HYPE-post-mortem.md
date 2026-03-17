# Post-mortem: HYPE short (stop_loss)

**Date:** 2026-03-16

## Trade Snapshot

- HYPE short closed stop_loss: entry $38.95 -> exit $40.63, P&L $-124.48 (2844.820029152019 USD, 4x).
- Entry time (UTC): 2026-03-16T16:48:07.091Z
- Hold window target: intraday
- Max loss budget: $99.57 (14.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 231 minutes
- Adverse move: 4.326%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** Did CT sentiment flip bearish→bullish on HYPE between entry and exit, or was the move driven by macro (BTC pump, risk-on)? Was this a contrarian fade that got run over, or a momentum reversal you didn't catch on X?

**If sentiment shifted:** You shorted into a positive vibe without waiting for CT conviction to crack — that's a timing miss, not a thesis miss. **If macro drove it:** HYPE got swept up in a broader risk-on move; the short was sound but got liquidated before mean reversion. Either way, check X_PULSE at entry time vs. exit time to see if you missed the sentiment turn.

**Confidence: 0.6** (need the sentiment context to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What's the Polymarket consensus on HYPE right now, and what was your thesis vs. the market price when you entered? Without knowing if Poly had already priced in the move or if you were fighting a consensus shift, I can't isolate whether this was a regime miss (market repriced fundamentals) vs. execution (size/timing on thin liquidity).

That said: **4x leverage on a short in a potential bull regime is high-risk positioning**—if HYPE rallied on macro tailwinds or positive news, your stop was tight relative to the leverage. Check if Poly's open interest or consensus shifted during your hold; if it did, that's your signal the market repriced, not just noise.

**Confidence: 0.4** (need Poly odds at entry/exit and your original thesis to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry date, exit date, IV environment at entry/exit, funding rate at entry, and whether this was part of a planned hedge or standalone directional bet. That said, the mechanics: 4x leverage on a $2,844 notional short in a $30 asset is aggressive sizing for a paper trade—you're risking $124 on a $711 collateral base, which leaves almost no room for noise. HYPE's volatility (especially post-ATH) can whip 2–3% intraday; at 4x, that's a stop. If this was a hedge against long spot, the structure made sense; if it was a directional short, size down to 2x or use options (CSPs) instead to cap loss upfront. **Next:** paste entry/exit timestamps and funding rate so I can assess whether the stop was hit on a wick or a real

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$99.57, realized=$124.48, slippage=$24.91, breach=true
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
- Delta confidence: 0.53
- Delta window trades: 20
- Delta expiry: 2026-03-30T20:39:35.285Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 24.91
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 231,
  "adverseMovePct": 4.326,
  "riskBudget": {
    "plannedRiskUsd": 99.57,
    "realizedRiskUsd": 124.48,
    "riskSlippageUsd": 24.91,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 4.326,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.53,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-03-30T20:39:35.285Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "crypto": 3
      },
      "maxSingleTradeUsd": 2418
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
    "entryTimestampUtc": "2026-03-16T16:48:07.091Z",
    "exitTimestampUtc": "2026-03-16T20:39:23.357Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-16T16:48:07.091Z",
    "exitTimestampUtc": "2026-03-16T20:39:23.357Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 4,
    "stopDistancePct": 3.5,
    "maxLossUsd": 99.57,
    "maxLossPct": 14,
    "entryAtrPct": 7
  },
  "agentContextMissing": {
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
