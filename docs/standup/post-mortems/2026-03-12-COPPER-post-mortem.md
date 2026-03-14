# Post-mortem: COPPER short (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- COPPER short closed max_age: entry $5.88 -> exit $5.88, P&L $-0.17 (804.8100226415092 USD, 5x).
- Entry time (UTC): 2026-03-12T01:29:27.807Z
- Hold window target: intraday
- Max loss budget: $12.07 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.029%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

Missing key context: **entry/exit timestamp, macro backdrop (BTC/macro sentiment that day), and whether CT had a thesis on COPPER at entry.** Without timing, I can't tell if you shorted into a sentiment flip or held through noise. That said: **max_age exit at entry price suggests you got shaken out on volatility rather than thesis break** — classic low-conviction setup. If CT was bullish COPPER that day and you went short anyway, that's a red flag for fighting sentiment; if CT was neutral/bearish, the chop just means liquidity was thin.

**Confidence: 0.4** (need the macro + CT context to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the entry/exit timestamps, the Polymarket COPPER prediction at entry vs exit, and whether this was a directional bet or a hedge against an options position. A flat entry-to-exit with a $0.17 loss on 5x leverage suggests slippage or funding bleed rather than a directional miss—but without the Poly odds context, I can't tell if the market repriced against you or if this was just friction.

**If this was a directional short:** The lack of price movement but negative P&L points to funding costs eating the position. Polymarket COPPER odds would tell us if the market stayed neutral (your thesis was right, timing was wrong) or if sentiment shifted up (your entry was early).

**Ask me:** Pull live COPPER odds and I'll compare to your entry level to frame whether this was a regime call (market stayed bullish) or pure execution friction

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry/exit timestamps, IV/vol regime at entry vs exit, and whether this was a test of the bot or a live signal. On structure: 5x leverage on a commodity micro-move ($0 price delta, -$0.17 PnL on $804 notional) suggests either slippage/fees ate the edge or the signal itself had no edge—mechanics-wise, that's a wash. **Call:** If this was a live bot trade, the leverage-to-signal ratio is inverted (5x on a no-move = bad risk/reward); if it was a test, log the slippage and rerun with tighter entry/exit logic. **Missing:** timestamps, IV context, bot version/parameters.

Confidence: 0.3

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
- Risk budget: planned=$12.07, realized=$0.17, slippage=$-11.90, breach=false
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
- PM_RISK_SLIPPAGE_USD: -11.9
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
  "adverseMovePct": 0.029,
  "riskBudget": {
    "plannedRiskUsd": 12.07,
    "realizedRiskUsd": 0.17,
    "riskSlippageUsd": -11.9,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.029,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T01:29:27.807Z",
    "exitTimestampUtc": "2026-03-12T13:29:48.604Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T01:29:27.807Z",
    "exitTimestampUtc": "2026-03-12T13:29:48.604Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 12.07,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
