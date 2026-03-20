# Post-mortem: ETH short (stop_loss)

**Date:** 2026-03-20

## Trade Snapshot

- ETH short closed stop_loss: entry $2137.87 -> exit $2157.40, P&L $-8.70 (903.168 USD, 4x).
- Entry time (UTC): 2026-03-20T14:27:52.580Z
- Hold window target: intraday
- Max loss budget: $7.39 (3.27%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 456 minutes
- Adverse move: 0.913%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context I need:** Was this trade sized around a known CT sentiment event (e.g., ETH staking narrative flip, macro risk-off), or was it a technical setup? Did CT sentiment stay bullish on ETH while you were short, or did it flip mid-trade?

**On the loss itself:** If CT was consistently bullish ETH during your hold, that's the real signal — retail + whales aligned upside is hard to short profitably. The $20 wick likely caught you in a liquidity squeeze that sentiment couldn't warn you about (that's Solus's lane). What I'd flag: **check if your entry thesis matched CT's actual conviction at entry time.** If CT was already pricing in the move you were betting against, the trade was fighting consensus from the jump.

**Confidence: 0.6** (need trade timestamp + CT vibe at entry to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 72%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was your entry thesis (technical, macro, Polymarket consensus)? Did Polymarket's ETH-price markets signal continuation higher, or were they flat/uncertain when you entered? 

**Regime read:** A $20 move on a 4x short in a choppy consolidation is typical liquidation-bait behavior—if Polymarket's real-time odds on "ETH above $2150 by [date]" were >60%, the market was pricing continuation, and your short was fighting consensus. The stop at $2157 suggests you sized for a tighter range than the actual volatility regime allowed.

**Takeaway:** Before next entry, pull live Polymarket odds on the directional thesis and orderbook depth—if the market's pricing strength and you're shorting, you're taking consensus risk without an edge signal to offset it.

**Confidence: 0.72

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, exit date, IV environment at entry/exit, and whether this was part of a defined hedge or standalone directional bet. On mechanics alone: $903 loss on a 4x short is reasonable risk-per-trade sizing, but the stop (20 bips above entry on a $2.1K asset) is tight for ETH volatility—you're getting shaken out by normal noise. If this was a hedge against a long position, the structure works; if standalone directional, tighter stops + higher conviction entry or skip entirely. **Missing:** was this part of a larger portfolio delta or a one-off?

**Confidence: 0.4** (need entry/exit dates, IV, and portfolio context to assess structure).

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$7.39, realized=$8.70, slippage=$1.31, breach=true
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
- Delta confidence: 0.57
- Delta window trades: 20
- Delta expiry: 2026-04-03T22:04:15.956Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: stop_too_tight_for_vol
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 1.31
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "stop_too_tight_for_vol",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 456,
  "adverseMovePct": 0.913,
  "riskBudget": {
    "plannedRiskUsd": 7.39,
    "realizedRiskUsd": 8.7,
    "riskSlippageUsd": 1.31,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.913,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.819,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.57,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-04-03T22:04:15.956Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "stopToAtrMin": 1,
      "maxLeverageByAssetClass": {
        "crypto": 3
      },
      "maxSingleTradeUsd": 768
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
    "entryTimestampUtc": "2026-03-20T14:27:52.580Z",
    "exitTimestampUtc": "2026-03-20T22:03:47.513Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T14:27:52.580Z",
    "exitTimestampUtc": "2026-03-20T22:03:47.513Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 4,
    "stopDistancePct": 0.819,
    "maxLossUsd": 7.39,
    "maxLossPct": 3.27,
    "entryAtrPct": 1.6372774869109947
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
