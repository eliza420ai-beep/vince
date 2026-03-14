# Post-mortem: SOL long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- SOL long closed stop_loss: entry $90.43 -> exit $88.06, P&L $-111.24 (4163.078663013698 USD, 10x).
- Entry time (UTC): 2026-03-13T12:23:41.247Z
- Hold window target: intraday
- Max loss budget: $104.08 (25.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 581 minutes
- Adverse move: 2.622%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (exact times)? What was CT sentiment on SOL at entry vs. exit? Was there a macro event (Fed, BTC move, liquidation cascade) that triggered the stop, or pure technicals?

That said: **If you entered into extreme bullish SOL sentiment and exited into a sentiment flip** (e.g., macro dump, whale selling thread going viral), the stop was correct — you got caught in a reversal before the crowd repriced. **If sentiment stayed stable and you got stopped on a 2.6% wick**, that's noise, not a signal. Sentiment alone doesn't validate the trade, but it tells you if you were fighting the vibe or riding it.

**What I need:** Entry/exit timestamps + SOL sentiment score at both points (I can X_PULSE to backfill if you give me the times).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** SOL/USD entry time, exit time, and whether you had a corresponding Polymarket position (e.g., SOL >$95 by date X). Without the timestamp, I can't map this to volatility regime or macro flow—was this a flash dump, Fed speak, or slow bleed?

**On the loss itself:** A 2.6% stop on 10x is tight for SOL's typical intraday swings; if this was a mean-reversion setup, you got shaken out before the bounce. Check: did SOL recover past $90.43 within 1–4 hours post-exit? If yes, regime was consolidation/noise, not trend. If no, you caught the start of a real move down—that's a clean read.

**Bridge to Poly:** Pull SOL prediction markets (weekly/monthly expiries) at the time of entry—

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** Entry date, exit date, IV/volatility regime at entry vs exit, and whether this was a scheduled paper test or live signal. That said: 10x leverage on a $90 SOL entry with a $2.37 stop (2.6% width) is tight for perps—you're eating slippage and getting whipsawed on intraday noise. A 2–3% stop on a $4K notional position is mechanically sound, but SOL's typical daily range is 3–5%, so you're fighting the asset's natural volatility. If this was a test of your entry/exit logic, the mechanics worked (stop executed cleanly); if it was a live signal, you need wider stops or lower leverage for SOL's profile.

**Confidence: 0.6** (structure is sound, but need entry/exit timestamps and vol context to assess signal quality vs.

## Root-Cause Tags

- Primary: regime_conflict
- Secondary: sizing_too_aggressive

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

- Quality score: 94/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$104.08, realized=$111.24, slippage=$7.16, breach=true
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
- Delta confidence: 0.6
- Delta window trades: 20
- Delta expiry: 2026-03-27T22:04:49.478Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 94
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: sizing_too_aggressive
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 7.16
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 94,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [
    "sizing_too_aggressive"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 581,
  "adverseMovePct": 2.622,
  "riskBudget": {
    "plannedRiskUsd": 104.08,
    "realizedRiskUsd": 111.24,
    "riskSlippageUsd": 7.16,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 2.622,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 2.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.6,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-03-27T22:04:49.478Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "crypto": 9
      },
      "maxSingleTradeUsd": 3539
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
    "entryTimestampUtc": "2026-03-13T12:23:41.247Z",
    "exitTimestampUtc": "2026-03-13T22:04:37.090Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T12:23:41.247Z",
    "exitTimestampUtc": "2026-03-13T22:04:37.090Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 2.5,
    "maxLossUsd": 104.08,
    "maxLossPct": 25,
    "entryAtrPct": 5
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
