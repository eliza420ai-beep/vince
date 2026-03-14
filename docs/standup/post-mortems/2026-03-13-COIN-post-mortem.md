# Post-mortem: COIN long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- COIN long closed stop_loss: entry $199.52 -> exit $196.34, P&L $-33.50 (2037.7865215881466 USD, 5x).
- Entry time (UTC): 2026-03-13T13:37:15.283Z
- Hold window target: intraday
- Max loss budget: $30.57 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 157 minutes
- Adverse move: 1.594%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** What was CT sentiment on COIN when you entered vs. exited? Was this a contrarian setup (CT bearish, you went long) or consensus trade (CT bullish)? Without the sentiment backdrop, I can't tell if you fought the crowd or rode it — that's the real lesson here.

**What I need:** Entry timestamp + your thesis (was this a reversal play, macro hedge, or something else?), and I'll run X_PULSE to see if CT was pricing in the move you caught the wrong side of.

Confidence: 0.3 (not enough signal to opine on trade quality)

### Oracle

- Lane: prediction market regime
- Confidence: 35%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket odds for COIN at entry/exit, trade duration, and what triggered the stop (volatility spike vs. directional move). That said—a 1.6% loss on 5x levered perps is tight risk management, which is solid. If Polymarket was pricing COIN higher than spot at entry, the edge was there; if it closed the gap or moved against you, that's regime shift, not execution error. Without the Poly snapshot, I can't tell if you exited early (good discipline) or got shaken out of a thesis that still had edge.

**Confidence: 0.35** (need Polymarket odds at entry/exit to assess regime).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, IV regime (if options), and whether this was part of a hedge or standalone. On mechanics: $33.50 loss on $199.52 entry = 1.68% drawdown; at 5x that's a 8.4% notional move against you. If this was a perp long in a bear/consolidation regime without a clear invalidation, the stop was tight relative to typical COIN chop—consider: was the entry thesis invalidated, or did you get shaken out? For paper trades, the real feedback is whether you'd take the same setup live (same size, same stop, same thesis). If yes, keep it; if no, the setup itself needs rework before scaling.

**Confidence: 0.6** (need hold duration + original thesis to assess if mechanics were sound or if entry selection was the issue).

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$30.57, realized=$33.50, slippage=$2.93, breach=true
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

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 2.93
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 157,
  "adverseMovePct": 1.594,
  "riskBudget": {
    "plannedRiskUsd": 30.57,
    "realizedRiskUsd": 33.5,
    "riskSlippageUsd": 2.93,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.594,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T13:37:15.283Z",
    "exitTimestampUtc": "2026-03-13T16:14:15.625Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T13:37:15.283Z",
    "exitTimestampUtc": "2026-03-13T16:14:15.625Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 30.57,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
