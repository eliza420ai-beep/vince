# Post-mortem: MAG7 long (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- MAG7 long closed max_age: entry $61.76 -> exit $61.69, P&L $-2.43 (1494.6471849056604 USD, 5x).
- Entry time (UTC): 2026-03-12T01:29:29.741Z
- Hold window target: intraday
- Max loss budget: $22.42 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.112%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (dates/times)? What was CT sentiment on MAG7 at entry vs. exit? Was there a macro event or earnings surprise that moved it?

**On the trade itself:** A $2.43 loss on a 5x MAG7 long is tight — you got shaken out on noise, not a fundamental break. Sentiment-wise, if CT was still net bullish on tech/mag7 during your hold, the exit timing matters more than direction. If you exited into a wave of bearish macro posts (Fed, recession talk), that's a legitimate sentiment-driven stop; if you exited on intraday chop, that's just volatility tax.

**What I'd need to give you real feedback:** Entry and exit timestamps, plus a quick X_PULSE from those windows to see if sentiment actually shifted or if you got whipsawed

### Oracle

- Lane: prediction market regime
- Confidence: 25%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry/exit timestamps, which Polymarket MAG7 contracts were live at those times, and their odds at your entry/exit—I need those to assess whether the market was pricing tail risk or consensus had already shifted. A $0.07 move on 5x is tight execution, but on a $61-ish underlying that's ~11bps slippage; the real question is whether Poly showed conviction (>65% either direction) that you missed, or if it was range-bound chop. Without the market-odds snapshot, I can't tell if you got caught in a mean-reversion trap or if the regime genuinely turned against you mid-hold.

**Confidence: 0.25** (need Poly prices at entry/exit and hold duration to give you actionable feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, exit date, hold duration, IV regime at entry/exit, and what triggered the close (stop hit, time decay, rebalance). That said: **5x leverage on a $61.76 stock with a $2.43 loss is mechanically sound risk management**—you sized the position to lose ~$1.5K on a small adverse move, which is appropriate for paper. The real question is whether MAG7 was the right *vehicle* (equity vs perp vs options) for your thesis at that moment. If this was a hedge or delta-neutral play, the loss is noise; if it was a directional bet, you need to validate entry logic (IV, technicals, catalyst timing) before re-entry. **Confidence: 0.6** (structure was fine; strategy fit unclear).

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$22.42, realized=$2.43, slippage=$-19.99, breach=false
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

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -19.99
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.112,
  "riskBudget": {
    "plannedRiskUsd": 22.42,
    "realizedRiskUsd": 2.43,
    "riskSlippageUsd": -19.99,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.112,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T01:29:29.741Z",
    "exitTimestampUtc": "2026-03-12T13:29:48.615Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T01:29:29.741Z",
    "exitTimestampUtc": "2026-03-12T13:29:48.615Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 22.42,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
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
