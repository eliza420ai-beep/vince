# Post-mortem: SNDK short (max_age)

**Date:** 2026-03-21

## Trade Snapshot

- SNDK short closed max_age: entry $700.68 -> exit $718.83, P&L $-47.32 (1792 USD, 5x).
- Entry time (UTC): 2026-03-20T18:37:17.773Z
- Hold window target: intraday
- Max loss budget: $67.20 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 721 minutes
- Adverse move: 2.59%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** I need CT sentiment *around your entry/exit dates* — was SNDK riding a bullish narrative wave when you shorted, or did macro shift between entry and exit? Also: what was the broader market vibe (BTC/macro)? Without the sentiment timeline, I can't tell if you fought momentum or got caught in a surprise macro pivot.

**General take:** Shorting a stock into potential bullish CT momentum is high-friction — retail/whale conviction can override technicals short-term. Next time, cross-check if SNDK had positive CT velocity at entry; if it did, that's a headwind flag worth respecting.

**Confidence: 0.4** (need the sentiment data around your trade dates to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need (1) entry/exit timestamps to check SNDK's Polymarket implied move vs realized vol, (2) your probability estimate at entry vs market price, and (3) whether this was a directional bet or volatility play. That said: **5x leverage on a $700 stock into earnings or macro vol spike is structurally anti-Kelly**—even if your edge was solid, the sizing alone compounds losses fast. If Polymarket priced SNDK moves tighter than realized, that's a regime miss (model fair value vs market consensus); if you sized quarter-Kelly and still lost, the entry probability estimate was likely too bullish. Pull the Polymarket odds for SNDK at your entry time and we can check whether the market was pricing the move you got hit with.

**Confidence: 0.4** (without timestamps and your entry thesis, I'm pattern-matching on

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, exit date, volatility regime at entry vs exit, and whether this was a directional bet or a volatility play (SNDK is a semiconductor—high beta, skew-sensitive). That said: **5x leverage on a $700 entry in semis during uncertain IV is aggressive sizing for a short; if IV expanded 5-10 points between entry and exit, that alone explains the loss independent of price move.** Check: (1) was IV higher at exit? (2) was this meant to be a theta play (sell premium) or directional (short delta)? If theta, you're fighting vega in a vol-up regime; if directional, 5x on a single-day hold in a volatile sector is over-leveraged for paper. **Next:** tighten entry rules (max 2-3x on semis shorts, or require IV < 45

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$67.20, realized=$47.32, slippage=$-19.88, breach=false
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

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -19.88
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 721,
  "adverseMovePct": 2.59,
  "riskBudget": {
    "plannedRiskUsd": 67.2,
    "realizedRiskUsd": 47.32,
    "riskSlippageUsd": -19.88,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 2.59,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T18:37:17.773Z",
    "exitTimestampUtc": "2026-03-21T06:37:48.145Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T18:37:17.773Z",
    "exitTimestampUtc": "2026-03-21T06:37:48.145Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 67.2,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
