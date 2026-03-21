# Post-mortem: ROBOT long (max_age)

**Date:** 2026-03-20

## Trade Snapshot

- ROBOT long closed max_age: entry $34.60 -> exit $33.84, P&L $-112.56 (4992 USD, 5x).
- Entry time (UTC): 2026-03-20T11:01:23.758Z
- Hold window target: intraday
- Max loss budget: $187.20 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 2.205%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing critical context:** I need to know *when* you entered (date/time) and *what CT sentiment was at entry vs. exit*—was this a contrarian trade against extreme bearish, or did you chase into complacency? ROBOT's a low-cap; sentiment can swing hard on a single whale move or insider dump. Without the sentiment backdrop (was CT bullish/bearish/indifferent on ROBOT at $34.60?), I can't tell you if this was a timing miss or a sentiment misread. 

**One thing I can flag:** If you entered into *rising* sentiment (CT getting bullish), that's typically higher-risk for a reversal; if you entered into *falling* sentiment (CT turning bearish), you were fighting the tape.

**What I need:** Entry timestamp + a quick CT vibe snapshot from that window (was ROBOT trending up or down on X?).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing context:** Polymarket ROBOT condition_id, entry/exit dates, and what thesis drove the trade (macro, event-driven, mean reversion). Without those, I can't cross-check market consensus or orderbook depth at entry/exit.

**High-level take:** A $112 loss on a 5x $5K notional suggests tight stops or slippage in thin liquidity—ROBOT typically has lower volume than macro markets. If this was a short-term directional bet against Polymarket consensus, the regime matters: was the market repricing fundamentals, or did you get caught in a liquidity crunch? 

**Next time:** Pull the condition_id and I'll run ANALYZE_MARKET_EV on entry price vs your probability estimate, plus orderbook snapshots to flag if slippage was the culprit or thesis was wrong.

**Confidence: 0.4

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, exit date, IV environment at entry/exit, and whether this was a hedge or standalone directional bet. On mechanics alone: 5x leverage on a $5K notional (ROBOT, low-liquidity HIP-3) is aggressive for a paper trade—you're testing edge, not sizing. The 2.2% loss suggests slippage or adverse move into exit; if you hit a bid/ask spread or market moved against you on close, that's execution friction, not signal. **Next time:** log entry thesis (support, catalyst, timeframe), IV at entry, and exit trigger so we can separate "bad structure" from "market just moved."

**Confidence: 0.6** (mechanics clear, but missing trade journal depth to isolate the real lesson).

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
- Risk budget: planned=$187.20, realized=$112.56, slippage=$-74.64, breach=false
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

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -74.64
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 2.205,
  "riskBudget": {
    "plannedRiskUsd": 187.2,
    "realizedRiskUsd": 112.56,
    "riskSlippageUsd": -74.64,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 2.205,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T11:01:23.758Z",
    "exitTimestampUtc": "2026-03-20T23:01:46.074Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:01:23.758Z",
    "exitTimestampUtc": "2026-03-20T23:01:46.074Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 187.2,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
