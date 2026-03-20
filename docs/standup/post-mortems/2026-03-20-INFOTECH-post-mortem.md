# Post-mortem: INFOTECH long (stop_loss)

**Date:** 2026-03-20

## Trade Snapshot

- INFOTECH long closed stop_loss: entry $137.61 -> exit $135.49, P&L $-79.31 (4992 USD, 5x).
- Entry time (UTC): 2026-03-20T11:10:23.595Z
- Hold window target: intraday
- Max loss budget: $74.88 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 432 minutes
- Adverse move: 1.539%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

Missing critical context: **What was CT's sentiment on INFOTECH when you entered?** Was there a divergence between whale conviction and retail hype that you were betting on, or did you enter into crowded bullish sentiment that reversed? Also—**what macro/on-chain catalysts broke during your hold?** Without the sentiment backdrop and timing, I can't tell if this was a mispriced thesis that got shaken out or a trade that ignored warning signals CT was already flashing. Run me a quick X_PULSE on INFOTECH sentiment from your entry window and I'll give you the real post-mortem.

Confidence: 0.3 (incomplete data—can't assess sentiment execution without entry context).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was your entry thesis (e.g., earnings surprise, sector rotation, macro tailwind)? Did Polymarket pricing on INFOTECH fundamentals shift between entry and exit, or was this pure momentum/liquidation cascade? Without knowing the regime (was this a mean-reversion fade or a trend follow that broke?), I can't isolate whether you got the market direction wrong or just got stopped in noise.

**If this was a mean-reversion short:** Check if Poly consensus on INFOTECH earnings/guidance shifted upward during your hold—that'd explain the stop hit; the market repriced fundamentals against you. **If this was a momentum long:** A 5x stop at 1.5% likely got clipped by intraday volatility or a sector flush; Poly volume and open interest on related macro (Fed, rates, growth) would tell you if the regime actually broke or

### Solus

- Lane: options mechanics and sizing
- Confidence: 75%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation thesis going in, and did price break it or did you just hit the stop mechanically? The 1.5% move down on INFOTECH (a mega-cap tech play) is normal noise—if your stop was set tighter than your thesis window, that's a sizing/structure problem, not a market problem. At 5x leverage on a $5K notional, you're risking $79 on a $137 entry, which is tight for intraday chop. **Call:** Either widen your stop to match your thesis invalidation (accept bigger loss if wrong) or drop leverage to 2–3x so a 1.5% move doesn't blow you out. Right now you're fighting your own structure.

**Confidence: 0.75** (solid on mechanics, but don't know your actual thesis or time horizon)

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

- Quality score: 95/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$74.88, realized=$79.31, slippage=$4.43, breach=true
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
- Delta confidence: 0.55
- Delta window trades: 20
- Delta expiry: 2026-04-03T18:22:45.791Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 95
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.43
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 95,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 432,
  "adverseMovePct": 1.539,
  "riskBudget": {
    "plannedRiskUsd": 74.88,
    "realizedRiskUsd": 79.31,
    "riskSlippageUsd": 4.43,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.539,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.55,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-04-03T18:22:45.791Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "other": 4
      },
      "maxSingleTradeUsd": 4243
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
    "entryTimestampUtc": "2026-03-20T11:10:23.595Z",
    "exitTimestampUtc": "2026-03-20T18:22:15.467Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:10:23.595Z",
    "exitTimestampUtc": "2026-03-20T18:22:15.467Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 74.88,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
