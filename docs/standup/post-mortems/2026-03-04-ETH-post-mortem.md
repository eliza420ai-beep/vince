# Post-mortem: ETH long (stop_loss)

**Date:** 2026-03-04

## Trade Snapshot

- ETH long closed stop_loss: entry $1985.60 -> exit $1957.80, P&L $-91.18 (6288.275576470588 USD, 10x).
- Entry time (UTC): 2026-03-03T18:31:49.771Z
- Hold window target: intraday
- Max loss budget: $49.27 (7.84%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 592 minutes
- Adverse move: 1.4%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

Missing key context: **When did you enter and exit?** (date/time). Sentiment moves fast — if you took this trade during a CT dump or macro shock, that's a different lesson than if you rode through a local pullback.

That said: ETH was trading heavy mid-range most of the week; if you caught the top of a relief rally and got stopped on retest, that's a timing miss, not a sentiment miss. **Check if CT was euphoric at entry or capitulating at exit** — that tells us if you were fighting consensus or if macro turned.

Confidence: 0.4 (need entry/exit timestamps + what CT was saying those hours).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** ETH/USD perps entry time, exit time, and current Polymarket odds on ETH price direction (weekly/monthly). Those timestamps tell us if you got caught in a liquidation cascade or macro vol spike; the Poly odds show whether the market repriced fundamentals or just overreacted intraday.

**Take:** A $91 loss on 10x leverage into a $1,985 entry is tight risk management—you caught the stop cleanly. Without the trade timestamps and Poly context, I can't tell if this was a regime shift (macro reversal) or a wick-driven false breakout. Pull the Poly ETH markets for the same period and we can see if price action was justified or a reversion play.

**Confidence: 0.4** (need timestamps + Poly odds snapshot to diagnose).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold time, IV regime at entry/exit, funding rate at entry, and whether this was part of a larger hedge or standalone directional bet. That said: **10x leverage on a $6.3K notional is aggressive for a $100K stack**—that's 6.3% of capital risked on one trade. If this was a solo directional long in a bear/ranging regime, the sizing is the issue, not the mechanics. **Mechanics check:** Stop at $1957.80 (−1.4% from entry) is tight; funding or a wick could've clipped it. If you're running paper perps to prove edge, tighter stops are fine—but only if your win rate and avg win size justify it. **Next:** Track win rate, avg win/loss ratio, and hold time to see if this is variance or a signal to widen stops or reduce

## Root-Cause Tags

- Primary: sizing_too_aggressive
- Secondary: stop_too_tight_for_vol

## Corrective Actions

1. [immediate] owner=vince due=next_trade
   - action: Cap leverage on this asset class and widen stop to volatility-adjusted range before next entry.
   - success_metric: Next trade includes complete PTQG fields and no missing_data flags.
   - rollback: If signal quality drops for 10+ trades, review cap thresholds.
2. [policy] owner=sentinel due=72h
   - action: Add weekly guardrail review for repeated root-cause tags by asset class.
   - success_metric: Post-mortems with pmevCompletenessPct >= 90% over rolling 7 days.
   - rollback: If operational overhead causes missed trades, reduce required manual fields.
3. [experiment] owner=solus due=7d
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 94/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 94
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 94,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 592,
  "adverseMovePct": 1.4,
  "echoContext": {
    "entryTimestampUtc": "2026-03-03T18:31:49.771Z",
    "exitTimestampUtc": "2026-03-04T04:23:30.972Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-03T18:31:49.771Z",
    "exitTimestampUtc": "2026-03-04T04:23:30.972Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.784,
    "maxLossUsd": 49.27,
    "maxLossPct": 7.84,
    "entryAtrPct": 1.5671204188481673
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
