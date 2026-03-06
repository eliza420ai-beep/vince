# Post-mortem: SNDK short (max_age)

**Date:** 2026-03-06

## Trade Snapshot

- SNDK short closed max_age: entry $567.71 -> exit $575.24, P&L $-56.76 (4122.268656716417 USD, 5x).
- Entry time (UTC): 2026-03-05T17:37:31.758Z
- Hold window target: intraday
- Max loss budget: $61.83 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 1.327%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter/exit (dates/times)? What was CT sentiment on SNDK during your hold — was it bullish, neutral, or already pricing in a move? Did you check whale positioning or any breaking news on the stock during the trade window?

**Sentiment take:** SNDK is a HIP-3 stock, so it moves on macro + tech sentiment. If CT was bullish on semiconductors or mega-cap tech during your hold, that's headwind. A 4x leveraged short in a risk-on macro environment is fighting the tape — even if the thesis is sound, sentiment can keep a stock bid longer than your margin can stay solvent.

**Ask Vince:** Did macro/CT flip bullish between entry and exit? That's the real culprit here, not your short thesis.

**Confidence: 0.6** (need timestamps + CT vibe

### Oracle

- Lane: prediction market regime
- Confidence: 20%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id

**Missing context:** I need the Polymarket odds for SNDK at entry and exit (or the condition_id) to assess whether the market was pricing in the move you got stopped on. Without that, I can't tell you if this was a regime shift the prediction market saw coming or just volatility you got leveraged into.

**What I'd need:** Entry/exit timestamps, the specific SNDK contract (earnings play? price target?), and ideally what Poly was showing for directional conviction at those moments. That tells us if paper bot should've been more cautious on that particular setup.

**Confidence: 0.2** — can't give regime feedback without the market-pricing data.

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry date, hold duration, IV/vol regime at entry vs exit, and whether this was a hedge or standalone short. That said: **5x leverage on a $567 semi-cap short is aggressive sizing for a paper bot learning phase**—typical edge in semis requires <3x or tighter stops. The $56 loss on $4,122 notional (1.4% move against you) suggests either (1) entry timing into momentum, or (2) stop placement too tight for the asset's typical intraday range. **For next trade: reduce leverage to 2-3x, widen stops by half a standard deviation, and log hold duration so we can measure edge window.** If this was a hedge pair (long something else), that changes the assessment entirely.

**Confidence: 0.4** — need entry timestamp, hold time, and position context to grade the structure properly.

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

- Quality score: 77/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$61.83, realized=$56.76, slippage=$-5.07, breach=false
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

- PM_QUALITY_SCORE: 77
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -5.07
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 77,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 1.327,
  "riskBudget": {
    "plannedRiskUsd": 61.83,
    "realizedRiskUsd": 56.76,
    "riskSlippageUsd": -5.07,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.327,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T17:37:31.758Z",
    "exitTimestampUtc": "2026-03-06T05:38:01.312Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T17:37:31.758Z",
    "exitTimestampUtc": "2026-03-06T05:38:01.312Z"
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
      "timestamp"
    ],
    "Oracle": [
      "timestamp",
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
