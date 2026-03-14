# Post-mortem: INTC long (max_age)

**Date:** 2026-03-14

## Trade Snapshot

- INTC long closed max_age: entry $45.73 -> exit $45.54, P&L $-20.27 (4372.157963280293 USD, 5x).
- Entry time (UTC): 2026-03-14T01:32:30.977Z
- Hold window target: intraday
- Max loss budget: $65.58 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.414%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter/exit (dates)? What was CT sentiment on INTC at entry vs. exit? Was this a macro play (Fed pivot, semis rotation) or a specific catalyst miss?

**Sentiment take:** INTC has been a contrarian crowded short on CT for months — retail was bearish, but that's often a trailing indicator. If you caught the tail end of a bounce, the sentiment hadn't flipped yet to confirm conviction. The 5x leverage on a $0.19 move tells me tight stops; sentiment whips can easily shake those out before a thesis plays.

**What I'd dig into:** Did CT have a bearish narrative that held through your hold window? If so, the trade was fighting sentiment gravity — harder to win that way.

Confidence: 0.6 (need entry/exit dates + your thesis to give sharper feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the entry/exit dates and the Polymarket odds for INTC at those timestamps to give you regime feedback—was the market repricing earnings risk, Fed sentiment, or chip cycle weakness? Without the market's probability at entry vs. exit, I can't tell if you got whipsawed by vol or if the market was signaling a reversal you missed. The 5x leverage on a $20 loss suggests tight stops; if Poly was pricing >60% downside risk at entry, that's a regime call worth reviewing.

**Confidence: 0.3**

(Ask me to pull live INTC Polymarket data if you want me to compare current odds to your entry/exit window—that'll give us the edge lens.)

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, exit date, and what triggered the close (time decay, stop hit, thesis break, or discretionary?). On mechanics alone: 5x leverage on a $45 stock with $20 loss suggests tight stops or quick exit—if you hit a stop, that's execution discipline, not a sizing error. If you exited discretionary on thesis break, the loss is acceptable tuition; if time decay ate you, that's a leverage + holding period mismatch (stocks aren't options—theta works against you on leverage). Rerun with entry/exit dates and close reason and I'll give you the structural call.

**Confidence: 0.3** (incomplete setup).

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
- Risk budget: planned=$65.58, realized=$20.27, slippage=$-45.31, breach=false
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
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -45.31
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
  "holdMinutes": 720,
  "adverseMovePct": 0.414,
  "riskBudget": {
    "plannedRiskUsd": 65.58,
    "realizedRiskUsd": 20.27,
    "riskSlippageUsd": -45.31,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.414,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-14T01:32:30.977Z",
    "exitTimestampUtc": "2026-03-14T13:32:42.418Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-14T01:32:30.977Z",
    "exitTimestampUtc": "2026-03-14T13:32:42.418Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 65.58,
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
