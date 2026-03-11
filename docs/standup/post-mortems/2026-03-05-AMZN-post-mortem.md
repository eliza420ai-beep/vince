# Post-mortem: AMZN long (max_age)

**Date:** 2026-03-05

## Trade Snapshot

- AMZN long closed max_age: entry $217.10 -> exit $216.24, P&L $-13.09 (2922.8032 USD, 5x).
- Entry time (UTC): 2026-03-05T00:25:59.609Z
- Hold window target: intraday
- Max loss budget: $43.84 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.398%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

Missing key context: **entry/exit timing** (when did you enter vs. when did you exit relative to Fed news, market open, earnings cycle?) and **what CT was saying about mega-cap tech at entry vs. exit**. 

Without that, I can't tell if you fought macro headwinds (e.g., rate hike fears, tech rotation) or just got shaken out on noise. A $0.86 move on 5x is tight — if you entered into bearish sentiment and exited into more bearish sentiment, that's macro/vibe working against you; if sentiment flipped bullish post-entry and you still lost, that's execution/sizing (ask Solus).

**What I need:** Entry date/time, exit date/time, and I'll pull CT sentiment for mega-cap tech at both points.

Confidence: 0.3 (incomplete data).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: **entry/exit timestamps, Polymarket AMZN prediction odds at both points, and the paper bot's thesis** (mean reversion, momentum, event-driven?). That said: a $0.86 move against you on 5x is tight—suggests either the bot caught a regime flip (volatility spike, earnings uncertainty, macro shift) or was whipsawed by intraday noise. Without knowing what Polymarket was pricing for AMZN sentiment/event risk at entry vs. exit, I can't tell if this was a regime miss or just unlucky timing in a choppy tape. **Pull the Poly odds context and I'll give you a sharp read on whether the thesis broke or the execution got caught in noise.**

Confidence: 0.3

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold time, and what triggered the exit (stop, target, or discretionary). That said, the mechanics flag: 5x leverage on a $217 stock with $13 slippage suggests tight stops or market impact on entry/exit—typical paper bot friction. On live execution, you'd want wider stops or smaller size to absorb slippage without whipsaws. If this was a scalp (hold <1h), the risk/reward was inverted; if longer-term, the leverage was too aggressive for a stock with that volatility profile. **Confidence: 0.6** (need hold time and exit trigger to assess position structure).

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$43.84, realized=$13.09, slippage=$-30.75, breach=false
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

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -30.75
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.398,
  "riskBudget": {
    "plannedRiskUsd": 43.84,
    "realizedRiskUsd": 13.09,
    "riskSlippageUsd": -30.75,
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
    "entryTimestampUtc": "2026-03-05T00:25:59.609Z",
    "exitTimestampUtc": "2026-03-05T12:26:08.434Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T00:25:59.609Z",
    "exitTimestampUtc": "2026-03-05T12:26:08.434Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 43.84,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
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
