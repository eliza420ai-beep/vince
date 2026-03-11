# Post-mortem: XYZ100 short (max_age)

**Date:** 2026-03-06

## Trade Snapshot

- XYZ100 short closed max_age: entry $25026.99 -> exit $25051.00, P&L $-2.81 (1924.6265741851362 USD, 5x).
- Entry time (UTC): 2026-03-05T15:22:39.058Z
- Hold window target: intraday
- Max loss budget: $28.87 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.096%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

Missing key context: **When did you enter vs. exit?** (timing relative to CT sentiment shift), **what was the thesis?** (macro, technicals, on-chain?), and **what did CT say during the trade?** (did sentiment flip against you?). 

If this was a short into a macro bullish pulse or ETH/BTC rally narrative dominating X, that's a headwind — sentiment can keep shorts underwater longer than technicals suggest. Without the timestamp, I can't tell if you got caught in a sentiment reversal or if this was just a tight stop.

**Confidence: 0.3** (need the trade window + original thesis to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id, market_name

**Missing key context:** I need the condition_id or market name for XYZ100 to pull live Polymarket odds and orderbook depth—that's where regime signals live (spread, OI, volume trend). Without seeing whether Poly was pricing XYZ100 higher or lower than your entry, and whether liquidity was drying up into your exit, I can't tell you if this was a bad read on market consensus or just slippage in thin order flow.

**What I can say:** A $25 swing on a 5x short suggests the underlying moved against you—if XYZ100 is a crypto or macro prediction, pull the event detail and check whether new information shifted the probability curve between entry and exit, or if this was pure momentum/gamma squeeze. 

**To give you real feedback:** Share the market name or condition_id, and I'll check live odds, spreads, and volume to tell

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: entry_datetime

**Missing critical context:** entry date/time, exit date/time, IV regime at entry vs exit, and whether this was part of a defined hedge or standalone directional bet. On mechanics alone: $25.01 entry on a $25K index with 5x leverage = $125K notional short; $25.01 loss per contract = ~0.11% slippage/adverse move, but the real question is *why* you exited—was it a stop, a time-based exit, or capitulation? If it was a timed exit (e.g., 4h hold), the loss is acceptable noise; if it was a stop-hunt or panic close, your stop was too tight for 5x on an illiquid index. For paper: tighten your exit rules (time-based or profit-target, not reactive) and size down if you're closing losers on noise.

**

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

- Quality score: 87/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$28.87, realized=$2.81, slippage=$-26.06, breach=false
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

- PM_QUALITY_SCORE: 87
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -26.06
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 87,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.096,
  "riskBudget": {
    "plannedRiskUsd": 28.87,
    "realizedRiskUsd": 2.81,
    "riskSlippageUsd": -26.06,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.096,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T15:22:39.058Z",
    "exitTimestampUtc": "2026-03-06T03:23:01.903Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T15:22:39.058Z",
    "exitTimestampUtc": "2026-03-06T03:23:01.903Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 28.87,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "condition_id",
      "market_name"
    ],
    "Solus": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
