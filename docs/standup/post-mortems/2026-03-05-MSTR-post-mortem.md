# Post-mortem: MSTR long (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- MSTR long closed stop_loss: entry $146.04 -> exit $141.33, P&L $-159.45 (4869.372026148568 USD, 3x).
- Entry time (UTC): 2026-03-05T09:27:50.061Z
- Hold window target: 1d
- Max loss budget: $146.08 (9.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 81.8%
- Hold duration: 363 minutes
- Adverse move: 3.225%
- Sentiment snapshot: unavailable
- Regime snapshot: unavailable
- Missing data: sentimentScore, regime

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter vs. exit? Did CT sentiment shift during your hold, or was the thesis invalidated before price moved? Was this a macro rotation (risk-off) or MSTR-specific weakness?

**What I'd need to give you real feedback:** X sentiment on MSTR/BTC correlation at entry and exit, whether whale accounts were rotating out of mega-cap tech into alts/cash, and if macro (Fed, equity futures) flipped the vibe mid-trade.

**Right now:** MSTR trades as a leveraged BTC play — if you entered on bullish CT momentum but exited into a macro headwind (equity selloff, risk-off), that's not a sentiment miss, that's macro timing. If CT was already cooling on MSTR before your stop, that's a signal we should've caught earlier.

**Confidence: 0.3** (can

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need the trade date/time and what Polymarket was pricing MSTR at entry/exit—was there a divergence between the perp and prediction-market consensus that signaled the reversal? A $5 drop on 3x is tight; if Poly had MSTR weakness priced in before your entry, that's a regime signal you can backtest. **The core question:** Did the paper bot miss a Poly-to-perp edge flip, or was this just volatility noise in a choppy regime? Pull the orderbook depth and live volume from that window—if spreads widened or liquidity evaporated, that's regime confirmation. Without the Poly timestamp/price snapshot, I can't tell if this was a market-structure miss or just unlucky timing on a tight stop.

**Confidence: 0.3** (need Polymarket data to be useful here).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, IV regime at entry/exit, and whether this was part of a hedge or standalone directional bet—these matter for assessing if the stop was right-sized or reactive.

**On mechanics:** 3x leverage on MSTR (high beta, single-name) with a 3.2% stop is tight for that volatility profile; you likely got shaken out by noise rather than thesis break. If this was a 1–2 day hold, the stop was appropriate risk management. If longer thesis, the leverage + tight stop combo creates whipsaw risk—consider: lower leverage (2x) or wider stop (5–7%) for hold duration.

**Next:** Post the entry thesis and hold duration; I'll assess if the structure matched the bet.

Confidence: 0.6 (mechanics sound, but thesis/timing unknown).

## Root-Cause Tags

- Primary: regime_conflict
- Secondary: missing_pretrade_data

## Corrective Actions

1. [immediate] owner=vince due=next_trade
   - action: Require PTQG completion and explicit max-loss check before next entry.
   - success_metric: Next trade includes complete PTQG fields and no missing_data flags.
   - rollback: If signal quality drops for 10+ trades, review cap thresholds.
2. [policy] owner=sentinel due=72h
   - action: Enforce post-mortem schema validation; reject outputs missing evidence fields.
   - success_metric: Post-mortems with pmevCompletenessPct >= 90% over rolling 7 days.
   - rollback: If operational overhead causes missed trades, reduce required manual fields.
3. [experiment] owner=solus due=7d
   - action: A/B test defined-risk structure recommendation vs spot leverage entries.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 52/100
- Escalate to Sentinel: true
- Score breakdown: completeness=22, evidence=15, diagnosis=20, actionability=15, ownership=10
- Context completeness: 78.6%
- Regime vs execution: regime_miss
- Risk budget: planned=$146.08, realized=$159.45, slippage=$13.37, breach=true
- Consistency checks: pass

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Escalate this loss to Sentinel weekly governance review.
- No temporary leverage override required.
- No automatic policy mutation due to data/quality gate.

## Recursive Policy Delta

- Adaptation eligible: false
- Policy version at entry: baseline
- Proposed delta: none

## Machine-Readable Summary

- PM_QUALITY_SCORE: 52
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: missing_pretrade_data
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 81.8
- PM_MISSING_DATA_COUNT: 2
- PM_CONTEXT_COMPLETENESS_PCT: 78.6
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 13.37
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 52,
  "qualityEscalate": true,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [
    "missing_pretrade_data"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 81.8,
  "missingData": [
    "sentimentScore",
    "regime"
  ],
  "holdMinutes": 363,
  "adverseMovePct": 3.225,
  "riskBudget": {
    "plannedRiskUsd": 146.08,
    "realizedRiskUsd": 159.45,
    "riskSlippageUsd": 13.37,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 3.225,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T09:27:50.061Z",
    "exitTimestampUtc": "2026-03-05T15:30:54.587Z"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T09:27:50.061Z",
    "exitTimestampUtc": "2026-03-05T15:30:54.587Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "event",
    "leverage": 3,
    "stopDistancePct": 3,
    "maxLossUsd": 146.08,
    "maxLossPct": 9,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 78.6,
  "regimeVsExecution": "regime_miss"
}
```
