# Post-mortem: CRCL long (stop_loss)

**Date:** 2026-03-20

## Trade Snapshot

- CRCL long closed stop_loss: entry $131.82 -> exit $126.68, P&L $-86.88 (2201.4719999999998 USD, 5x).
- Entry time (UTC): 2026-03-20T13:46:16.211Z
- Hold window target: intraday
- Max loss budget: $82.56 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 27 minutes
- Adverse move: 3.897%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter (what was CT sentiment then vs. now)? What was the thesis — was it a sentiment-driven trade or fundamental? Did CT flip bearish on CRCL specifically, or was this macro headwinds?

**What I can say:** A 5x leveraged small-cap close at stop suggests the trade lacked conviction or conviction evaporated fast. If CT was hyping CRCL and flipped, that's a real lesson (sentiment can reverse hard on low-float alts). If macro turned and dragged it down, that's different — you got caught in tide, not sentiment collapse.

**Post-mortem ask:** Pull the X sentiment on CRCL from entry → exit. If whale/alpha accounts were quiet or turned negative, sentiment was the kill. If they stayed bullish and macro just crushed it, sizing and macro hedge matter more than my lane.

### Oracle

- Lane: prediction market regime
- Confidence: 35%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the entry date, exit date, and what CRCL's Polymarket odds were at entry and exit—that's the regime signal. Without knowing if the market repriced (consensus shifted) or if this was pure liquidation risk on leverage, I can't separate "bad timing" from "bad thesis." 

**What I can say:** A 3.8% move stop on 5x is tight for a perp, which means you were betting on immediate momentum—if Polymarket sentiment on CRCL was already priced above your entry conviction, the edge was thin and the stop was always going to hurt. Pull the odds snapshot and I'll give you the full post-mortem.

**Confidence: 0.35** (too many unknowns).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold time, invalidation thesis, and whether this was part of a sector rotation (Robotics/AI infra) or standalone. **On mechanics:** 5x leverage on a $131 stock is aggressive for a $100K stack—that's ~$655K notional on a single name; if CRCL is illiquid or correlated to sector drawdown, stops can slip. **Sizing call:** For paper, acceptable to test; for live, position should be <2-3% of stack at entry, not 5x. **Next:** Log the invalidation that triggered the stop and compare it to your thesis—did thesis break or did you size wrong for the volatility?

Confidence: 0.6 (need entry date, thesis, and whether this was a sector bet or single-name alpha play to score the real miss).

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

- Quality score: 95/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$82.56, realized=$86.88, slippage=$4.32, breach=true
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
- Delta confidence: 0.52
- Delta window trades: 20
- Delta expiry: 2026-04-03T14:13:24.762Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 95
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.32
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 95,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 27,
  "adverseMovePct": 3.897,
  "riskBudget": {
    "plannedRiskUsd": 82.56,
    "realizedRiskUsd": 86.88,
    "riskSlippageUsd": 4.32,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 3.897,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.52,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-04-03T14:13:24.762Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "equity": 4
      },
      "maxSingleTradeUsd": 1871
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
    "entryTimestampUtc": "2026-03-20T13:46:16.211Z",
    "exitTimestampUtc": "2026-03-20T14:13:13.254Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T13:46:16.211Z",
    "exitTimestampUtc": "2026-03-20T14:13:13.254Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 82.56,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
