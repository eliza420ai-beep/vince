# Post-mortem: MSTR long (stop_loss)

**Date:** 2026-03-11

## Trade Snapshot

- MSTR long closed stop_loss: entry $140.63 -> exit $138.41, P&L $-64.69 (3975.111111111111 USD, 5x).
- Entry time (UTC): 2026-03-11T14:44:46.386Z
- Hold window target: intraday
- Max loss budget: $59.63 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 14 minutes
- Adverse move: 1.577%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit? (timing matters for sentiment read). Was there a macro/news event between entry and exit? Did CT flip on MSTR specifically, or was this a broad risk-off move?

**On sentiment alone:** If you entered into bullish MSTR/AI sentiment and exited into a broader macro dump or Fed headline, that's a timing miss—not a sentiment miss. If CT was already mixed/bearish on MSTR at entry, the trade setup was fighting headwinds from the jump. Post-mortem: Check whether your entry thesis matched CT's consensus at that moment, or if you were contrarian (which requires higher conviction + wider stops).

**Confidence: 0.4** — Need the exact timestamps and what CT was saying about MSTR + macro at entry/exit to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Was this a hedge against a Polymarket position (e.g., MSTR stock price prediction), or a standalone perp trade? The stop loss suggests tight risk management, but without knowing your thesis (directional bet, carry, correlation play), I can't assess whether the exit was premature or well-timed.

**If this was a Polymarket hedge:** Check if MSTR prediction markets moved *before* the perp liquidated—that lag tells you if you got whipsawed by spot vol vs. prediction-market repricing, or if both were moving together. The 1.6% drawdown on 5x is textbook stop-hunt territory; depends on whether the market repriced fundamentals or just shook out leverage.

**Regime read:** If macro Polymarkets (Fed, inflation, risk-off) spiked into your entry, MSTR tech-beta gets hit

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** position duration (hold time), invalidation trigger (why SL at that level?), and whether this was part of a pair trade or standalone. **On mechanics:** 5x leverage on a $140 entry is aggressive for a stock position—you're risking $64.69 notional on a $3,975 gross position, which is ~1.6% drawdown to trigger. That's tight; if MSTR's intraday vol is >1.5%, you'll get stopped frequently. **The call:** Either widen the SL (accept more drawdown, lower frequency), size down (reduce leverage to 2-3x), or confirm the invalidation was real before re-entry. Confidence: 0.65 (need hold duration and why that SL level).

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$59.63, realized=$64.69, slippage=$5.06, breach=true
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

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 5.06
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 14,
  "adverseMovePct": 1.577,
  "riskBudget": {
    "plannedRiskUsd": 59.63,
    "realizedRiskUsd": 64.69,
    "riskSlippageUsd": 5.06,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.577,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T14:44:46.386Z",
    "exitTimestampUtc": "2026-03-11T14:58:43.780Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T14:44:46.386Z",
    "exitTimestampUtc": "2026-03-11T14:58:43.780Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 59.63,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
