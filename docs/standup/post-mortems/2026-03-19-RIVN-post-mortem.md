# Post-mortem: RIVN short (stop_loss)

**Date:** 2026-03-19

## Trade Snapshot

- RIVN short closed stop_loss: entry $15.46 -> exit $16.82, P&L $-337.40 (3840 USD, 5x).
- Entry time (UTC): 2026-03-19T08:34:21.490Z
- Hold window target: intraday
- Max loss budget: $144.00 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 206 minutes
- Adverse move: 8.737%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing critical context:** I need to know *when* you entered (date/time) and *what CT sentiment was at entry vs. exit*—was RIVN bullish/bearish on X when you shorted? Did macro shift (Fed news, rate expectations, tech sector rotation)? Without the sentiment backdrop, I can't tell if you fought the crowd or if CT turned against your thesis mid-trade.

**What I'd flag if sentiment *was* bullish at entry:** Shorting into crowd conviction is high-friction—retail FOMO + whale accumulation typically hold stops tighter. If CT flipped bearish *after* your entry, that's a macro/narrative shift, not a sentiment miss.

**To give you real feedback:** Run X_PULSE on "RIVN" for the entry/exit window, and I'll map sentiment velocity against your P&L.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need the trade date/timeframe and which Polymarket RIVN condition you were hedging against (production target, stock price range, timeline). Without that, I can't assess whether the move was regime-driven (macro shift, earnings surprise) or a Polymarket repricing that your paper position didn't capture.

That said: A 8.8% adverse move on 5x leverage is a standard stop-loss trigger, but if you were short RIVN as a hedge against a bullish Polymarket bet, the real question is whether Poly's odds shifted *before* the stock moved—if so, you had a signal lag problem, not a sizing problem. Check the orderbook spread and volume on the relevant condition around your entry; if it was tight and deep, Poly was pricing in the move ahead of spot.

**Confidence: 0.3** (need market condition, date, and

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, volatility regime at entry/exit, and whether this was part of a planned pair trade (e.g., RIVN short vs. long semiconductor play). 

**On mechanics:** $3,840 notional on 5x leverage into a stock with intraday swings of 2–4% is sizing for a 2–3 hour hold, not a thesis trade—you got shaken out. If this was meant to be a multi-day short, you're overleveraged for RIVN's realized vol; if it was a scalp, the stop was too tight (1.36 points = 8.8% move, well within daily range). 

**Call:** Post the entry thesis and hold intent next time so we can right-size the leverage and stop placement to the timeframe. This feels like a sizing/structure miss, not a bad thesis.

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
- Risk budget: planned=$144.00, realized=$337.40, slippage=$193.40, breach=true
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
- Delta confidence: 0.4
- Delta window trades: 20
- Delta expiry: 2026-04-02T12:00:43.742Z

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
- PM_RISK_SLIPPAGE_USD: 193.4
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
  "holdMinutes": 206,
  "adverseMovePct": 8.737,
  "riskBudget": {
    "plannedRiskUsd": 144,
    "realizedRiskUsd": 337.4,
    "riskSlippageUsd": 193.4,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 8.737,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.4,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-04-02T12:00:43.742Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "equity": 4
      },
      "maxSingleTradeUsd": 3264
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
    "entryTimestampUtc": "2026-03-19T08:34:21.490Z",
    "exitTimestampUtc": "2026-03-19T12:00:29.927Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-19T08:34:21.490Z",
    "exitTimestampUtc": "2026-03-19T12:00:29.927Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 144,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ],
    "Oracle": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
