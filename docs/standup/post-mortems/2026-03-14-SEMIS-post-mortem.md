# Post-mortem: SEMIS long (max_age)

**Date:** 2026-03-14

## Trade Snapshot

- SEMIS long closed max_age: entry $387.18 -> exit $386.76, P&L $-6.24 (3955.3420718816064 USD, 5x).
- Entry time (UTC): 2026-03-14T01:31:06.830Z
- Hold window target: intraday
- Max loss budget: $59.33 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.108%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter/exit (time of day, date)? What was CT sentiment on SEMIS at entry vs. exit? Was there a macro event (Fed speak, jobs data, rate surprise) that shifted the vibe between those two timestamps?

Without the timing and sentiment backdrop, I can't tell you if you got caught in a flash liquidation cascade, missed a whale dump signal, or just got clipped by normal slippage on a tight range. The P&L itself (-$6.24 on a $1,935 notional move) is noise-level, but the *reason* matters for whether this repeats.

**Confidence: 0.2** — I need the entry/exit timestamps and what CT was saying about semiconductors at those moments to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing context:** Polymarket's SEMIS prediction (current odds + direction) at entry/exit, trade duration, and whether this was a mean-reversion or momentum play. Without the prediction-market signal you were tracking, I can't assess whether the close was prudent (market repriced against you) or premature (you exited before mean reversion). 

**What I need:** Pull the SEMIS condition_id and I'll get live odds + recent price history to map your entry/exit against market sentiment shift. That tells us if Polymarket was pricing in downside you missed, or if you left edge on the table.

**Confidence: 0.3** (regime call requires prediction-market data I don't have yet).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry date, hold duration, and whether this was part of a hedged pair or standalone. That said—5x leverage on SEMIS ($387 range) with a $6.24 stop is razor-thin (1.6% of entry); you got shaken out or slipped on exit. For a sector play with that vol, either size down to 2-3x and let it breathe, or tighten your thesis so the stop is at actual invalidation (support/trend break), not noise. One trade doesn't indict the bot, but if this is pattern—frequent small losses on tight stops—the issue is sizing to leverage ratio, not the signal.

**Confidence: 0.6** (need entry/exit timestamps and whether this was hedged to fully assess).

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

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$59.33, realized=$6.24, slippage=$-53.09, breach=false
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

- PM_QUALITY_SCORE: 79
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -53.09
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 79,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.108,
  "riskBudget": {
    "plannedRiskUsd": 59.33,
    "realizedRiskUsd": 6.24,
    "riskSlippageUsd": -53.09,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.108,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-14T01:31:06.830Z",
    "exitTimestampUtc": "2026-03-14T13:31:09.385Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-14T01:31:06.830Z",
    "exitTimestampUtc": "2026-03-14T13:31:09.385Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 59.33,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "condition_id"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
