# Post-mortem: GOOGL short (max_age)

**Date:** 2026-03-14

## Trade Snapshot

- GOOGL short closed max_age: entry $301.90 -> exit $301.89, P&L $-0.51 (1087.7465454545454 USD, 5x).
- Entry time (UTC): 2026-03-13T16:44:19.863Z
- Hold window target: intraday
- Max loss budget: $16.32 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.003%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter/exit (date/time)? What was CT sentiment on GOOGL/tech at entry vs. exit? Was there a macro catalyst (Fed news, earnings, rate pivot) that moved the needle? Without the timing and sentiment backdrop, I can't tell if this was a sentiment mispricing you caught early or if macro whipsawed you mid-trade.

**What I can say:** A 1-pip loss on a 5x levered short suggests tight stops and low conviction — either you were hedging macro risk or the setup lacked a clear sentiment divergence to justify the leverage. If CT was bullish tech at entry, shorting into consensus is uphill; if CT was divided, that's a yellow flag for chop.

**Confidence: 0.3** (need timing + sentiment data to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** I need the entry/exit timestamps, the Polymarket odds for GOOGL at those moments, and what thesis drove the short (earnings surprise, macro shift, vol crush). A $0.01 move on 5x is tight—the real question is whether you were fighting the market's probability (Polymarket was pricing GOOGL higher than your edge) or if slippage/timing killed a sound thesis. Without the Poly odds snapshot and your original conviction level, I can't separate "bad execution" from "wrong regime bet." 

**What I can say:** If Polymarket was pricing GOOGL bullish (>65% for the move you shorted), you were fighting consensus—that's a regime red flag for paper trades, which need quick mean reversion to work. If Polymarket was flat or bearish and you still lost the 1-cent, that's pure friction; tighter

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** exit time relative to entry, hold duration, and what triggered the close (stop, time decay, discretion?). On structure: $1,087 notional at 5x on a $0.01 move is tight—you need either tighter stops (sub-0.01) or larger moves to justify the leverage. The $0.51 loss suggests slippage or a partial fill; confirm execution venue and order type (market vs limit). **Recommendation:** For paper bot tuning, log hold duration and exit trigger—that data feeds back into position sizing and leverage calibration for live.

**Confidence: 0.6** (structure sound, but execution details missing.)

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
- Risk budget: planned=$16.32, realized=$0.51, slippage=$-15.81, breach=false
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
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -15.81
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
  "holdMinutes": 720,
  "adverseMovePct": 0.003,
  "riskBudget": {
    "plannedRiskUsd": 16.32,
    "realizedRiskUsd": 0.51,
    "riskSlippageUsd": -15.81,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.003,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T16:44:19.863Z",
    "exitTimestampUtc": "2026-03-14T04:44:29.812Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T16:44:19.863Z",
    "exitTimestampUtc": "2026-03-14T04:44:29.812Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 16.32,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
