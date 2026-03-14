# Post-mortem: MSFT short (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- MSFT short closed max_age: entry $402.42 -> exit $405.34, P&L $-12.57 (1620.5849180327868 USD, 5x).
- Entry time (UTC): 2026-03-12T01:29:56.230Z
- Hold window target: intraday
- Max loss budget: $24.31 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.726%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit? (timing matters for sentiment correlation). What was CT saying about MSFT/tech at entry vs. exit? Was macro shifting (Fed speak, yields, risk-off → risk-on)? 

**General take:** Tech shorts have been crowded on CT lately — if you entered into consensus bearish, you likely got stopped into a squeeze. Sentiment whipsaws are real, especially on mega-cap tech where retail piles in one direction. Check if macro (yields, DXY) reversed during your hold — that's usually the tell.

**Confidence: 0.4** (need your entry/exit timestamps + what CT was saying at those moments to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** No Polymarket MSFT prediction market to cross-check against—can't tell if the perps move was a mispricing vs. rational repricing. Also need: entry/exit timestamps (was this intraday noise or a regime shift?) and what triggered the short (technicals, flow, macro?).

**On the loss itself:** $12.57 on a $402 short with 5x is tight risk management—the real question is whether the move (0.72%) was predictable from options IV, volatility regime, or market positioning. If you had a Polymarket edge saying MSFT up, that's a clear signal the short was fighting consensus; if you didn't, it's just variance.

**Next move:** Pull the MSFT Polymarket if one's active (search for earnings or price-band markets) to see what the crowd priced vs. where spot went—

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** entry date, exit date, IV/volatility regime at entry/exit, and whether this was a hedge or standalone directional bet. **On mechanics:** 5x leverage on a $402 short with a $2.92 stop (0.73% move) is tight—typical for scalps, but MSFT's realized vol often runs 15-25%, so a $3 adverse move is within noise. **The call:** If this was a directional bet (not a hedge), the sizing is sound for a paper test, but the stop was too tight for the asset's intraday range; if it was a hedge against a long position, document that relationship so we can assess net exposure. **Next:** Log entry/exit timestamps and realized vol during the hold so we can calibrate future MSFT shorts to asset volatility, not arbitrary %.

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

- Quality score: 89/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$24.31, realized=$12.57, slippage=$-11.74, breach=false
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
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -11.74
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
  "holdMinutes": 720,
  "adverseMovePct": 0.726,
  "riskBudget": {
    "plannedRiskUsd": 24.31,
    "realizedRiskUsd": 12.57,
    "riskSlippageUsd": -11.74,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.726,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T01:29:56.230Z",
    "exitTimestampUtc": "2026-03-12T13:30:24.608Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T01:29:56.230Z",
    "exitTimestampUtc": "2026-03-12T13:30:24.608Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 24.31,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
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
