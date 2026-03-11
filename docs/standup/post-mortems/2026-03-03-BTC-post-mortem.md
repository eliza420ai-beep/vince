# Post-mortem: BTC short (stop_loss)

**Date:** 2026-03-03

## Trade Snapshot

- BTC short closed stop_loss: entry $67995.40 -> exit $68501.00, P&L $-41.24 (5196.999169690432 USD, 10x).
- Entry time (UTC): 2026-03-03T16:50:45.198Z
- Hold window target: intraday
- Max loss budget: $33.78 (6.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 92 minutes
- Adverse move: 0.744%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment at entry vs. exit? Was there a macro catalyst (Fed, jobs, BTC whale move) that shifted the narrative between those two points?

That said — a $41 stop on a $68k short at 10x is tight for BTC's intraday noise. If CT was already bullish at entry (ETF inflows, macro tailwinds), you were fighting sentiment from the jump. Post-mortem: Check if sentiment had already flipped before you entered, or if a specific tweet/news event broke the short thesis mid-trade.

**Confidence: 0.4** (need trade timestamp + CT vibe snapshot at entry/exit to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing critical context:** What was your thesis entry signal (overreaction strat, model fair value, Synth forecast edge)? What was the Polymarket BTC price action during the hold—did it confirm or reject your directional bias? Without the prediction-market regime (odds moved, volume, spread tightening/widening), I can't tell if this was a bad entry, bad timing, or the market correctly repriced mid-hold. **Confidence: 0.3** — need the PM data to give you real feedback.

### Solus

- Lane: options mechanics and sizing
- Confidence: 72%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** notional size ($5,196 on 10x = $51,960 notional), trade duration, and funding rate accrual during hold. On mechanics alone: $505 loss on a $51,960 short is tight risk (0.97% of notional), but 10x leverage on a $67,995 entry with a $506 stop is aggressive for BTC's intraday vol—you're fighting gamma in a tight range. If this was <2h hold, the funding bleed is secondary; if >4h, funding likely ate more than the directional miss. Tighten stops to 3-5 ticks ($200–$350 range) or drop to 5x for BTC shorts in choppy markets.

**Confidence: 0.72** (sizing and stop structure visible, but funding accrual and hold duration would sharpen the call

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

- Quality score: 96/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 96
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 96,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 92,
  "adverseMovePct": 0.744,
  "echoContext": {
    "entryTimestampUtc": "2026-03-03T16:50:45.198Z",
    "exitTimestampUtc": "2026-03-03T18:22:48.954Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-03T16:50:45.198Z",
    "exitTimestampUtc": "2026-03-03T18:22:48.954Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.65,
    "maxLossUsd": 33.78,
    "maxLossPct": 6.5,
    "entryAtrPct": 1.1685863874345548
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
