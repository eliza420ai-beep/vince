# Post-mortem: HOOD long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- HOOD long closed stop_loss: entry $77.94 -> exit $76.62, P&L $-26.23 (1503.8365808219176 USD, 5x).
- Entry time (UTC): 2026-03-12T11:33:03.843Z
- Hold window target: intraday
- Max loss budget: $22.56 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 133 minutes
- Adverse move: 1.694%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** Did CT have a bearish macro pulse when you entered, or did sentiment flip after entry? Was HOOD a crowded long (retail/whale alignment) that got flushed, or was it contrarian positioning? Without knowing the sentiment backdrop at entry vs. exit, I can't tell if this was a sentiment mispricing that reversed or a macro shift you should've caught. 

**What I'd need:** Entry date/time + a quick "what was CT saying about HOOD/retail/macro that day?" and I can give you a sharp post-mortem on whether sentiment was the miss.

Confidence: 0.3 (not enough data)

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: entry/exit timestamps, whether HOOD had active prediction markets during your hold, and what macro regime (rate expectations, retail sentiment) was priced in at $77.94. That said, a $1.32 stop on a $77.94 entry (1.7% risk on 5x) is tight for intraday chop—you likely got shaken out before any thesis could develop. If there was a Polymarket on retail earnings or Fed policy that moved against you during the hold, that's regime confirmation; if not, it's just noise. Pull the timestamps and I can cross-check what the prediction markets were pricing at entry/exit to see if you were fighting macro or just volatility.

**Confidence: 0.4** (need trade timestamps and market context to assess regime vs. noise)

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage venue (Hyperliquid perps?), hold duration, and whether this was part of a pair trade or standalone. On mechanics alone: $1,504 loss on a $77.94 entry at 5x suggests tight stop (1.7% drawdown) — reasonable risk management, but **the real question is position sizing relative to $100K stack**. If HOOD was >5% of capital at risk, that's oversized for a single equity perp; if <2%, the loss is noise and the stop-discipline is solid. **Missing:** was this a hedge against a short, or directional long? That changes whether the loss was structural or tactical. Paste the full trade context (venue, thesis, pair status, % of stack) and I'll give you the real feedback.

**Confidence: 0.3** (too many unknowns to assess structure).

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$22.56, realized=$26.23, slippage=$3.67, breach=true
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

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 3.67
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 133,
  "adverseMovePct": 1.694,
  "riskBudget": {
    "plannedRiskUsd": 22.56,
    "realizedRiskUsd": 26.23,
    "riskSlippageUsd": 3.67,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.694,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T11:33:03.843Z",
    "exitTimestampUtc": "2026-03-12T13:46:30.637Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T11:33:03.843Z",
    "exitTimestampUtc": "2026-03-12T13:46:30.637Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 22.56,
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
