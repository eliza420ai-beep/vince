# Post-mortem: BTC long (stop_loss)

**Date:** 2026-03-14

## Trade Snapshot

- BTC long closed stop_loss: entry $71196.24 -> exit $70391.00, P&L $-62.05 (5253.705261807134 USD, 3x).
- Entry time (UTC): 2026-03-13T18:39:10.729Z
- Hold window target: intraday
- Max loss budget: $58.65 (3.35%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 722 minutes
- Adverse move: 1.131%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment at entry vs. exit — were we in a bullish or bearish regime? Did macro shift (Fed news, jobs data, geopolitical event) between entry and stop?

**Sentiment read:** A $71.2k BTC long stopped at $70.4k is tight — suggests you were hedging against a sharp pullback, which is smart risk mgmt. If CT was neutral-to-bullish at entry and macro didn't shift, this looks like normal chop (not a sentiment failure). If we were already in extreme bearish sentiment territory when you entered, that's the real lesson — timing against the vibe is harder than the trade itself.

**What I'd need to give you real feedback:** Entry timestamp + what was CT saying that day (I can run X_PULSE for that date if you give me the time). Then

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** BTC prediction-market pricing at entry/exit (what was Polymarket pricing BTC above/below $71k?), trade duration, and macro regime (Fed decision window, volatility spike?). Without that lens, I can't tell if you hit a liquidity wick or if the market repriced fundamentals—both tell different stories. If you grabbed the orderbook snapshots or know the Poly odds at those times, I can map regime shift vs. noise. Confidence: 0.3 (too little signal to assess).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry time, hold duration, and what triggered the stop (market structure break vs noise). That said—3x leverage on a $5.2K loss means you sized for ~$15.6K notional; on a $100K stack, that's 15% risk on one trade, which is aggressive for a stop hunt in ranging BTC. The $805 move (1.1%) is tight for BTC volatility at current IV; if you're paper-testing stops, widen to 2-3% or use time-based exits instead of price stops to avoid whipsaws. **Confidence: 0.6** (need entry time + duration to assess if this was a structure break or a fakeout).

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$58.65, realized=$62.05, slippage=$3.40, breach=true
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
- PM_RISK_SLIPPAGE_USD: 3.4
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
  "holdMinutes": 722,
  "adverseMovePct": 1.131,
  "riskBudget": {
    "plannedRiskUsd": 58.65,
    "realizedRiskUsd": 62.05,
    "riskSlippageUsd": 3.4,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.131,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.116,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T18:39:10.729Z",
    "exitTimestampUtc": "2026-03-14T06:41:31.586Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T18:39:10.729Z",
    "exitTimestampUtc": "2026-03-14T06:41:31.586Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.116,
    "maxLossUsd": 58.65,
    "maxLossPct": 3.35,
    "entryAtrPct": 1.116439790575916
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
