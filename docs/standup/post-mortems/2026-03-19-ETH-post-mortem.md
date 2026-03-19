# Post-mortem: ETH long (stop_loss)

**Date:** 2026-03-19

## Trade Snapshot

- ETH long closed stop_loss: entry $2174.03 -> exit $2154.90, P&L $-25.88 (2782.08 USD, 4x).
- Entry time (UTC): 2026-03-19T11:41:33.987Z
- Hold window target: intraday
- Max loss budget: $22.59 (3.25%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 46 minutes
- Adverse move: 0.88%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (timestamp)? What was CT sentiment *at entry* vs. *at exit*? Was there a macro catalyst (Fed, inflation data, on-chain dump) that shifted the vibe, or was this a pure technicals miss?

**What I can say:** A $2.8k loss on a 4x leverage ETH long suggests the move was fast and against you—typical of sentiment whipsaws when macro uncertainty spikes or whale liquidations cascade. If CT was bullish at entry but flipped bearish mid-trade (check X_PULSE from that window), that's a *sentiment trap*, not a directional miss. If macro stayed flat and it was pure TA rejection, that's a different lesson.

**Ask:** Run the timestamps past me + I'll pull CT sentiment from that exact window to see if you got caught in a momentum fade or a genuine sentiment

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: **entry timestamp, exit timestamp, and what Polymarket was pricing ETH at those moments**—without that, I can't tell if you exited into a local dip that Poly had already priced in or if you got caught in a regime shift Poly missed. The 4x leverage on a $20 move ($2174→$2155) is tight risk management, which is sound, but **the real question is whether Polymarket consensus had shifted bearish before your stop or after**—that tells us if the market repriced and you were early, or if perps and spot diverged. Post the Poly price snapshots and I'll give you regime + pricing feedback.

**Confidence: 0.3** (need timestamps and Poly context to be useful).

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold time, IV/vol regime at entry vs exit, and whether this was part of a directional thesis or hedge against another position. On mechanics alone: $2.78K loss on 4x leverage from a 0.9% move suggests tight stop (good risk discipline), but without knowing the intended hold window or correlation to your other positions, I can't assess whether the structure was right for the bet. **If this was a 1-day scalp, the stop was tight but appropriate; if it was a multi-day directional play, you may have gotten shaken out by noise.** Paste the thesis, entry time, and what else you were holding and I'll give you the real call.

**Confidence: 0.3** (mechanics only; need context to assess structure).

## Root-Cause Tags

- Primary: stop_too_tight_for_vol
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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$22.59, realized=$25.88, slippage=$3.29, breach=true
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
- Delta expiry: 2026-04-02T12:27:43.231Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: stop_too_tight_for_vol
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 3.29
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "stop_too_tight_for_vol",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 46,
  "adverseMovePct": 0.88,
  "riskBudget": {
    "plannedRiskUsd": 22.59,
    "realizedRiskUsd": 25.88,
    "riskSlippageUsd": 3.29,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.88,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.812,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.4,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-04-02T12:27:43.231Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "stopToAtrMin": 1,
      "maxLeverageByAssetClass": {
        "crypto": 3
      },
      "maxSingleTradeUsd": 2365
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
    "entryTimestampUtc": "2026-03-19T11:41:33.987Z",
    "exitTimestampUtc": "2026-03-19T12:27:31.019Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-19T11:41:33.987Z",
    "exitTimestampUtc": "2026-03-19T12:27:31.019Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 4,
    "stopDistancePct": 0.812,
    "maxLossUsd": 22.59,
    "maxLossPct": 3.25,
    "entryAtrPct": 1.6236649214659686
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
  "regimeVsExecution": "execution_miss"
}
```
