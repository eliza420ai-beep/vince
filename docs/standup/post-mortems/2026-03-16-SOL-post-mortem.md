# Post-mortem: SOL short (stop_loss)

**Date:** 2026-03-16

## Trade Snapshot

- SOL short closed stop_loss: entry $93.51 -> exit $95.86, P&L $-104.19 (4070.7960038672254 USD, 4x).
- Entry time (UTC): 2026-03-16T16:48:05.504Z
- Hold window target: intraday
- Max loss budget: $101.77 (10.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 225 minutes
- Adverse move: 2.51%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

Missing key context: **When did you enter?** (Was CT bullish/bearish on SOL at entry? Did sentiment shift before your exit?) and **What was the macro backdrop?** (BTC momentum, Fed news, risk-on/off). That said — if you shorted into a retail FOMO spike (common SOL play), the stop hit because momentum traders piled in faster than sentiment could flip bearish. Next time, check if CT is already pricing the move before you fade it. Confidence: 0.6 (need entry timestamp + CT vibe at that moment to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** I need the entry timestamp, exit timestamp, and what Polymarket was pricing SOL at those moments—was there a consensus shift (e.g., macro pivot, Fed news) that SOL's Poly odds moved *against* your short, or did price just whip on leverage noise? 

**On the trade itself:** A 2.5% loss on 4x is tight stop discipline, which is right. But if Polymarket's SOL price probability *increased* during your hold (suggesting the market repriced SOL higher conviction), that's regime confirmation—you were fighting consensus. If Poly stayed flat or dipped, it's pure momentum whip and your stop caught noise, not signal.

**Feedback:** Pull the Poly price action (via GET_POLYMARKET_PRICE for SOL markets) against your trade timestamps. That'll tell us whether you shorted into a repricing event

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Stop hit at $95.86 on a $93.51 short (2.5% move)** — that's tight for 4x leverage on SOL; you got shaken out before mean reversion had room. **Missing context:** entry thesis (support level? IV crush play?), hold duration, and whether $95.86 was your planned stop or a panic close. If it was planned, the mechanics are sound (defined risk); if panic, tighten your thesis clarity before re-entry. **Sizing check:** $104 loss on $4,070 notional is 2.5% account bleed — acceptable if this is your test-fire on SOL shorts, but scale down if you're taking 4x on thesis you're not 95% confident in. **Next:** Post the entry thesis and we can assess whether the stop placement was right or whether you need a different timeframe/leverage combo

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$101.77, realized=$104.19, slippage=$2.42, breach=true
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
- Delta confidence: 0.6
- Delta window trades: 20
- Delta expiry: 2026-03-30T20:33:31.627Z

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
- PM_RISK_SLIPPAGE_USD: 2.42
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 225,
  "adverseMovePct": 2.51,
  "riskBudget": {
    "plannedRiskUsd": 101.77,
    "realizedRiskUsd": 104.19,
    "riskSlippageUsd": 2.42,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 2.51,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 2.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.6,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-03-30T20:33:31.627Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "crypto": 3
      },
      "maxSingleTradeUsd": 3460
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
    "entryTimestampUtc": "2026-03-16T16:48:05.504Z",
    "exitTimestampUtc": "2026-03-16T20:33:18.949Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-16T16:48:05.504Z",
    "exitTimestampUtc": "2026-03-16T20:33:18.949Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 4,
    "stopDistancePct": 2.5,
    "maxLossUsd": 101.77,
    "maxLossPct": 10,
    "entryAtrPct": 5
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
