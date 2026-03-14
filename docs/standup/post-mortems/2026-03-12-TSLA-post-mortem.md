# Post-mortem: TSLA short (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- TSLA short closed max_age: entry $405.88 -> exit $407.87, P&L $-7.63 (1411.1999999999998 USD, 5x).
- Entry time (UTC): 2026-03-11T23:13:02.330Z
- Hold window target: intraday
- Max loss budget: $21.17 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.491%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Sentiment read on TSLA short:**

TSLA is HIP-3 listed, so I can flag CT macro vibe—but I'm missing critical context: **When did you enter/exit? (date/time)** and **What was CT sentiment on TSLA/macro at entry vs. exit?** Without the timestamp, I can't tell you if you got whipsawed by a surprise macro catalyst (Fed pivot, Elon news, rate expectations shift) or just caught a counter-trend bounce. The 2-point move on 5x is tight—if it was intraday noise vs. a sentiment shift, that's two different post-mortems. 

**Quick ask:** Run the trade dates by me and I'll pull CT vibe for those windows to see if sentiment turned against you or if it was just volatility.

Confidence: 0.3 (too little data to assess

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

VINCE—solid setup, unlucky exit. TSLA was pricing in a tight range into earnings uncertainty; your short at $405.88 had edge if the market was overweighting upside volatility, but the $2 move against you suggests late-session momentum or gamma squeeze (call ladder?). The real question: was your entry thesis *regime-dependent* (e.g., "rate cut odds drop → TSLA reprices lower") and did that thesis break, or was it just a 5-min tactical short that got stopped? Without the Polymarket TSLA event odds at entry/exit or your paper bot's signal rationale, I can't isolate whether this was a model miss or pure bad luck on timing. Next time, cross-check your entry thesis against what the prediction markets priced for the catalyst you were betting on.

**Confidence: 0.6** (missing entry signal type and

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Mechanics feedback:**

5x leverage on a $1,400 notional short is aggressive for a paper trade—you're testing conviction, not edge. Missing: entry signal (technicals? funding?), hold time, and whether this was part of a hedge or standalone directional bet. On structure: $2 move (0.5%) wiped the trade; at 5x that's a 2.5% account swing. For paper validation, size down to 2x and require a tighter invalidation (e.g., "break of $410 = stop") so you can run more reps and isolate *why* the signal failed vs. just "TSLA went up." 

**Confidence: 0.6** (solid sizing question, but need your process/signal to give a real call).

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
- Risk budget: planned=$21.17, realized=$7.63, slippage=$-13.54, breach=false
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
- PM_RISK_SLIPPAGE_USD: -13.54
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
  "adverseMovePct": 0.491,
  "riskBudget": {
    "plannedRiskUsd": 21.17,
    "realizedRiskUsd": 7.63,
    "riskSlippageUsd": -13.54,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.491,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T23:13:02.330Z",
    "exitTimestampUtc": "2026-03-12T11:13:28.498Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T23:13:02.330Z",
    "exitTimestampUtc": "2026-03-12T11:13:28.498Z"
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
    "Echo": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
