# Post-mortem: AMZN short (max_age)

**Date:** 2026-03-13

## Trade Snapshot

- AMZN short closed max_age: entry $208.49 -> exit $210.08, P&L $-16.65 (2047.0305079236084 USD, 5x).
- Entry time (UTC): 2026-03-12T15:23:55.892Z
- Hold window target: intraday
- Max loss budget: $30.71 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.763%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context:** I need to know the entry date and holding period—was this a 1-day scalp or a multi-day swing? Also, what was CT saying about AMZN/tech sentiment at entry vs. exit? Without the timestamp, I can't assess whether you were fighting a macro headwind (e.g., risk-on rally, Fed pivot talk) or just got caught in intraday noise.

**On the trade itself:** If this was a short into a broader risk-on sentiment cycle (which late Jan/early Feb often is), you were fighting the crowd—CT's macro bias matters more than AMZN technicals alone. A 1.6% move against you on 5x is painful but survivable; the real lesson is whether sentiment had already turned bullish before you shorted.

**What I'd need to give you real feedback:** Entry timestamp, how long you held, and a quick

### Oracle

- Lane: prediction market regime
- Confidence: 35%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** No Polymarket AMZN prediction to compare against—was there edge vs. market consensus on the move, or did you trade without that lens? The $1.59 move against you (0.76%) on a 5x levered short suggests either a whipsaw in a choppy regime or you caught the wrong side of a directional shift. Without knowing the entry thesis (technical, macro, vol crush expectation) and whether Poly was pricing a rally, I can't tell if this was bad execution or bad timing in a bullish regime. **Check:** Did Poly AMZN contracts show >50% on the upside at your entry, and did you ignore it?

**Confidence: 0.35** (need the prediction-market context to diagnose properly).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, IV environment at entry/exit, and whether this was part of a defined thesis (e.g., earnings fade, resistance rejection). On mechanics alone: **5x leverage on a $208 short with a $1.59 stop (0.76%) is extremely tight**—any intraday chop kills you before directional conviction shows. For paper, that's OK to learn, but live you'd need either wider stops (accept bigger loss per trade, fewer stops hit) or smaller size per contract. The $16.65 loss on $2,047 notional is ~0.8% slippage + leverage bleed—reasonable mechanics, but the entry setup (tight stop + high leverage) suggests you're fighting the market structure rather than waiting for a cleaner setup.

**Confidence: 0.6** (structure feedback solid, but need hold duration + thesis to assess

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
- Risk budget: planned=$30.71, realized=$16.65, slippage=$-14.06, breach=false
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
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -14.06
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
  "holdMinutes": 720,
  "adverseMovePct": 0.763,
  "riskBudget": {
    "plannedRiskUsd": 30.71,
    "realizedRiskUsd": 16.65,
    "riskSlippageUsd": -14.06,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.763,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T15:23:55.892Z",
    "exitTimestampUtc": "2026-03-13T03:23:56.111Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T15:23:55.892Z",
    "exitTimestampUtc": "2026-03-13T03:23:56.111Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 30.71,
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
