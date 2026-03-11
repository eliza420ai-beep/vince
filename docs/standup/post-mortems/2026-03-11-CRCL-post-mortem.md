# Post-mortem: CRCL long (stop_loss)

**Date:** 2026-03-11

## Trade Snapshot

- CRCL long closed stop_loss: entry $115.83 -> exit $114.06, P&L $-75.62 (4783.777540106952 USD, 5x).
- Entry time (UTC): 2026-03-11T17:38:22.969Z
- Hold window target: intraday
- Max loss budget: $71.76 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 93 minutes
- Adverse move: 1.531%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter (exact time/date)? What was CT sentiment on CRCL at entry vs. exit? Was there a macro/BTC dump that triggered the stop, or did CRCL-specific bearish chatter spike? 

**General take:** A $75 loss on a 5x micro-cap long usually means either (a) you caught a rug/dump that CT saw coming, or (b) macro headwinds (BTC weakness, risk-off) forced liquidations across alts. If CRCL had zero CT buzz pre-entry, that's a red flag — low-liquidity alts without social tailwind are friction trades. Next time, run X_PULSE on the ticker 2h before entry to check if whales/alphas are positioned or if sentiment is deteriorating.

**Confidence: 0.4** (need the timing

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id

**Missing context:** CRCL's Polymarket odds at entry/exit, volume regime, and whether this was a directional bet or a hedge against a prediction-market position. Without those, I can't tie the perp loss to what the market was pricing.

**If this was a directional long:** The stop at ~1.1% below entry is tight for a 5x levered trade—typical for scalping chop, not regime conviction. If CRCL's Polymarket odds were flat or rising while perps dumped, that's a liquidity event (not a thesis break); if odds fell hard too, the regime shifted and the stop was right.

**What I'd need to give you a sharp read:** CRCL condition_id, Polymarket odds at your entry and exit timestamps, and whether you had a corresponding short or neutral position in the prediction market (hedge vs. naked directional).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** Was this a hedge against an existing position, or a standalone spec? What was the invalidation—did price break it cleanly or did you get stopped on noise? On the mechanics: 5x leverage on a $115 stock is tight (wide bid-ask relative to your stop), and a ~1.8% loss suggests your stop was too close to entry for the volatility profile. For CRCL specifically (semi cap, lower liquidity than mega-cap), 2-3% stops are tighter than justified. **Next time:** Widen stops to match asset liquidity, or size down if you're forced to hold tight. Confidence: 0.6 (need to know if this was hedge or spec, and whether you hit actual support or got shaken out).

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$71.76, realized=$75.62, slippage=$3.86, breach=true
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

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 3.86
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 93,
  "adverseMovePct": 1.531,
  "riskBudget": {
    "plannedRiskUsd": 71.76,
    "realizedRiskUsd": 75.62,
    "riskSlippageUsd": 3.86,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.531,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T17:38:22.969Z",
    "exitTimestampUtc": "2026-03-11T19:11:18.201Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T17:38:22.969Z",
    "exitTimestampUtc": "2026-03-11T19:11:18.201Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 71.76,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp",
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
