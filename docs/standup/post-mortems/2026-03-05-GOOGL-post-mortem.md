# Post-mortem: GOOGL long (max_age)

**Date:** 2026-03-05

## Trade Snapshot

- GOOGL long closed max_age: entry $303.93 -> exit $301.04, P&L $-41.59 (4153.9839999999995 USD, 5x).
- Entry time (UTC): 2026-03-05T00:33:23.926Z
- Hold window target: intraday
- Max loss budget: $62.31 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 871 minutes
- Adverse move: 0.951%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** Did this trade align with CT sentiment at entry/exit? Was macro (Fed speak, equity futures, BTC correlation) bullish or bearish when you entered? Without the timestamp and what crypto Twitter was saying about equities/tech at those price levels, I can't tell if you fought sentiment or ignored a contrarian setup.

**What I'd need:** Entry time, exit time, and whether you checked macro pulse (equity futures, Fed calendar, BTC correlation) before entry. That's how I'd assess if sentiment was a headwind or if you just got unlucky on a sound thesis.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need the trade window (date/time), the Polymarket prediction for GOOGL at entry and exit, and what regime signal triggered the long (macro, technicals, vol crush?). Without those, I can't tie the loss to mispricing vs. regime shift.

**What I can say:** A $41.59 loss on a 5x levered position at that price level suggests either tight stops (good discipline) or a whipsaw through support—Polymarket odds at entry would tell us if the market was pricing a reversal already. If Poly was >60% for downside and you went long anyway, that's a regime/sentiment mismatch; if Poly was bullish and it flipped, that's a signal failure.

**Ask VINCE:** Pull the Polymarket GOOGL prediction market snapshot from that window—I can compare fair value to your entry and tell you

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** invalidation thesis (what price/signal would've closed it earlier?), hold duration (hours? days?), and whether this was part of a pair trade or standalone. **On mechanics alone:** 5x leverage on a $303 stock with a $2.89 loss (0.95%) is tight—you got stopped or exited on noise, not invalidation. If you held for hours and took a small %, that's execution friction; if you held days waiting for reversal and got stopped, the thesis broke earlier and you didn't exit. **Next:** Define your stop *before* entry (e.g., "close if GOOGL breaks $302 support OR funding flips bearish"), then post-trade ask: did you hit that stop, or did you exit on something else? That tells us if it's a sizing problem (5x too much) or a thesis problem (you didn't have one

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
- Risk budget: planned=$62.31, realized=$41.59, slippage=$-20.72, breach=false
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
- PM_RISK_SLIPPAGE_USD: -20.72
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
  "holdMinutes": 871,
  "adverseMovePct": 0.951,
  "riskBudget": {
    "plannedRiskUsd": 62.31,
    "realizedRiskUsd": 41.59,
    "riskSlippageUsd": -20.72,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.951,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T00:33:23.926Z",
    "exitTimestampUtc": "2026-03-05T15:04:27.002Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T00:33:23.926Z",
    "exitTimestampUtc": "2026-03-05T15:04:27.002Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 62.31,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
