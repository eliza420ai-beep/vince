# Post-mortem: SPACEX short (max_age)

**Date:** 2026-03-20

## Trade Snapshot

- SPACEX short closed max_age: entry $1579.48 -> exit $1581.30, P&L $-2.13 (1290.24 USD, 3x).
- Entry time (UTC): 2026-03-20T11:01:33.146Z
- Hold window target: intraday
- Max loss budget: $48.38 (11.25%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.115%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** What was CT saying about SPACEX at entry vs. exit? Did you trade against sentiment, or was the macro vibe already shifting bearish when you shorted? Without the X-side narrative (whale positioning, news velocity, retail fear gauge), I can't tell if this was a sentiment mispricing or just bad timing on a directional bet. Run me the dates/times and I'll pull the pulse from that window.

**Confidence: 0.3** (can't assess sentiment edge without the data).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing context:** I need the Polymarket SpaceX condition_id, entry/exit dates, and your probability estimate at entry to give you regime + pricing feedback. That said: a $2.13 loss on a 3x short over what timeframe suggests tight stops or a mean-reversion whip in a thinly-traded market—SpaceX odds on Poly are often illiquid away from major news. **Key question:** Did Poly odds actually move against you, or did your leverage get stopped on noise while the market repriced sideways? Pull the live SpaceX price and orderbook spread, and I can tell you if the market was pricing in tail risk you missed or if you just got shaken out.

**Confidence: 0.4** (need market data to validate the thesis vs. execution noise).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation for the short, and did price hit it before you closed? A $1.82 move (0.11%) on a 3x levered position shouldn't cost $1,290 unless slippage or liquidation pressure was involved—clarify execution.

**Mechanics call:** If this was a discretionary short without a defined stop or invalidation, that's the structural issue, not the $2.13 loss itself. A $1,290 notional position (3x) needs either a tighter stop or a reason to hold through noise; closing on a micro-move suggests you didn't have conviction on the thesis or the entry was too aggressive for the signal strength.

**Sizing note:** $1,290 on a paper trade is fine for learning; real execution would size this smaller until you prove the edge (entry signal + invalidation + risk/reward clarity).

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$48.38, realized=$2.13, slippage=$-46.25, breach=false
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

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -46.25
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.115,
  "riskBudget": {
    "plannedRiskUsd": 48.38,
    "realizedRiskUsd": 2.13,
    "riskSlippageUsd": -46.25,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.115,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T11:01:33.146Z",
    "exitTimestampUtc": "2026-03-20T23:01:46.124Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:01:33.146Z",
    "exitTimestampUtc": "2026-03-20T23:01:46.124Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 3.75,
    "maxLossUsd": 48.38,
    "maxLossPct": 11.25,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
