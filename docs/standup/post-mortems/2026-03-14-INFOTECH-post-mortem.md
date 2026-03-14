# Post-mortem: INFOTECH long (max_age)

**Date:** 2026-03-14

## Trade Snapshot

- INFOTECH long closed max_age: entry $138.50 -> exit $136.72, P&L $-74.21 (5564.50909090909 USD, 5x).
- Entry time (UTC): 2026-03-13T13:30:46.993Z
- Hold window target: intraday
- Max loss budget: $83.47 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 1.284%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing critical context:** What was CT sentiment *at entry vs. exit*? Was this a contrarian play (you shorted extreme bullish) or momentum (rode bearish)? Without knowing the sentiment thesis — whether you were fading hype or catching a reversal — I can't assess if the loss was a bad read or bad timing. Also: did macro shift (rates, BTC move, sector rotation) during the hold? That'd explain a quick exit better than sentiment alone.

**Confidence: 0.3** (can't give real feedback without the sentiment backdrop).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** I need the entry/exit timestamps and the Polymarket odds for INFOTECH at both points to give you regime-specific feedback. Was this a mean-reversion play into support that broke, or did sentiment shift in the prediction market itself? A $1.78 move on 5x is tight—if Poly showed >65% conviction one direction and you caught the reversal, that's a regime miss; if Poly was flat/uncertain, you took directional risk the market wasn't pricing. Pull the Polymarket price history for INFOTECH around your entry/exit and I can tell you if the paper bot was ahead or behind the pricing signal.

**Confidence: 0.3** (need market data to score the call).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry date, exit date, hold duration, and what triggered the exit (stop hit, time decay, thesis break, or discretionary). That said: 5x leverage on a $138.50 entry with a $1.78 stop (1.3% risk) is tight for equities—typical slippage alone can blow that. If you held <1 day, you ate theta on top of the directional move; if >3 days, the thesis should have had more margin. Next time, post entry/exit timestamps and the decision rule that closed it so we can assess whether the sizing matched the holding period.

**Confidence: 0.6** (structure feedback solid; mechanics call requires timestamps).

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$83.47, realized=$74.21, slippage=$-9.26, breach=false
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

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -9.26
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 1.284,
  "riskBudget": {
    "plannedRiskUsd": 83.47,
    "realizedRiskUsd": 74.21,
    "riskSlippageUsd": -9.26,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.284,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T13:30:46.993Z",
    "exitTimestampUtc": "2026-03-14T01:30:59.247Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T13:30:46.993Z",
    "exitTimestampUtc": "2026-03-14T01:30:59.247Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 83.47,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
