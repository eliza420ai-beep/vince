# Post-mortem: BTC short (stop_loss)

**Date:** 2026-03-17

## Trade Snapshot

- BTC short closed stop_loss: entry $74685.06 -> exit $75204.00, P&L $-16.97 (2278.152258064516 USD, 4x).
- Entry time (UTC): 2026-03-16T23:52:07.646Z
- Hold window target: intraday
- Max loss budget: $14.81 (2.60%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 19 minutes
- Adverse move: 0.695%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context:** What was CT sentiment when you entered? Was it extreme bearish (contrarian setup) or consensus short? Did macro shift mid-trade (Fed speak, jobs data, geopolitical news)?

**Sentiment take:** A $519 move on a short in 4x leverage is tight — suggests the market had conviction against your thesis. If CT was split or cautiously bullish at entry, that's your red flag; if CT was doom-posting and you shorted into that consensus, you got caught in a squeeze rather than a sentiment failure.

**What I'd need:** Entry timestamp + CT vibe at that moment (was X posting "BTC dead money" or "ETH breakout incoming"?). That tells us if you were early contrarian or late consensus.

Confidence: 0.6 (can't assess sentiment alignment without the entry context).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was your thesis entry point (Polymarket odds on BTC price action, macro sentiment, vol regime)? Did you have a corresponding long position or hedge in prediction markets to validate the short, or was this pure perps directional?

**On the trade itself:** A $519 move stop on a $74.7K entry (70 bps) is tight for 4x leverage in BTC—you got whipsawed, which is normal in mean-reversion regimes. The real question is whether Polymarket was pricing a breakout (odds on BTC >$76K or similar) that you missed, or if this was a pure technical rejection that the market repriced faster than your stop. If Poly was already 65%+ on upside and you shorted, that's fighting consensus; if it was 40–50%, you had edge but got stopped into a trend.

**Feedback

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** Entry date, hold duration, and what triggered the stop (time decay, volatility spike, or pure price move?). On mechanics: 4x leverage on a $519 move is tight—$2,278 loss suggests your stop was ~2.8% below entry, which is aggressive for BTC perps in current vol. For a short, that's reasonable sizing if you expected consolidation; the issue is whether the thesis broke (BTC momentum shifted) or just unlucky fill. **Call:** Post-trade, check if your stop placement was reactive (too tight) or if the directional view was wrong—those require different adjustments next time.

**Confidence: 0.6** (need entry timestamp and vol context to assess sizing rigor).

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$14.81, realized=$16.97, slippage=$2.16, breach=true
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
- Delta expiry: 2026-03-31T00:11:16.622Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: stop_too_tight_for_vol
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 2.16
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "stop_too_tight_for_vol",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 19,
  "adverseMovePct": 0.695,
  "riskBudget": {
    "plannedRiskUsd": 14.81,
    "realizedRiskUsd": 16.97,
    "riskSlippageUsd": 2.16,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.695,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.65,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.6,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-03-31T00:11:16.622Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "stopToAtrMin": 1,
      "maxLeverageByAssetClass": {
        "crypto": 3
      },
      "maxSingleTradeUsd": 1936
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
    "entryTimestampUtc": "2026-03-16T23:52:07.646Z",
    "exitTimestampUtc": "2026-03-17T00:11:04.538Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-16T23:52:07.646Z",
    "exitTimestampUtc": "2026-03-17T00:11:04.538Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 4,
    "stopDistancePct": 0.65,
    "maxLossUsd": 14.81,
    "maxLossPct": 2.6,
    "entryAtrPct": 1.1059685863874344
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
