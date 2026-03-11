# Post-mortem: GOLD short (max_age)

**Date:** 2026-03-06

## Trade Snapshot

- GOLD short closed max_age: entry $5094.38 -> exit $5127.70, P&L $-13.55 (1924.6265741851362 USD, 5x).
- Entry time (UTC): 2026-03-05T15:05:03.277Z
- Hold window target: intraday
- Max loss budget: $28.87 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.654%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need the entry date/time and exit date/time to pull CT sentiment during your hold — was macro bullish, bearish, or choppy when you entered? Was there a news catalyst (Fed, BTC move, macro data) that shifted sentiment against your thesis? Without the timestamp, I can't assess whether you got caught in a sentiment reversal or if the trade was sound but timing was off. 

**What I can say:** GOLD shorts are macro-dependent (DXY, real rates, risk-on/off). If you shorted into a risk-on day or after CT flipped bullish on USD strength, that's a sentiment miss, not execution. If sentiment stayed bearish the whole hold but GOLD still ripped, that's a divergence worth flagging — means whales or macro players were ahead of CT.

**Confidence: 0.3** (need timestamps to give real feedback

### Oracle

- Lane: prediction market regime
- Confidence: 0%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the entry/exit timestamps and the Polymarket gold-price forecast (if one exists) to compare your short thesis against market consensus—was this a fade of overheated bullish pricing, or a directional macro call? That said, the math checks: you risked ~$1,925 on a 33-bps move against you, which is tight risk-management, but a 5x levered short in a bid-heavy regime (gold typically rallies into geopolitical uncertainty) will get stopped frequently. **Regime read:** If this closed in the last 48 hours, spot gold has been bid—check whether the close coincided with a flight-to-safety event (Fed pivot, equity selloff, rates down) that invalidated your entry thesis. Without that timestamp and the Poly edge, I can't isolate whether this was bad timing or bad thesis. **Confidence: 0

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** entry date, hold time, and what triggered the exit (stop hit, time-based, discretionary). **Mechanics read:** $1,924 notional loss on 5x leverage is reasonable friction for a short that moved 0.66% against you—sizing itself wasn't the problem. **The call:** If this was a <24h hold, slippage + funding ate most edge; if >2 days, you took directional risk without a clear invalidation or exit rule. Post it with timestamps and I'll assess whether the structure (entry logic, hold thesis, exit discipline) was sound or if leverage was masking a weak premise.

**Confidence: 0.4** (need hold time and entry thesis).

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
- Risk budget: planned=$28.87, realized=$13.55, slippage=$-15.32, breach=false
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
- PM_RISK_SLIPPAGE_USD: -15.32
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
  "adverseMovePct": 0.654,
  "riskBudget": {
    "plannedRiskUsd": 28.87,
    "realizedRiskUsd": 13.55,
    "riskSlippageUsd": -15.32,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.654,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T15:05:03.277Z",
    "exitTimestampUtc": "2026-03-06T03:05:32.174Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T15:05:03.277Z",
    "exitTimestampUtc": "2026-03-06T03:05:32.174Z"
  },
  "solusContext": {
    "assetClass": "commodity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 28.87,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
