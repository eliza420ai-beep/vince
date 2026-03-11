# Post-mortem: MU short (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- MU short closed stop_loss: entry $384.37 -> exit $390.34, P&L $-66.05 (4122.268656716417 USD, 5x).
- Entry time (UTC): 2026-03-05T17:41:02.158Z
- Hold window target: intraday
- Max loss budget: $61.83 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 158 minutes
- Adverse move: 1.552%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT saying about MU that day — was there a bullish thesis dominating, or was sentiment already mixed? Did macro (Fed, rates, tech sector) shift during your hold?

**On the loss itself:** A 4.1% move against you on a 5x lever is tight — suggests either timing (entered into momentum you didn't catch) or sentiment shifted faster than price. If CT flipped bullish on semis/AI demand mid-trade, that's a vibe miss, not a risk miss.

**What I need to help:** Entry timestamp + what the X/CT narrative was that morning. Then I can tell you if sentiment was against you from the jump or if it turned.

Confidence: 0.3 (can't assess without trade context + CT pulse from entry day)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing context:** I need the Polymarket condition_id for the MU trade (or the specific market—e.g., "MU above $390 by [date]?") to pull live odds and see what the market priced that move at entry/exit. Without that, I can't compare your entry thesis to what prediction markets were saying about MU's probability at that level.

**What I can say:** A 1.5% stop on a 5x short is tight for a stock with MU's vol profile—you likely got shaken out on noise. If Polymarket had MU at $390+ with >70% confidence and you were short at $384, the regime was already pricing a breakout; that's a regime miss, not execution.

**Next time:** Pull the market odds for that specific MU level before entry—it's your regime checkpoint. If Poly says "70% chance M

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

Stop loss hit 1.5% above entry on a 5x short—tight stop for leverage that size, especially in semis where intraday swings are common. Missing: (1) entry thesis invalidation trigger, (2) IV/vol regime at entry, (3) position hold time. If this was a quick scalp (< 1h), the stop was reasonable; if it was a swing setup (4h+), you're getting shaken out by noise. Tighten entry conviction or widen stops on longer timeframes—don't let structure force exits on thesis-intact moves.

Confidence: 0.65

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

- Quality score: 89/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$61.83, realized=$66.05, slippage=$4.22, breach=true
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

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.22
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 158,
  "adverseMovePct": 1.552,
  "riskBudget": {
    "plannedRiskUsd": 61.83,
    "realizedRiskUsd": 66.05,
    "riskSlippageUsd": 4.22,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.552,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T17:41:02.158Z",
    "exitTimestampUtc": "2026-03-05T20:19:30.704Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T17:41:02.158Z",
    "exitTimestampUtc": "2026-03-05T20:19:30.704Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 61.83,
    "maxLossPct": 7.5,
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
