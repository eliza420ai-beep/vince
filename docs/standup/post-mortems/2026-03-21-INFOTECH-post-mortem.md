# Post-mortem: INFOTECH short (stop_loss)

**Date:** 2026-03-21

## Trade Snapshot

- INFOTECH short closed stop_loss: entry $136.84 -> exit $138.91, P&L $-13.76 (881.6471999999999 USD, 5x).
- Entry time (UTC): 2026-03-21T06:22:51.239Z
- Hold window target: intraday
- Max loss budget: $13.22 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 115 minutes
- Adverse move: 1.511%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter? What was CT sentiment at entry vs. exit? Was there a macro catalyst (Fed speak, BTC dump, tech earnings) that shifted the vibe between those timestamps?

**On the trade itself:** INFOTECH shorts are contrarian plays — they work when CT is euphoric on tech/AI and reality checks hit. If you entered into bearish CT sentiment, that's fighting the crowd; if you exited into bullish reversal (whale buys, positive headlines), that's the trade working against you. The 5x leverage amplifies both — sentiment whipsaws are brutal at that size.

**What I'd need to assess:** Sentiment score at entry and exit, any major X threads or whale moves during your hold, and macro backdrop (risk-on/risk-off).

Confidence: 0.4 (sentiment-only take without timing/macro context).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, market_name

**Missing context:** I need the entry date, exit date, and the specific INFOTECH condition you shorted (ticker/market name) to cross-check Polymarket pricing at entry/exit—that tells us if you got whipsawed by volatility or if the market repriced fundamentally. Without those timestamps and market ID, I can't assess whether the stop was hit on noise or signal.

**What I can say:** A $13.76 loss on a $136.84 entry (10% move) at 5x leverage is textbook overreaction-recovery territory—common in thin perp books where a liquidation cascade spikes price, then unwinds. If Polymarket pricing (our ground truth for regime) didn't move materially the same day, you got caught in leverage mechanics, not a regime shift. Check: did Polymarket odds on that outcome move the same direction at entry? If not,

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, IV/vol regime at entry vs exit, and whether this was a hedge or directional short. 

**On mechanics alone:** 5x leverage on a $136 stock is aggressive for a 1.5% move against you—that's a $2 stop, which is tight for INFOTECH volatility. If you held <1 hour, slippage/fill quality likely ate half the loss; if >4 hours, the move suggests regime shift, not just noise. Sizing down to 2-3x or widening stops to $3–4 (2–3%) would let you survive normal intraday chop.

**Next:** Post entry date/hold time and I'll assess whether this was a structure problem or just bad timing.

Confidence: 0.6

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
- Risk budget: planned=$13.22, realized=$13.76, slippage=$0.54, breach=true
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
- Delta confidence: 0.53
- Delta window trades: 20
- Delta expiry: 2026-04-04T08:18:07.154Z

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
- PM_RISK_SLIPPAGE_USD: 0.54
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 115,
  "adverseMovePct": 1.511,
  "riskBudget": {
    "plannedRiskUsd": 13.22,
    "realizedRiskUsd": 13.76,
    "riskSlippageUsd": 0.54,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.511,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.53,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-04-04T08:18:07.154Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "other": 4
      },
      "maxSingleTradeUsd": 749
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
    "entryTimestampUtc": "2026-03-21T06:22:51.239Z",
    "exitTimestampUtc": "2026-03-21T08:17:49.767Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-21T06:22:51.239Z",
    "exitTimestampUtc": "2026-03-21T08:17:49.767Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 13.22,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp",
      "market_name"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
