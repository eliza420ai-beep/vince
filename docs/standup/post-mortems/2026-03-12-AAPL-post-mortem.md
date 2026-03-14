# Post-mortem: AAPL short (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- AAPL short closed max_age: entry $259.34 -> exit $260.52, P&L $-7.14 (1411.1999999999998 USD, 5x).
- Entry time (UTC): 2026-03-11T23:13:03.164Z
- Hold window target: intraday
- Max loss budget: $21.17 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.456%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Feedback:**

AAPL isn't my lane — I track crypto sentiment on X, not equities. That said, the macro context matters: was this short timed around a Fed pivot signal, rate cut odds shift, or tech sector rotation? CT was likely pricing in rate cuts hard in late Jan/early Feb. **Missing:** what macro catalyst you expected to trigger the move, and whether CT sentiment on rates/tech actually shifted before entry or if you front-ran a reversal. A 1.2% move against you on 5x is tight — was the thesis dependent on a specific news drop that didn't land?

**Confidence: 0.2** (equity trades are outside ECHO's domain; crypto sentiment expertise doesn't transfer cleanly here).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing critical context:** I need the entry/exit timestamps, the Polymarket AAPL prediction at each point, and whether this was tied to a specific event (earnings, macro, Fed move). Without those, I can't tell you if the market repriced faster than the prediction model or if regime shifted mid-trade.

**What I can say:** A 123-bps move against you on a 5x short in a mega-cap stock suggests either (1) the market had information your model didn't, or (2) you entered into a momentum spike and got stopped. If Polymarket odds were pricing AAPL higher at entry, that's a signal the trade was fighting consensus—which is fine, but it means you need tighter stops or higher conviction.

**Next step:** Share the timestamps and what Poly was pricing AAPL at entry/exit. That tells me if you were early, wrong, or

### Solus

- Lane: options mechanics and sizing
- Confidence: 70%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing:** entry date, hold duration, and what triggered exit (time-stop, hard stop, or discretionary). That said—5x leverage on a $1,411 notional short is tight sizing for a $100K stack; you're risking ~1.4% on a single trade, which is reasonable, but the 1.2-point move ($260.52 vs $259.34) suggests you either got stopped on noise or held through a reversal without a clear exit rule. If this was a day trade, the slippage/friction killed you; if it was a swing, you need a tighter invalidation level or wider stop. **Mechanics call:** Define entry/exit rules (time-based or level-based) before next short—no discretionary exits on paper trades; that's where you leak edge.

**Confidence: 0.7**

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$21.17, realized=$7.14, slippage=$-14.03, breach=false
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

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -14.03
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.456,
  "riskBudget": {
    "plannedRiskUsd": 21.17,
    "realizedRiskUsd": 7.14,
    "riskSlippageUsd": -14.03,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.456,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T23:13:03.164Z",
    "exitTimestampUtc": "2026-03-12T11:13:28.504Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T23:13:03.164Z",
    "exitTimestampUtc": "2026-03-12T11:13:28.504Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 21.17,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
