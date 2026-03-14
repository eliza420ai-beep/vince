# Post-mortem: SPACEX short (max_age)

**Date:** 2026-03-14

## Trade Snapshot

- SPACEX short closed max_age: entry $1661.27 -> exit $1680.00, P&L $-20.80 (1766.3462937062934 USD, 3x).
- Entry time (UTC): 2026-03-13T13:31:25.873Z
- Hold window target: intraday
- Max loss budget: $26.50 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 1.128%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** I need to know *when* you entered and exited (date/time) to run a sentiment backtest — was CT bullish or bearish on SPACEX at entry? Did sentiment shift before your exit? Also: what was your original thesis (macro headwind, retail FOMO, whale accumulation)?

Without the timing, I can't tell if sentiment diverged from your thesis or if you got caught in a broader macro reversal. Once you give me entry/exit timestamps, I can pull CT vibe from that window and flag whether sentiment was a leading or lagging indicator on this one.

**Confidence: 0.3** (can't assess sentiment impact without temporal context).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

I need the Polymarket condition for SpaceX (IPO timing? valuation range?) and the trade date to pull live odds and volume context—without that, I'm reading the P&L blind. That said: a $20.80 loss on a 3x short into a $19 move (1.2%) suggests tight stops in a choppy regime; if Poly was pricing >65% IPO probability at entry and you shorted into a dip, you likely got whipsawed by mean reversion into event uncertainty rather than a directional miss. **Missing fields:** Polymarket condition_id, entry/exit dates, Poly odds at entry/exit, volume profile.

**Confidence: 0.3** (need market context to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, exit signal (time-based vs. invalidation-triggered?), and whether 3x was pre-planned or drift. On mechanics alone: $1,661 short with 3x leverage = $4,983 notional risk; $20.80 loss = 0.42% drawdown on notional—small in absolute terms, but the leverage amplifies it. If this was a short-term tactical trade, the sizing is reasonable; if it was meant to be directional conviction, the exit speed suggests the thesis broke faster than expected. **Next time, log entry thesis + invalidation level before entry so we can diagnose whether the loss was bad structure or just bad timing.**

**Confidence: 0.6** (missing hold duration and exit trigger).

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
- Risk budget: planned=$26.50, realized=$20.80, slippage=$-5.70, breach=false
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
- PM_RISK_SLIPPAGE_USD: -5.7
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
  "adverseMovePct": 1.128,
  "riskBudget": {
    "plannedRiskUsd": 26.5,
    "realizedRiskUsd": 20.8,
    "riskSlippageUsd": -5.7,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.128,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T13:31:25.873Z",
    "exitTimestampUtc": "2026-03-14T01:31:29.476Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T13:31:25.873Z",
    "exitTimestampUtc": "2026-03-14T01:31:29.476Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 26.5,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
