# Post-mortem: XYZ100 long (max_age)

**Date:** 2026-03-05

## Trade Snapshot

- XYZ100 long closed max_age: entry $25187.04 -> exit $25137.00, P&L $-10.33 (4153.9839999999995 USD, 5x).
- Entry time (UTC): 2026-03-05T00:33:19.548Z
- Hold window target: intraday
- Max loss budget: $62.31 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 871 minutes
- Adverse move: 0.199%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Sentiment/macro context needed to give you real feedback:**

What was CT saying about BTC macro at entry vs. exit? (Was there a macro shift—Fed news, inflation data, geopolitical event—that flipped sentiment and you didn't catch the reversal signal?) Were whales accumulating or distributing into your entry? Did on-chain flow or large account positioning contradict the setup?

Without the **timing of sentiment shift relative to your entry/exit**, I can't tell you if this was a "sentiment read miss" or just tight stops on a choppy move. The loss itself ($10.33 on a $25k entry) is noise—what matters is whether CT gave you a warning you ignored.

**Confidence: 0.3** — I need the macro/sentiment context around your trade window to give you actionable feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id

**Missing context:** I need the entry/exit timestamps, the XYZ100 condition_id, and what regime signal (overreaction, Synth forecast, macro) triggered the long. Without those, I can't connect the $50 move to Polymarket pricing or tell you if the setup was sound but timed wrong vs. the thesis broke.

**What I can say:** A 4-basis-point loss on 5x levered perps over that holding period suggests either tight stops (good risk discipline) or a quick reversal—both are regime-dependent. If XYZ100 was hedging a Polymarket short, the loss may have been a cost-of-carry or liquidity spike; if it was a directional bet on a Synth edge, I'd want to see whether Poly repriced after entry.

**Next step:** Share the timestamps and what edge signal you were trading, and

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry/exit timing (how long held?), IV regime at entry/exit, funding rate at entry, and whether this was a hedge or directional bet. **Mechanics note:** At 5x leverage on a $25K index, a $10 move (0.04%) wiped $4.1K—that's correct math but suggests tight stop or adverse slippage on entry/exit. **Call:** If this was a paper trade to test execution, the loss is noise; if it's part of a live sizing plan, you're overleveraged relative to your edge window (need tighter thesis or smaller size). **Confidence: 0.6** (need timing + thesis intent to assess structure properly).

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
- Risk budget: planned=$62.31, realized=$10.33, slippage=$-51.98, breach=false
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
- PM_RISK_SLIPPAGE_USD: -51.98
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
  "holdMinutes": 871,
  "adverseMovePct": 0.199,
  "riskBudget": {
    "plannedRiskUsd": 62.31,
    "realizedRiskUsd": 10.33,
    "riskSlippageUsd": -51.98,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.199,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T00:33:19.548Z",
    "exitTimestampUtc": "2026-03-05T15:04:26.923Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T00:33:19.548Z",
    "exitTimestampUtc": "2026-03-05T15:04:26.923Z"
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
    "Oracle": [
      "timestamp",
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
