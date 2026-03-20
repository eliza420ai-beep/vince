# Post-mortem: SNDK long (stop_loss)

**Date:** 2026-03-20

## Trade Snapshot

- SNDK long closed stop_loss: entry $763.44 -> exit $734.32, P&L $-241.15 (6240 USD, 5x).
- Entry time (UTC): 2026-03-20T11:00:58.589Z
- Hold window target: intraday
- Max loss budget: $234.00 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 200 minutes
- Adverse move: 3.815%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

Need more context to give you real feedback: **What was CT sentiment on SNDK when you entered?** Was this a contrarian setup (bearish CT = your edge), or did you chase into FOMO? Also — **what macro/sector vibe was live?** (e.g., semis under pressure, rotation out of tech, Fed rhetoric that day). Without the sentiment thesis that justified the entry, I can't tell if the stop was premature or if you missed a red flag in CT positioning. 

**Confidence: 0.3** — This needs the sentiment backstory to land.

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

Missing key context: **entry thesis** (catalyst, technicals, macro timing?), **Polymarket odds on SNDK at entry vs exit**, and **market regime shift** (volatility spike, sector rotation, earnings surprise?). Without the Poly pricing context—what was the market pricing for the move you were betting on?—I can't isolate whether you got the direction right but timed it wrong, or missed a regime shift that Poly would've flagged. The 3.8% loss on 5x is tight risk management, but I need the entry signal source and how it mapped to prediction-market consensus to give you real feedback.

**Confidence: 0.3** (insufficient data—bring the Poly odds and entry thesis and I'll give you a sharp post-mortem).

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation thesis for SNDK long, and what broke it? The $29 stop (3.8% wide) is tight for a 5x leveraged semi position—typical for mean-reversion but aggressive if you were betting macro upside. If the break was a macro shift (Fed, yields, chip demand) rather than technicals, the stop was right; if it was noise, sizing down to 2-3x on semis volatility would've survived. Without knowing your original thesis and what triggered the exit, I can't assess whether the structure was sound or the bet was wrong.

**Confidence: 0.4** (need invalidation + thesis clarity to give a real call).

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

- Quality score: 85/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$234.00, realized=$241.15, slippage=$7.15, breach=true
- Consistency checks: pass

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.
- Promote bounded policy delta candidate and evaluate over a rolling window.

## Recursive Policy Delta

- Adaptation eligible: true
- Policy version at entry: baseline
- Proposed delta: present
- Delta confidence: 0.33
- Delta window trades: 20
- Delta expiry: 2026-04-03T14:21:22.183Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 85
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 7.15
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 85,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 200,
  "adverseMovePct": 3.815,
  "riskBudget": {
    "plannedRiskUsd": 234,
    "realizedRiskUsd": 241.15,
    "riskSlippageUsd": 7.15,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 3.815,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.33,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-04-03T14:21:22.183Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "equity": 4
      },
      "maxSingleTradeUsd": 5304
    },
    "validationPlan": {
      "windowTrades": 20,
      "targetMetrics": {
        "maxBudgetBreachRate": 0.2,
        "minExpectancyUsd": -5,
        "maxDrawdownPct": 15
      },
      "rollbackTriggers": [
        "budget_breach_rate_worse_than_baseline",
        "expectancy_usd_degrades",
        "drawdown_pct_exceeds_cap"
      ]
    }
  },
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T11:00:58.589Z",
    "exitTimestampUtc": "2026-03-20T14:21:11.464Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:00:58.589Z",
    "exitTimestampUtc": "2026-03-20T14:21:11.464Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 234,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
