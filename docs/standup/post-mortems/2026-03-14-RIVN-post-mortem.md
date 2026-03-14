# Post-mortem: RIVN short (stop_loss)

**Date:** 2026-03-14

## Trade Snapshot

- RIVN short closed stop_loss: entry $14.37 -> exit $14.60, P&L $-69.43 (4337.6256 USD, 5x).
- Entry time (UTC): 2026-03-14T10:30:44.904Z
- Hold window target: intraday
- Max loss budget: $65.06 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 20 minutes
- Adverse move: 1.551%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** I need to know (1) *when* you entered—was CT bearish on RIVN at that moment, or was sentiment already turning bullish?—and (2) *what triggered the stop*—did macro shift, or did RIVN-specific sentiment flip? Without the timing and sentiment backdrop at entry/exit, I can't tell if you fought the tape or if CT simply repriced faster than expected. That said, a 5x short on a legacy auto play is inherently fighting structural EV hype—CT's macro bias is still pro-EV, so shorting against that headwind is uphill. **Confidence: 0.3** (need entry/exit timestamps + CT vibe snapshot to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** entry timestamp, exit timestamp, and what Polymarket was pricing RIVN at entry/exit (probability and spread). That said: a $0.23 stop on a 5x short is tight for intraday volatility in a micro-cap EV name—you likely got shaken out by noise rather than a regime break. If Polymarket had RIVN bankruptcy/restructuring priced >15% at entry and <10% at exit, that's a real shift; if it stayed flat, you took directional whipsaw on leverage. Pull the Polymarket RIVN event odds at your entry time and we can compare signal-to-noise.

**Confidence: 0.4** (need market-pricing timestamps to assess if this was signal or slippage).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold duration, IV/volatility regime at entry vs exit, and whether this was part of a hedge or standalone directional bet—these matter for sizing assessment. **On the trade itself:** $14.37→$14.60 is a 1.6% move against you; at 5x leverage that's ~8% account loss, which is reasonable risk-per-trade, but the entry itself (short into a stock with high short-squeeze risk and no defined support below) suggests entry timing/invalidation wasn't tight. **Mechanic feedback:** Define your stop *before* entry as a % of notional or a hard support level; "stop loss" without the setup makes it reactive. **Next:** Post the hold time and what catalyst/level made you exit—that tells us if the position was sized right for the timeframe.

**Confidence: 0.65** (need entry date

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
- Risk budget: planned=$65.06, realized=$69.43, slippage=$4.37, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.37
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
  "holdMinutes": 20,
  "adverseMovePct": 1.551,
  "riskBudget": {
    "plannedRiskUsd": 65.06,
    "realizedRiskUsd": 69.43,
    "riskSlippageUsd": 4.37,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.551,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-14T10:30:44.904Z",
    "exitTimestampUtc": "2026-03-14T10:51:12.166Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-14T10:30:44.904Z",
    "exitTimestampUtc": "2026-03-14T10:51:12.166Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 65.06,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
