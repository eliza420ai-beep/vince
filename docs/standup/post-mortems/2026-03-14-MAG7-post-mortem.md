# Post-mortem: MAG7 long (max_age)

**Date:** 2026-03-14

## Trade Snapshot

- MAG7 long closed max_age: entry $59.98 -> exit $59.80, P&L $-13.98 (4112.0542372881355 USD, 5x).
- Entry time (UTC): 2026-03-13T17:47:46.588Z
- Hold window target: intraday
- Max loss budget: $61.68 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.29%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

Need key context: **When did you enter vs. exit?** (timing matters for sentiment read) and **what was CT saying about MAG7 at entry vs. exit?** (did you miss a macro pivot or was this just noise trade?). If this was a quick scalp into resistance on weak sentiment, the -$14 loss is just friction — but if you held through a sentiment flip (e.g., Fed pivot, tech earnings miss, AI narrative shift), that's worth flagging for next time. Without the timestamp and CT vibe at those two points, I can't tell you if you were early on a real thesis or caught in whipsaw.

**Confidence: 0.3** (missing critical timing/sentiment data).

### Oracle

- Lane: prediction market regime
- Confidence: 0%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Context missing:** Polymarket odds for MAG7 at entry and exit (what was the market pricing vs. your thesis?), trade duration (minutes? hours?), and whether this was a reaction trade or thesis-driven. That said: a $14 loss on a $60 long with 5x leverage suggests you got stopped or shaken out in noise—typical for short-duration perp trades when the underlying (equities/macro) lacks directional conviction. If Polymarket showed >55% odds on MAG7 strength at entry, the setup was right but execution/sizing/hold time was the leak; if odds were neutral-to-bearish, you were fighting the consensus. Pull the Polymarket MAG7 market detail (if one exists) and compare entry odds to exit odds—that tells you whether you misread the market or just got volatility-whipped.

**Confidence: 0.

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, IV regime at entry/exit, and whether this was part of a larger MAG7 hedge or standalone. That said: **5x leverage on a $59.98 entry with a $0.18 stop (0.3%) is mechanically unsound**—that's liquidation-tight sizing for equity vol, especially in a $100K stack where a single $13.98 loss shouldn't sting. If this was a scalp, the R:R doesn't justify the leverage; if it was a swing, the stop was too tight for MAG7 daily noise. **Feedback:** Either size down (2-3x max for equities) or widen stops to 1-2% (e.g., $59.40 entry → $58.40 stop). Paper trades are for proving edge, not testing max leverage.

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
- Risk budget: planned=$61.68, realized=$13.98, slippage=$-47.70, breach=false
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
- PM_RISK_SLIPPAGE_USD: -47.7
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
  "adverseMovePct": 0.29,
  "riskBudget": {
    "plannedRiskUsd": 61.68,
    "realizedRiskUsd": 13.98,
    "riskSlippageUsd": -47.7,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": false,
    "issues": [
      "truncated_agent_findings"
    ],
    "adverseMovePctFromPrices": 0.29,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": true
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T17:47:46.588Z",
    "exitTimestampUtc": "2026-03-14T05:47:59.880Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T17:47:46.588Z",
    "exitTimestampUtc": "2026-03-14T05:47:59.880Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 61.68,
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
