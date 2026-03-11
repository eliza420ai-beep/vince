# Post-mortem: SOL long (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- SOL long closed stop_loss: entry $91.68 -> exit $89.37, P&L $-327.13 (12764.5056 USD, 10x).
- Entry time (UTC): 2026-03-05T11:44:11.758Z
- Hold window target: intraday
- Max loss budget: $319.11 (25.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 218 minutes
- Adverse move: 2.513%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context:** CT sentiment *during* your entry and exit windows (timestamps), and whether macro headwinds (Fed, BTC dumps, etc.) were live when you got stopped. That said — SOL has been range-bound with retail sentiment fragile; if you entered into a local top without a macro tailwind or whale accumulation signal, you were fighting CT's indecision. Check if the stop was hit on a wick or sustained selling — wick stops in choppy sentiment are noise, but sustained breaks mean CT conviction shifted bearish. Next time, cross-check X_PULSE for macro/BTC vibe at entry to avoid fighting the sentiment current.

**Confidence: 0.6** (need timestamps + macro context to give you real post-mortem value)

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need the trade date/time and which Polymarket SOL prediction (if any) you were tracking—were you leaning on a weekly price range, or was this pure technicals? That said, the stop hit fast (~2.5% move), which suggests either thin liquidity on entry or you caught a volatility spike that the prediction markets didn't price in beforehand. If Poly had SOL weekly ranges trading tight around $90–$95, the move below $89 was an outlier event, not a regime shift—classic stop-hunt into thin support. Next time: cross-check the Poly orderbook depth and spreads before entry to size accordingly.

**Confidence: 0.4** (need trade timestamp and which Poly market you were hedging against to give you real regime feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** invalidation (what signal told you to stop?), entry thesis (support level, momentum, correlation?), and whether this was part of a hedge or standalone. That said: **$327 loss on $12.7K notional at 10x is reasonable risk management**—your stop was ~2.4% below entry, which is tight for SOL's typical intraday vol (~3–5% daily). The structure (defined loss, exit discipline) is sound; the issue is whether the invalidation was *premature* (stopped in noise) or *correct* (thesis broke). **Confidence: 0.6** (good mechanics, but need the thesis to assess if you should've sized differently or widened the stop).

## Root-Cause Tags

- Primary: regime_conflict
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

- Quality score: 94/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$319.11, realized=$327.13, slippage=$8.02, breach=true
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

- PM_QUALITY_SCORE: 94
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: sizing_too_aggressive
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 8.02
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 94,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [
    "sizing_too_aggressive"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 218,
  "adverseMovePct": 2.513,
  "riskBudget": {
    "plannedRiskUsd": 319.11,
    "realizedRiskUsd": 327.13,
    "riskSlippageUsd": 8.02,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 2.513,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 2.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T11:44:11.758Z",
    "exitTimestampUtc": "2026-03-05T15:22:25.365Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T11:44:11.758Z",
    "exitTimestampUtc": "2026-03-05T15:22:25.365Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 2.5,
    "maxLossUsd": 319.11,
    "maxLossPct": 25,
    "entryAtrPct": 5
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
