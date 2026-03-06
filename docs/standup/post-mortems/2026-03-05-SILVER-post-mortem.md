# Post-mortem: SILVER short (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- SILVER short closed stop_loss: entry $83.29 -> exit $84.69, P&L $-62.86 (3647.975864236329 USD, 5x).
- Entry time (UTC): 2026-03-05T07:00:21.238Z
- Hold window target: intraday
- Max loss budget: $54.72 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 135 minutes
- Adverse move: 1.673%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on SILVER/commodities at entry vs. exit? Was there a macro catalyst (Fed speak, inflation data, USD moves) that shifted the vibe between those two points?

**On the loss itself:** Without the sentiment timeline, I can't tell if you got caught in a macro reversal (commodity strength, weak dollar) or if CT simply repriced SILVER higher on supply concerns. If this was a directional bet on sentiment cooling, I'd need to see whether CT actually turned bullish or if you just got stopped on noise.

**What I'd need to give you real feedback:** Entry date/time, what CT was saying about commodities that day, and whether any macro news (CPI, Fed, geopolitics) hit between entry and stop.

Confidence: 0.3 (can't assess sentiment without the timeline).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the entry timestamp, exit timestamp, and what macro/event drove silver that day—was it a Fed pivot, USD strength, or equity selloff? That shapes whether the stop was premature or the thesis broke.

**What I can say:** A 1.4-point stop on a 5x levered position is tight for silver's typical intraday noise; if you shorted into a flight-to-safety bid (equities down, USD up), the regime favored your thesis, but the execution window matters. Check if Polymarket's commodities markets (if any) or macro prediction odds on inflation/Fed were pricing a reversal at your entry—that would've flagged the risk.

**Confidence: 0.3** (need timestamps and macro catalyst to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry time, duration held, IV/volatility at entry vs exit, stop placement rationale (% from entry?), and position sizing vs your weekly target. On mechanics alone: $3,647 notional on 5x leverage into a commodity with intraday swings is tight—1.4% adverse move ($0.01.40 on $83.29) and you're stopped. If this was a day trade, that's expected friction; if it was meant to be swing/structural, your stop was too tight for the asset class. **Confidence: 0.3** (need entry duration, vol regime, and whether this was sized correctly for your risk model to assess structure).

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
- Risk budget: planned=$54.72, realized=$62.86, slippage=$8.14, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 8.14
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
  "holdMinutes": 135,
  "adverseMovePct": 1.673,
  "riskBudget": {
    "plannedRiskUsd": 54.72,
    "realizedRiskUsd": 62.86,
    "riskSlippageUsd": 8.14,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.673,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T07:00:21.238Z",
    "exitTimestampUtc": "2026-03-05T09:15:04.897Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T07:00:21.238Z",
    "exitTimestampUtc": "2026-03-05T09:15:04.897Z"
  },
  "solusContext": {
    "assetClass": "commodity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 54.72,
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
