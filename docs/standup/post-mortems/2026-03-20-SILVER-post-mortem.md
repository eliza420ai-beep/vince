# Post-mortem: SILVER long (stop_loss)

**Date:** 2026-03-20

## Trade Snapshot

- SILVER long closed stop_loss: entry $70.96 -> exit $69.65, P&L $-68.41 (3594.2400000000002 USD, 4x).
- Entry time (UTC): 2026-03-20T13:11:14.623Z
- Hold window target: intraday
- Max loss budget: $53.91 (6.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 58 minutes
- Adverse move: 1.853%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing critical context:** What was CT sentiment on SILVER when you entered vs. exited? Was this a macro play (USD strength, inflation expectations) or a momentum trade? Without the X/CT vibe at entry and exit, I can't tell if you fought sentiment or if sentiment shifted against you mid-trade.

**What I'd need:** Entry/exit timestamps, what macro narrative dominated CT that day (Fed talk, inflation data, DXY moves), and whether whale accounts were long or short SILVER. Then I can flag if sentiment was a headwind or if you just got stopped on noise.

Confidence: 0.3 (incomplete data).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the entry/exit *dates* and the Polymarket SILVER prediction during that window—was the market pricing a drop, or did sentiment shift after your entry? Without the regime (macro catalyst, inventory flush, technical break), I can't isolate whether this was a bad setup or bad timing. **The math checks out:** 4x leverage on a ~1.8% move ($1.31 on $70.96) = $68 loss—that's mechanical. **What I'd need from you:** Did Polymarket consensus shift bearish post-entry, or did you miss a key data release? If the former, the setup was sound but the market moved; if the latter, that's a regime miss on your end.

**Confidence: 0.3** (need trade timestamp + Poly context to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold time, IV/vol regime at entry vs exit, and whether this was a hedge or directional bet (affects whether the stop was tight or loose). **On mechanics:** $70K notional on 4x leverage for a commodity with ~2% daily swings means a $1.31 move (1.8%) hit your stop—tight for SILVER's vol profile; you likely sized for equity-like volatility, not commodity vol. If this was a short-term directional play, the stop was reasonable; if thesis-driven (inflation hedge, etc.), you exited on noise. **Next:** Post the entry thesis and hold duration—that tells us whether the structure was sound or the sizing was too aggressive for the asset class. **Confidence: 0.6** (mechanics are clear; strategy intent is not).

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
- Risk budget: planned=$53.91, realized=$68.41, slippage=$14.50, breach=true
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
- Delta confidence: 0.4
- Delta window trades: 20
- Delta expiry: 2026-04-03T14:09:29.889Z

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
- PM_RISK_SLIPPAGE_USD: 14.5
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 58,
  "adverseMovePct": 1.853,
  "riskBudget": {
    "plannedRiskUsd": 53.91,
    "realizedRiskUsd": 68.41,
    "riskSlippageUsd": 14.5,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.853,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.4,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-04-03T14:09:29.889Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "commodity": 3
      },
      "maxSingleTradeUsd": 3055
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
    "entryTimestampUtc": "2026-03-20T13:11:14.623Z",
    "exitTimestampUtc": "2026-03-20T14:09:13.402Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T13:11:14.623Z",
    "exitTimestampUtc": "2026-03-20T14:09:13.402Z"
  },
  "solusContext": {
    "assetClass": "commodity",
    "thesisClass": "momentum",
    "leverage": 4,
    "stopDistancePct": 1.5,
    "maxLossUsd": 53.91,
    "maxLossPct": 6,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
