# Post-mortem: INTC short (max_age)

**Date:** 2026-03-21

## Trade Snapshot

- INTC short closed max_age: entry $44.10 -> exit $44.20, P&L $-1.71 (609.6383999999999 USD, 5x).
- Entry time (UTC): 2026-03-20T18:23:19.932Z
- Hold window target: intraday
- Max loss budget: $22.86 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.231%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Sentiment read on INTC short:**

INTC sentiment was mixed-to-bearish into your entry (chip cycle uncertainty, competition from NVDA/AMD), but the micro-move against you suggests either (1) a surprise positive headline hit X in your hold window, or (2) retail/algo support at that level. Without knowing your hold duration and what CT was saying *during* the trade, I can't pin whether this was macro headwinds or just noise. 

**Missing context:** What's your hold window (minutes/hours)? Did any INTC news drop on X while you were in? Was there a broader semicon rally or macro catalyst?

Confidence: 0.4 (need trade timing + CT sentiment during hold to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id

**Missing context:** Polymarket INTC condition_id, entry/exit dates, and your probability estimate at entry vs. market price at that moment—I need those to assess whether you were fighting the consensus or if the market repriced against you. **On the loss itself:** A 10-bps move (44.10 → 44.20) with 5x leverage on a $1.71 notional loss tracks; the real question is whether Polymarket's INTC pricing (or any linked macro signal) telegraphed that repricing before you exited, or if you hit a liquidity pocket. **Next step:** Pull the trade timestamp and I'll check what Polymarket thought INTC would do at that moment—if the market was pricing in upside and you were short, that's a regime mismatch, not a math error.

**Confidence: 0.4** (need market-

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, exit date, and what triggered the close (time decay, stop, liquidation risk, or manual exit?). That said: **5x on a $44 short is ~$220 notional—reasonable size—but the 10bp slippage ($0.10 move) ate into a thin-margin trade.** For INTC at that price, you need either (1) wider stops (20-30bp minimum) to survive noise, or (2) higher conviction thesis to justify the leverage. On paper, the mechanics are sound; the execution suggests either bad timing or undersized edge. **Next time: post entry thesis + stop level so we can assess risk/reward before close.**

Confidence: 0.65

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
- Risk budget: planned=$22.86, realized=$1.71, slippage=$-21.15, breach=false
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
- PM_RISK_SLIPPAGE_USD: -21.15
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
  "adverseMovePct": 0.231,
  "riskBudget": {
    "plannedRiskUsd": 22.86,
    "realizedRiskUsd": 1.71,
    "riskSlippageUsd": -21.15,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.231,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T18:23:19.932Z",
    "exitTimestampUtc": "2026-03-21T06:23:49.477Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T18:23:19.932Z",
    "exitTimestampUtc": "2026-03-21T06:23:49.477Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 22.86,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp",
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
