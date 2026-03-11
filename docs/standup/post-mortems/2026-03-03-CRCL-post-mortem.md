# Post-mortem: CRCL long (stop_loss)

**Date:** 2026-03-03

## Trade Snapshot

- CRCL long closed stop_loss: entry $94.11 -> exit $92.66, P&L $-105.34 (6622.544546850997 USD, 5x).
- Entry time (UTC): 2026-03-03T02:09:22.467Z
- Hold window target: intraday
- Max loss budget: $99.34 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 270 minutes
- Adverse move: 1.541%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context:** I'd need to know (1) when you entered—was CT bullish or bearish on CRCL at that moment? (2) what macro/sector sentiment was running (altseason? risk-off?), and (3) what caused the exit—did sentiment flip or was it just technicals? Without the *sentiment backdrop* at entry and exit, I can't tell you if you were fighting CT consensus or if the thesis broke. Hit me with those timestamps and I'll give you the real post-mortem on whether this was a sentiment mispricing or a macro headwind you missed.

**Confidence: 0.3** (not enough data to assess sentiment-side execution)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context I'd need:** CRCL's Polymarket price and implied probability at entry/exit, plus the timeframe (hours? days?). That'd tell me if the perps move outpaced prediction-market repricing or if you got caught in a regime shift the market hadn't priced yet.

**What I can say:** A $105 stop on a $94 entry (0.11% move) with 5x leverage is tight—you were hedging tail risk hard. If CRCL's prediction market stayed flat or rallied while spot dumped, that's a liquidity cascade or micro-cap volatility spike, not a thesis break. If the market repriced *down* with you, the thesis was wrong and the stop worked as designed.

**Next move:** Pull CRCL's Polymarket odds and volume around your entry/exit times. That'll show whether the market agreed with

### Solus

- Lane: options mechanics and sizing
- Confidence: 72%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** (1) What was your thesis invalidation signal—did fundamentals break or was this pure technicals/stop-hunt? (2) What's CRCL's typical daily range and your position size vs. daily vol? (3) Was 5x leverage sized for your edge or reactive?

**Mechanics read:** $105 loss on $6.6K notional (1.6% drawdown) hit your stop at -1.45 points—tight stop for a $94 stock (1.54% width). If CRCL trades 2-3% daily, that stop is noise, not structure. **Call:** Either widen to 2.5-3% (capture intraday vol) or size down to 2x (lower friction on shakeouts). The loss itself is fine; the setup wasn't.

**Confidence: 0.72** (I

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

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 270,
  "adverseMovePct": 1.541,
  "echoContext": {
    "entryTimestampUtc": "2026-03-03T02:09:22.467Z",
    "exitTimestampUtc": "2026-03-03T06:39:18.206Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-03T02:09:22.467Z",
    "exitTimestampUtc": "2026-03-03T06:39:18.206Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 99.34,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
