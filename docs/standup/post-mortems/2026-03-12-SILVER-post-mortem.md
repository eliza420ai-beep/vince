# Post-mortem: SILVER short (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- SILVER short closed stop_loss: entry $85.40 -> exit $86.74, P&L $-24.68 (1523.1999999999998 USD, 5x).
- Entry time (UTC): 2026-03-12T00:32:22.222Z
- Hold window target: intraday
- Max loss budget: $22.85 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 429 minutes
- Adverse move: 1.57%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter? Was CT bearish or bullish on SILVER at entry? Did macro sentiment shift (USD strength, rate expectations, inflation talk) between entry and exit? Without the *timing* relative to CT's macro pulse and the *sentiment delta*, I can't tell if you got caught in a crowded short or if the trade was sound but macro whipsawed you.

**What I need to give you real feedback:** Entry timestamp + what CT was saying about USD/inflation/commodities at that moment + whether the exit was forced (stop) or discretionary.

Confidence: 0.3 (insufficient data for sentiment post-mortem).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing critical context:** I'd need the trade date, the Polymarket silver price at entry/exit, and what thesis drove the short (macro, technicals, or a specific event). That said, a $1.34 move (1.57%) against a 5x levered short suggests either tight stops in a choppy regime or a regime shift mid-trade—silver often whipsaws on USD/rate repricing intraday. **The real question:** Was this a mean-reversion setup that reversed, or did macro (Fed speak, real yields) shift while you were in? Polymarket silver contracts (if any are live) would show whether the market repriced fundamentals or just got noisy. Post-mortem wins when you know *why* the market moved, not just that it did.

**Confidence: 0.4** (need trade thesis, date, and Poly context to calibrate the feedback

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

Missing context: entry date, hold duration, and what triggered the stop (market move vs. time decay). That said—$1.5K loss on a $85.40 short with 5x leverage is ~3.5% adverse move; your stop at +1.34 points ($6.70) was tight, which is correct for leverage, but SILVER's daily range often exceeds that. If this was a 1–2 hour hold, the structure was sound but the timeframe too short for commodity vol; if it was overnight or longer, you're fighting funding. Recommendation: widen stops to 2–3% adverse move on commodity shorts, or reduce leverage to 3x and hold longer for mean reversion to work.

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$22.85, realized=$24.68, slippage=$1.83, breach=true
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
- PM_RISK_SLIPPAGE_USD: 1.83
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
  "holdMinutes": 429,
  "adverseMovePct": 1.57,
  "riskBudget": {
    "plannedRiskUsd": 22.85,
    "realizedRiskUsd": 24.68,
    "riskSlippageUsd": 1.83,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.57,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T00:32:22.222Z",
    "exitTimestampUtc": "2026-03-12T07:41:51.678Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T00:32:22.222Z",
    "exitTimestampUtc": "2026-03-12T07:41:51.678Z"
  },
  "solusContext": {
    "assetClass": "commodity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 22.85,
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
