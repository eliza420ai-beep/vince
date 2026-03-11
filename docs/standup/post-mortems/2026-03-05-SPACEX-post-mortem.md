# Post-mortem: SPACEX short (max_age)

**Date:** 2026-03-05

## Trade Snapshot

- SPACEX short closed max_age: entry $1718.76 -> exit $1722.90, P&L $-4.44 (1524.9407999999999 USD, 3x).
- Entry time (UTC): 2026-03-05T00:26:00.831Z
- Hold window target: intraday
- Max loss budget: $22.87 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.241%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit? Was this during a macro shift (Fed news, market open/close, volatility spike)? Did CT sentiment on SPX/macro flip while you were in the trade?

**From sentiment lane:** A $4.44 loss on a 3x short is tight risk management — good discipline. But without knowing *when* you traded, I can't tell you if CT was signaling a reversal (bull trap, macro pivot) or if you just got caught in noise. Check: Did whale accounts flip bullish on SPX right before your exit? That would explain the stop.

**What I'd need:** Entry/exit timestamps + a quick X_PULSE on SPX sentiment during that window. Then I can tell you if CT telegraphed the move.

Confidence: 0.3 (missing trade timing + sentiment snapshot).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id

**Missing context:** I need the Polymarket SpaceX condition (launch date, outcome type) and the entry/exit timestamps to map this against prediction-market pricing and regime shifts. Without knowing *what* you were shorting (IPO timing, launch success, valuation range?) and *when*, I can't assess whether the move was market-wide repricing or a local liquidity event.

**What I can say:** A 4-bp loss on a 3x short over what timeframe suggests tight stops or a quick reversal—common in low-volume prediction markets where the bid/ask spreads are wide. If this was a short-term vol trade against an overreaction, the regime likely shifted (news, sentiment swing, or just mean reversion back to fair value).

**To give you real feedback:** Paste the condition_id, entry/exit times, and whether this was a hedge or directional bet. Then

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, IV at entry vs exit, and whether this was a hedge or standalone short. That said: **3x leverage on a $1.7K single name is aggressive sizing for a paper trade**—if this is your learning bot, reduce to 1x or 2x to isolate signal from leverage noise. The $4.44 loss on $1,722 notional (~0.26%) is tight, which suggests either good risk management or luck; without knowing hold time, I can't assess whether theta/vega worked for or against you. **Next trade: paste entry date, hold duration, and IV context so I can assess whether the mechanic (short duration, vol crush, or liquidation risk) was the real lesson.**

Confidence: 0.4

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

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$22.87, realized=$4.44, slippage=$-18.43, breach=false
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

- PM_QUALITY_SCORE: 79
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -18.43
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 79,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.241,
  "riskBudget": {
    "plannedRiskUsd": 22.87,
    "realizedRiskUsd": 4.44,
    "riskSlippageUsd": -18.43,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.241,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T00:26:00.831Z",
    "exitTimestampUtc": "2026-03-05T12:26:08.440Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T00:26:00.831Z",
    "exitTimestampUtc": "2026-03-05T12:26:08.440Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 22.87,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp",
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
