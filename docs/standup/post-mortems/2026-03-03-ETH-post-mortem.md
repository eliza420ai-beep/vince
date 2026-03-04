# Post-mortem: ETH long (stop_loss)

**Date:** 2026-03-03

## Trade Snapshot

- ETH long closed stop_loss: entry $2002.30 -> exit $1985.70, P&L $-72.13 (8205.128205128205 USD, 10x).
- Entry time (UTC): 2026-03-03T16:31:21.384Z
- Hold window target: intraday
- Max loss budget: $64.11 (7.81%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 4 minutes
- Adverse move: 0.829%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment at entry vs. exit? Was there a macro catalyst (Fed, inflation data, BTC move) that shifted the vibe between those two points?

**On the trade itself:** An $8.2k loss on a $2k entry suggests conviction was there, but ETH longs got crushed into a support zone — classic "sentiment flipped faster than expected" move. If CT was still bullish at your entry and turned bearish mid-trade, that's a signal timing issue (you were right directionally but caught a local reversal). If CT was already cautious, that's a setup problem.

**What I'd need to give you real feedback:** The exact entry timestamp + a quick X pulse from that window to see if you were fighting against the vibe.

Confidence: 0.4 (can't assess sentiment without timing and

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need the trade date/time and the ETH weekly options chain (IV rank, skew, strike clustering) to tie this to Polymarket pricing on macro regime. Without knowing if this was a mean-reversion setup vs. breakout, or whether Poly's macro markets (recession, Fed cuts, BTC dominance) were pricing tail risk that day, I can't isolate whether the stop was too tight for realized vol or if market structure shifted against you.

**What I can say:** A $16.60 stop on a 10x levered long is ~0.8% of notional—tight for intraday ETH noise. If this was a weekly strike play and you closed before expiration, Polymarket's BTC/macro sentiment and open interest on crypto-related events would've telegraphed the regime shift. Pull the event/market detail from that morning and I can map it to your

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry time, hold duration, and what triggered the stop (market structure break vs. noise). That said: **$72 loss on $8.2K notional at 10x is tight risk management**—your stop was only ~0.8% below entry, which is good discipline but leaves you vulnerable to wick noise on low-volume candles. **Mechanics call:** if this was a 1–4h hold, the stop was right; if sub-1h, you're fighting the bid-ask spread and getting clipped by noise. Next trade: paste entry time + structure (support/resistance/MA) so I can assess if the stop placement was sound or if you need wider breathing room.

**Confidence: 0.6** (need hold duration and market structure to rate the setup).

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
  "holdMinutes": 4,
  "adverseMovePct": 0.829,
  "echoContext": {
    "entryTimestampUtc": "2026-03-03T16:31:21.384Z",
    "exitTimestampUtc": "2026-03-03T16:35:05.758Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-03T16:31:21.384Z",
    "exitTimestampUtc": "2026-03-03T16:35:05.758Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.781,
    "maxLossUsd": 64.11,
    "maxLossPct": 7.81,
    "entryAtrPct": 1.5627225130890052
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
