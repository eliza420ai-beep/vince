# Post-mortem: ETH long (stop_loss)

**Date:** 2026-03-16

## Trade Snapshot

- ETH long closed stop_loss: entry $2277.06 -> exit $2258.80, P&L $-24.88 (2920.947193644489 USD, 4x).
- Entry time (UTC): 2026-03-16T14:30:12.477Z
- Hold window target: intraday
- Max loss budget: $23.14 (3.17%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 9 minutes
- Adverse move: 0.802%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context:** What was CT sentiment on ETH at entry vs. exit? Was this a contrarian setup (CT bearish, you went long) or consensus trade (CT bullish)? Did macro shift (Fed speak, BTC dump, etc.) during your hold? 

Without the sentiment backdrop, I can't tell if you fought the crowd (risky but sometimes rewarded) or got caught in a broader CT reversal. Pull those timestamps and I'll give you real feedback on whether the sentiment thesis held or broke.

**Confidence: 0.3** (can't assess sentiment execution without the vibe data)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket's ETH price prediction (24h, 1w, settlement date) and the orderbook spread at your entry time—those tell us whether the market was pricing in the downside you hit or if it was an outlier move.

**Read on regime:** A $18 stop on a $2277 entry (0.79% loss on 4x = 3.16% notional) suggests tight risk management, which is sound. Without seeing Poly's consensus on ETH direction and volatility at that moment, I can't say whether the move was a regime shift the market priced or a flash wick you got caught in. If Poly was pricing 55%+ for ETH down in your timeframe, the stop was well-placed; if it was 70%+ up, the entry itself was fighting consensus.

**Direct:** Pull the Polymarket ETH price snapshot from your

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** position duration (hours/days?), IV regime at entry/exit, correlation to BTC at time of stop hit, and whether this was part of a hedged pair or standalone. That said: **4x leverage on a $2.9K notional is tight for ETH's realized vol—you hit a 0.8% move and stopped, which is reasonable risk management, but suggests either (a) entry was into resistance without a macro read, or (b) stop was too tight for the timeframe you held.** If this was a 1–4h trade, the structure is sound; if it was longer, the leverage-to-duration ratio is inverted. **Next: paste the IV at entry, BTC's move during your hold, and trade duration so I can assess whether the stop was optimal or if you're over-leveraging relative to your thesis window.**

Confidence: 0.4

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$23.14, realized=$24.88, slippage=$1.74, breach=true
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
- Delta confidence: 0.43
- Delta window trades: 20
- Delta expiry: 2026-03-30T14:39:23.971Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: stop_too_tight_for_vol
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 1.74
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "stop_too_tight_for_vol",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 9,
  "adverseMovePct": 0.802,
  "riskBudget": {
    "plannedRiskUsd": 23.14,
    "realizedRiskUsd": 24.88,
    "riskSlippageUsd": 1.74,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.802,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.792,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.43,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-03-30T14:39:23.971Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "stopToAtrMin": 1,
      "maxLeverageByAssetClass": {
        "crypto": 3
      },
      "maxSingleTradeUsd": 2483
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
    "entryTimestampUtc": "2026-03-16T14:30:12.477Z",
    "exitTimestampUtc": "2026-03-16T14:39:12.991Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-16T14:30:12.477Z",
    "exitTimestampUtc": "2026-03-16T14:39:12.991Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 4,
    "stopDistancePct": 0.792,
    "maxLossUsd": 23.14,
    "maxLossPct": 3.17,
    "entryAtrPct": 1.5847120418848166
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
