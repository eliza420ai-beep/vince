# Post-mortem: SILVER short (stop_loss)

**Date:** 2026-03-16

## Trade Snapshot

- SILVER short closed stop_loss: entry $79.38 -> exit $80.58, P&L $-39.91 (2559.6908212560384 USD, 4x).
- Entry time (UTC): 2026-03-16T11:40:39.303Z
- Hold window target: intraday
- Max loss budget: $38.40 (6.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 101 minutes
- Adverse move: 1.509%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter (exact time/date)? What was CT sentiment on silver/commodities at entry vs. exit? Was there a macro catalyst (Fed speak, USD move, inflation data) that shifted the vibe between open and close?

Without the sentiment snapshot at entry and exit, I can't tell if you got caught in a macro reversal (e.g., risk-on rotation, USD weakness) or if CT just wasn't aligned with the trade thesis. Silver is macro-driven — if I see the timestamps and what CT was saying about commodities/USD at those moments, I can tell you if sentiment was against you from the start or if it flipped mid-trade.

**Confidence: 0.3** (need the timeline and sentiment data to be useful here).

### Oracle

- Lane: prediction market regime
- Confidence: 25%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing context:** I need the Polymarket SILVER contract (condition_id), your probability estimate at entry, and the market's consensus price at entry/exit to assess whether you mispriced or the market repriced against you. Without that, I can't distinguish between a bad edge call (you were wrong on fair value) versus a regime shift (market moved on new info). The 4x leverage + tight stop ($1.20 range) suggests you were playing mean reversion—did the orderbook show support at $79.38 that evaporated, or did macro/news break the setup? 

**What I'd need:** Polymarket odds at entry/exit, your conviction level, and whether volume/spread widened into the stop.

Confidence: 0.25

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation (price level that would kill the thesis)? Did $80.58 hit it, or did you stop out early? The 4x leverage on a commodity short is aggressive for a $2,560 notional position—if this is paper bot testing, that's fine, but if live it's oversized relative to thesis conviction. **Mechanics feedback:** Stop at $80.58 suggests tight risk management (1.5% loss), which is good; the issue is whether the entry ($79.38) was thesis-driven or timing-driven. If SILVER broke a key support and you shorted the bounce, that's sound structure. If you shorted because "it looked weak," the stop is just damage control, not a real plan. **Next:** Paste the invalidation level and what price action triggered the stop—then I can assess whether the structure was right and the sizing matched the conviction

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
- Risk budget: planned=$38.40, realized=$39.91, slippage=$1.51, breach=true
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
- Delta confidence: 0.38
- Delta window trades: 20
- Delta expiry: 2026-03-30T13:21:23.158Z

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
- PM_RISK_SLIPPAGE_USD: 1.51
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 101,
  "adverseMovePct": 1.509,
  "riskBudget": {
    "plannedRiskUsd": 38.4,
    "realizedRiskUsd": 39.91,
    "riskSlippageUsd": 1.51,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.509,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.38,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-03-30T13:21:23.158Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "commodity": 3
      },
      "maxSingleTradeUsd": 2176
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
    "entryTimestampUtc": "2026-03-16T11:40:39.303Z",
    "exitTimestampUtc": "2026-03-16T13:21:11.712Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-16T11:40:39.303Z",
    "exitTimestampUtc": "2026-03-16T13:21:11.712Z"
  },
  "solusContext": {
    "assetClass": "commodity",
    "thesisClass": "momentum",
    "leverage": 4,
    "stopDistancePct": 1.5,
    "maxLossUsd": 38.4,
    "maxLossPct": 6,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
