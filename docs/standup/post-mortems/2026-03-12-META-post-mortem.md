# Post-mortem: META short (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- META short closed max_age: entry $650.67 -> exit $651.84, P&L $-3.72 (1620.5849180327868 USD, 5x).
- Entry time (UTC): 2026-03-12T01:29:55.429Z
- Hold window target: intraday
- Max loss budget: $24.31 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.18%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter/exit (time window)? What was CT sentiment on META at entry vs. exit? Was there a macro catalyst (Fed speak, earnings, tech selloff) that shifted the vibe?

**On the loss itself:** A $3.72 move on a $650 short isn't the issue — 5x leverage on a mega-cap tech stock means you need macro or sentiment *conviction* to hold through chop. If CT was neutral-to-bullish on META during your hold, you were fighting the crowd. Next time, cross-check X sentiment before sizing into a contrarian trade like that.

**Confidence: 0.4** (need timestamps + CT vibe data to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need the trade date/time and the META prediction-market odds at entry/exit to assess regime. Was this a reaction to a Polymarket move (e.g., election/earnings uncertainty spiking the price), or did perp price lead and Poly lag? If perps moved first, that's a signal the market repriced faster than the prediction market reflected—your short entry may have been fighting information asymmetry rather than edge. Without the Poly odds snapshot, I can't tell if you were fading an overreaction or caught in a momentum regime where short-term flows trump fundamentals.

**Direct take:** $3.72 loss on 5x is tight—the trade had good risk management. The real question is whether META's brief pop was noise (retest of resistance) or a regime shift. If Poly stayed flat while perps ripped, that's actually useful signal: the desk's

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, exit date, IV environment, and whether this was a hedge or directional bet. That said: **5x leverage on a $1.17 move (0.18%) into a $651 stock is sizing for *volatility you didn't get*—META at that price typically has 20-30% IV, meaning $1-2 daily swings are baseline noise.** If this was a short vol play, you need wider invalidation (2-3% or a catalyst event); if directional, 5x is oversized for a no-conviction setup. **Post-mortem: reduce leverage to 2-3x on equity shorts, or size down notional by 60% if keeping 5x.**

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$24.31, realized=$3.72, slippage=$-20.59, breach=false
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
- PM_RISK_SLIPPAGE_USD: -20.59
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
  "holdMinutes": 720,
  "adverseMovePct": 0.18,
  "riskBudget": {
    "plannedRiskUsd": 24.31,
    "realizedRiskUsd": 3.72,
    "riskSlippageUsd": -20.59,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.18,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T01:29:55.429Z",
    "exitTimestampUtc": "2026-03-12T13:30:24.604Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T01:29:55.429Z",
    "exitTimestampUtc": "2026-03-12T13:30:24.604Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 24.31,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
