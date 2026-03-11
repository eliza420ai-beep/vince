# Post-mortem: US500 long (max_age)

**Date:** 2026-03-05

## Trade Snapshot

- US500 long closed max_age: entry $687.28 -> exit $684.54, P&L $-18.62 (4153.9839999999995 USD, 5x).
- Entry time (UTC): 2026-03-05T00:33:21.417Z
- Hold window target: intraday
- Max loss budget: $62.31 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 871 minutes
- Adverse move: 0.398%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (dates/times)? What was CT sentiment on US500/macro at entry and exit? Were there macro events (Fed, jobs, geopolitics) that shifted the vibe between those points?

Without the sentiment timeline, I can't tell you if CT missed the reversal signal or if macro headwinds caught you off-guard. The loss is small relative to your size (0.45%), but sentiment usually telegraphs these moves 4–12h before price confirms.

**What I need:** Entry/exit timestamps + what CT was saying about equities/macro at both points. Then I can tell you if this was a "CT got it wrong" or a "macro blind spot" post-mortem.

**Confidence: 0.2** (can't assess sentiment impact without the timeline).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** entry/exit timestamps, Polymarket odds on US500 direction at those times, and whether this was a reversion trade (mean-revert the overreaction) or directional conviction. That said: a $4.2K loss on a $687 entry with 5x leverage is a clean 0.6% drawdown—well within normal slippage for paper. The real question is *why* you exited: did Poly odds flip against you, or did you hit a stop? If Poly was still pricing >55% for your direction at exit, that's a regime miss (you got shaken out of a valid edge). If Poly had already repriced to <45%, you dodged a bigger loss. **Need:** entry/exit time, Poly odds at both, and trade thesis (reversion vs conviction).

**Confidence: 0.3** (without timestamps and

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context blocks the full call:** entry date/exit date (how long held?), IV/vol regime at entry vs exit, correlation to BTC at close, and whether this was part of a hedge or standalone directional bet. On mechanics alone: 5x leverage on $4,154 notional is tight sizing for US500 (low vol, wide spreads)—you got stopped in noise, not a structural break. If this was a 1-2 day hold, that's a time-decay tax on perps you can't escape; if longer, check whether you were fighting a macro headwind (BTC down? equities risk-off?). **Next:** paste entry/exit timestamps and BTC price action that day so I can assess whether this was bad structure or just bad timing.

**Confidence: 0.4** (mechanics visible, but directional context missing).

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
- Risk budget: planned=$62.31, realized=$18.62, slippage=$-43.69, breach=false
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
- PM_RISK_SLIPPAGE_USD: -43.69
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
  "holdMinutes": 871,
  "adverseMovePct": 0.398,
  "riskBudget": {
    "plannedRiskUsd": 62.31,
    "realizedRiskUsd": 18.62,
    "riskSlippageUsd": -43.69,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.398,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T00:33:21.417Z",
    "exitTimestampUtc": "2026-03-05T15:04:26.993Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T00:33:21.417Z",
    "exitTimestampUtc": "2026-03-05T15:04:26.993Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 62.31,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
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
