# Post-mortem: MU short (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- MU short closed stop_loss: entry $411.19 -> exit $418.18, P&L $-34.02 (1943.7020689655171 USD, 5x).
- Entry time (UTC): 2026-03-13T11:45:43.237Z
- Hold window target: intraday
- Max loss budget: $29.16 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 107 minutes
- Adverse move: 1.701%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Sentiment post-mortem:**

MU's a memory play — your loss likely came from a macro bid (Fed pivot hopes, AI capex demand, or earnings beat) that CT didn't price in beforehand. Before I flag whether sentiment was a miss, I need: **Did CT have bearish MU thesis pre-entry? Was there a macro catalyst (earnings, Fed speak, supply news) that flipped the vibe?** Without knowing what the X/CT narrative was *at entry*, I can't tell you if you missed a sentiment signal or if macro just overran positioning. Check if whale accounts or earnings-focused accounts had bullish MU threads you didn't see — that's the edge I'd flag.

**Confidence: 0.4** (missing pre-entry sentiment context).

### Oracle

- Lane: prediction market regime
- Confidence: 62%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id

**Missing context:** MU condition_id (which Polymarket is pricing this?), entry/exit timestamps, and what regime shift triggered the stop. That said—a $7 move (1.7%) on a 5x levered short in semi-cap is tight, and if Polymarket's MU earnings or guidance market moved against you in that window, the tape likely repriced faster than paper could hedge. Check whether the stop fired on a single spike or a sustained break; if it's the latter, Poly's orderbook spread on MU probably widened into your exit, eating slippage. **Next time:** pull live Polymarket odds for the condition at entry and exit—if Poly's prob moved >5% in your favor but price didn't follow, that's a signal the paper model lagged the real market, not a regime miss.

**Confidence: 0.62** (no market data,

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry date, exit date (how long held?), IV at entry vs exit, and what triggered the stop—market move or volatility crush? On structure: $1,943 notional on a $411 stock at 5x is tight sizing for a short; MU is high-beta semis (moves fast). If you held <1 day and got stopped on intraday noise, tighten your invalidation or use wider stops. If you held 2+ days and MU rallied on sector strength (AI capex, NVIDIA strength), the short thesis was wrong—that's a thesis miss, not a mechanics miss. **Next:** paste entry/exit timestamps and what moved MU (sector, earnings, analyst call?) so I can assess if this was bad luck or bad setup.

**Confidence: 0.4** (need more data to give real feedback).

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

- Quality score: 89/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$29.16, realized=$34.02, slippage=$4.86, breach=true
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

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.86
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 107,
  "adverseMovePct": 1.701,
  "riskBudget": {
    "plannedRiskUsd": 29.16,
    "realizedRiskUsd": 34.02,
    "riskSlippageUsd": 4.86,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.701,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T11:45:43.237Z",
    "exitTimestampUtc": "2026-03-13T13:32:13.615Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T11:45:43.237Z",
    "exitTimestampUtc": "2026-03-13T13:32:13.615Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 29.16,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
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
