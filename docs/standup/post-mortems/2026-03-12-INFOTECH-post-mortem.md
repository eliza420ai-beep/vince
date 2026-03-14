# Post-mortem: INFOTECH long (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- INFOTECH long closed max_age: entry $139.51 -> exit $139.20, P&L $-4.05 (1494.6471849056604 USD, 5x).
- Entry time (UTC): 2026-03-12T01:29:31.329Z
- Hold window target: intraday
- Max loss budget: $22.42 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.221%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter/exit (dates/times)? What was CT sentiment on INFOTECH during those windows? Was this a contrarian fade or consensus trade? Without the timing and what X was saying about the stock, I can't tie the loss to a sentiment miss vs. pure execution/sizing.

**What I'd need to give you real feedback:** Run X_PULSE on INFOTECH for the entry/exit dates, and I'll tell you if CT mispriced it, if you fought consensus, or if sentiment shifted mid-trade.

Confidence: 0.3 (can't assess sentiment lane without the X data and trade window).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** entry/exit timestamps, the Polymarket odds at those points, and what triggered the exit—was it a stop-hit or conviction shift? That said, a $4 move on a $139 entry (2.9% drawdown) on 5x is tight management, which is good. Without knowing whether INFOTECH's Poly price was pricing a different regime at entry vs. exit, I can't isolate whether this was slippage/noise or a genuine regime miss. Pull the market odds from when you entered and exited, and I can tell you if Poly was signaling the move before you saw it in the perps flow.

**Confidence: 0.3**

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, exit date, duration held, IV/vol environment at entry vs exit, and whether this was a hedge or directional bet. On mechanics alone: $139.51→$139.20 is -0.22% move; at 5x leverage that's -1.1% PNL, which math checks. The real issue isn't the loss—it's whether you sized into a low-conviction setup (tight stop, thin edge) or got shaken by intraday noise. If this was a 1–2 day hold on a sector thesis, the leverage was too high for the timeframe; if it was a week-long thesis with a hard invalidation, sizing was OK but entry was wrong. **Post-mortem call:** paste entry thesis, duration, and what broke the thesis—then I can tell you if it's a sizing problem or a thesis problem.

**Confidence:

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

- Quality score: 75/100
- Escalate to Sentinel: true
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$22.42, realized=$4.05, slippage=$-18.37, breach=false
- Consistency checks: fail (truncated_agent_findings)

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

- PM_QUALITY_SCORE: 75
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -18.37
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 75,
  "qualityEscalate": true,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.221,
  "riskBudget": {
    "plannedRiskUsd": 22.42,
    "realizedRiskUsd": 4.05,
    "riskSlippageUsd": -18.37,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": false,
    "issues": [
      "truncated_agent_findings"
    ],
    "adverseMovePctFromPrices": 0.221,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": true
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T01:29:31.329Z",
    "exitTimestampUtc": "2026-03-12T13:29:48.624Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T01:29:31.329Z",
    "exitTimestampUtc": "2026-03-12T13:29:48.624Z"
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
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
