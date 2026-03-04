# Post-mortem: CRCL long (trailing_stop)

**Date:** 2026-03-04

## Trade Snapshot

- CRCL long closed trailing_stop: entry $100.84 -> exit $98.90, P&L $-158.53 (8039.132107785897 USD, 5x).
- Entry time (UTC): 2026-03-03T16:51:18.692Z
- Hold window target: intraday
- Max loss budget: $120.59 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 387 minutes
- Adverse move: 1.922%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (timestamps)? What was CT sentiment on CRCL during that window — was it a crowded long, contrarian setup, or off-radar? Did macro/BTC dump coincide with your exit, or was CRCL-specific selling?

Without those, I can't tell if sentiment shifted against you or if it was macro tide. Give me the trade window and I'll pull X vibe to see if CT was rotating out of that thesis.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing critical context:** I need the trade date/timeframe, CRCL's Polymarket prediction (if one exists), and whether this was a mean-reversion or trend play. Without knowing if the market repriced CRCL fundamentals or if you got caught in a liquidation cascade, I can't isolate regime vs. execution. **That said:** A 2% stop-loss on 5x levered perps is tight for intraday vol—if CRCL spiked on news, the trailing stop was doing its job; if it was chop, you're fighting slippage. Pull the 1h/4h candle pattern and compare to any Polymarket price action that day—if prediction markets stayed flat while perps dumped, that's a liquidity/leverage regime signal worth logging.

**Confidence: 0.3** (need trade timestamp and market context to be useful

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry date, exit date, how long held, what triggered the trailing stop (market move or time decay?), and whether this was paper bot or manual. 

**On mechanics:** 5x leverage on a $100 stock with $158 loss suggests tight trailing stop (likely 2-3% based on the math)—aggressive for equities in ranging/choppy markets. If this was a paper bot test, the issue isn't the loss; it's whether the stop was *calibrated to the asset's volatility* or just a fixed %. CRCL trades on HyperLiquid perps?—if so, funding rate and liquidation distance matter too.

**Call:** Paste entry/exit timestamps and what moved the market that day. Then I can assess whether the stop was right-sized or if we need to widen for equities.

**Confidence: 0.4

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

- Quality score: 77/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 77
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 77,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 387,
  "adverseMovePct": 1.922,
  "echoContext": {
    "entryTimestampUtc": "2026-03-03T16:51:18.692Z",
    "exitTimestampUtc": "2026-03-03T23:17:54.720Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-03T16:51:18.692Z",
    "exitTimestampUtc": "2026-03-03T23:17:54.720Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 120.59,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp",
      "entry_datetime"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
