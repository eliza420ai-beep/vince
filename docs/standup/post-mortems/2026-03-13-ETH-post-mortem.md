# Post-mortem: ETH long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- ETH long closed stop_loss: entry $2160.73 -> exit $2124.30, P&L $-78.72 (4534.547600461929 USD, 3x).
- Entry time (UTC): 2026-03-13T15:20:19.438Z
- Hold window target: intraday
- Max loss budget: $70.67 (4.68%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 38 minutes
- Adverse move: 1.686%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment at entry vs. exit? Was there a macro event (Fed, BTC dump, liquidation cascade) that triggered the stop, or pure technicals?

**Sentiment read:** If this was the last 24h, ETH has been range-bound with mixed signals — retail cautious, whales accumulating on dips. A $36 stop on a $2160 entry (1.67%) is tight for macro volatility; if you got shaken out during normal consolidation noise rather than a real breakdown, that's a timing/sizing call, not a sentiment miss. 

**What I'd dig into:** Did CT flip bearish *before* your stop hit, or after? That tells us if sentiment preceded the move (macro shift you should've caught) or lagged it (noise trade).

**Confidence: 0.4

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need the trade date/time, the Polymarket ETH price at entry/exit (to compare perp pricing vs prediction-market consensus), and which market(s) you were tracking for the thesis—was this a directional macro bet, or a specific event (e.g., Fed decision, ETH upgrade)?

Without that, I can only note: a 1.7% stop-loss hit on 3x leverage is tight and suggests either chop/volatility regime or thesis invalidation fast. If Polymarket odds on "ETH above $2,200 by [date]" were pricing >70% at entry but flipped <40% at exit, that's a regime shift you'd want to catch earlier next time via the prediction markets. If they stayed flat, the move was noise.

**Confidence: 0.3** (need trade timestamp + which Poly markets you were hedging

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry time, hold duration, what triggered the stop (market structure break or noise?), and whether this was part of a series (win rate matters more than single trade). **On mechanics:** 3x leverage on ETH with a $78 stop is tight—that's ~3.6% from entry, which catches whipsaws in ranging consolidation. If this was a breakout setup, the stop was correctly sized; if it was a mean-reversion play, you got shaken out of a potential winner. **Call:** Post the full trade log (entry setup, timeframe, catalyst) and I'll assess whether the stop placement was structural or reactive.

**Confidence: 0.4** (too many unknowns to judge the trade itself; mechanics alone can't tell us if this was good risk management or bad entry conviction).

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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$70.67, realized=$78.72, slippage=$8.05, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 8.05
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
  "holdMinutes": 38,
  "adverseMovePct": 1.686,
  "riskBudget": {
    "plannedRiskUsd": 70.67,
    "realizedRiskUsd": 78.72,
    "riskSlippageUsd": 8.05,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.686,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.559,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T15:20:19.438Z",
    "exitTimestampUtc": "2026-03-13T15:58:11.280Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T15:20:19.438Z",
    "exitTimestampUtc": "2026-03-13T15:58:11.280Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.559,
    "maxLossUsd": 70.67,
    "maxLossPct": 4.68,
    "entryAtrPct": 1.5585340314136125
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
