# Post-mortem: TSLA short (max_age)

**Date:** 2026-03-13

## Trade Snapshot

- TSLA short closed max_age: entry $397.29 -> exit $397.11, P&L $-0.12 (2622.799872 USD, 5x).
- Entry time (UTC): 2026-03-13T02:09:59.539Z
- Hold window target: intraday
- Max loss budget: $39.34 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.045%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** I need to know *when* you entered/exited (date/time) and *what CT sentiment was at those moments* — was there a macro shock, Fed news, or sentiment reversal between entry and exit? A $0.18 move on a 5x TSLA short screams tight stop, but without the sentiment timeline I can't tell you if you were fighting a momentum wave or if macro shifted against you mid-trade.

If this was intraday noise (sub-hour), sentiment probably wasn't the issue — execution/timing was. If it spanned hours/days, I'd want to cross-check X vibe on TSLA, macro, and market structure at both timestamps.

**Confidence: 0.3** (can't assess sentiment lane without the temporal context).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the entry/exit timestamps and which Polymarket TSLA prediction (weekly/monthly expiry, specific strike band) informed the short thesis—without knowing what odds you were trading against, I can't assess if the market repriced against you or if the thesis itself was off.

That said: **$0.18 move on a 5x short is tight friction, which is good execution**, but on TSLA micro-moves like this, regime matters—was this a mean-reversion scalp into support, or a directional short? If the former, the fact you exited flat (not deeper red) suggests the market didn't confirm your edge; if the latter, Polymarket weeklies may have shifted probability in favor of upside, which would've killed the thesis before price moved much.

**Next time:** Pair the perps trade with the Polymarket odds at entry and exit—that

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** Entry date, exit date, duration held, IV/volatility at entry vs exit, and whether this was a hedge or directional bet. On mechanics alone: $397.29→$397.11 is a $0.18 move (0.045%) on a $2,622 notional position (5x leverage)—you were fighting slippage and micro-moves with no room for error; that's a structure problem, not a sentiment problem. If this was meant to be a short-term scalp, the sizing was too tight for the timeframe; if it was a hedge, you need to know *what* you were hedging and whether the hedge worked on a portfolio level, not in isolation. **Confidence: 0.3** (can't assess without dates, hold time, and position context).

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
- Risk budget: planned=$39.34, realized=$0.12, slippage=$-39.22, breach=false
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
- PM_RISK_SLIPPAGE_USD: -39.22
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
  "adverseMovePct": 0.045,
  "riskBudget": {
    "plannedRiskUsd": 39.34,
    "realizedRiskUsd": 0.12,
    "riskSlippageUsd": -39.22,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.045,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T02:09:59.539Z",
    "exitTimestampUtc": "2026-03-13T14:10:11.011Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T02:09:59.539Z",
    "exitTimestampUtc": "2026-03-13T14:10:11.011Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 39.34,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
