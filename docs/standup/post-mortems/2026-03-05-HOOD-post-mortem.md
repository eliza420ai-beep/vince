# Post-mortem: HOOD long (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- HOOD long closed stop_loss: entry $85.10 -> exit $82.16, P&L $-105.16 (2999.300112570356 USD, 5x).
- Entry time (UTC): 2026-03-05T10:41:23.109Z
- Hold window target: intraday
- Max loss budget: $44.99 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 263 minutes
- Adverse move: 3.456%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on HOOD at entry vs. exit? Was there a macro event or earnings catalyst between entry and stop?

**Sentiment take (provisional):** HOOD trades on retail flow + macro risk-on/risk-off — if you entered into a bearish macro pulse or post-Fed hawkish data, that's a headwind no sentiment edge fixes. Check if CT was rotating out of fintech at entry; if so, you fought the tape.

**Confidence: 0.4** (need entry timestamp + CT vibe snapshot to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: entry/exit timestamps, Polymarket HOOD prediction at those points, and whether this was a perps scalp or swing setup. That said: a 3.5% stop hit on 5x leverage in a single stock is tight positioning for intraday chop—if HOOD was ranging and Poly showed no directional consensus, the regime was choppy and your stop was vulnerable to noise. Pull the Poly odds at entry/exit timestamps and cross against your thesis; if they diverged materially, that's your signal that the market repriced the setup mid-trade.

Confidence: 0.4

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Stop hit at -3.5% on 5x leverage = -17.5% notional loss—that's tight risk management, good discipline.** Missing: entry thesis (support level? catalyst?), hold duration, and whether this was part of a planned pair trade (e.g., short competing ticker). The mechanics are sound; the question is whether HOOD was the right vehicle for that thesis or if a different structure (smaller size, wider stop, hedge) would've fit better. **Confidence: 0.6** (solid execution, incomplete context on intent).

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

- Quality score: 89/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$44.99, realized=$105.16, slippage=$60.17, breach=true
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

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 60.17
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 263,
  "adverseMovePct": 3.456,
  "riskBudget": {
    "plannedRiskUsd": 44.99,
    "realizedRiskUsd": 105.16,
    "riskSlippageUsd": 60.17,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 3.456,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T10:41:23.109Z",
    "exitTimestampUtc": "2026-03-05T15:04:27.118Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T10:41:23.109Z",
    "exitTimestampUtc": "2026-03-05T15:04:27.118Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 44.99,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
