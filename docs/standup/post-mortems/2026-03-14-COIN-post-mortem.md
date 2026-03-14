# Post-mortem: COIN long (max_age)

**Date:** 2026-03-14

## Trade Snapshot

- COIN long closed max_age: entry $196.38 -> exit $194.81, P&L $-19.13 (2253.3658482758615 USD, 5x).
- Entry time (UTC): 2026-03-13T16:14:25.867Z
- Hold window target: intraday
- Max loss budget: $33.80 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.799%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 0%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter/exit (dates/times)? What was CT sentiment at entry vs. exit? Was this a contrarian setup or consensus trade?

**General take:** A $19 loss on a 5x leverage micro-cap is noise, but the real question is whether CT was pricing in the move you expected and you got stopped before the thesis played out—or if sentiment shifted hard between entry and close. Without the timestamp, I can't tell if this was bad timing, bad thesis, or just normal slippage on low liquidity.

**What I'd need to give you real feedback:** Run X_PULSE for the entry date/time, then the exit date/time. Show me if CT was bullish/bearish and if that flipped. Then we can see if you got caught in a sentiment reversal or just got unlucky on a thesis that was right.

Confidence: 0.

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id

**Missing context:** COIN Polymarket condition ID, entry/exit timestamps, and the market's implied probability at both points. Without those, I can't compare your entry price to what the market was pricing—that's the regime signal.

That said: A $1.57 move (0.8%) on a leveraged position into a loss suggests either (1) you entered against consensus and got shaken or (2) the market repriced mid-trade. If COIN's Polymarket odds shifted materially between entry and exit, that's regime drift you'd want to track for the paper bot. Pull the live odds and timestamps, and I can give you the real feedback—whether you fought the market or got caught in a reversion.

**Confidence: 0.4** (need market data to assess regime).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** entry date, hold duration, IV/vol regime at entry vs exit, and whether this was part of a larger hedge or standalone. On mechanics alone: 5x leverage on a $2.25K notional position in a low-liquidity alt (COIN) is aggressive sizing for a paper trade—that's $11.25K notional risk. The 0.8% loss (entry to exit) is tight, but at 5x it compounds to a $19 drawdown. **Call:** If this was a test of the bot's execution, the slippage and liquidation risk are the real data points—not the direction. If you're building a live playbook, 2–3x max on alts, or skip COIN until liquidity improves.

**Confidence: 0.65** (need entry/exit timestamps and IV context to assess vol regime fit).

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

- Quality score: 75/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$33.80, realized=$19.13, slippage=$-14.67, breach=false
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

- PM_QUALITY_SCORE: 75
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -14.67
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 75,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.799,
  "riskBudget": {
    "plannedRiskUsd": 33.8,
    "realizedRiskUsd": 19.13,
    "riskSlippageUsd": -14.67,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.799,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T16:14:25.867Z",
    "exitTimestampUtc": "2026-03-14T04:14:33.832Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T16:14:25.867Z",
    "exitTimestampUtc": "2026-03-14T04:14:33.832Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 33.8,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp",
      "condition_id"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
