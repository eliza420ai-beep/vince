# Post-mortem: HYPE long (stop_loss)

**Date:** 2026-03-04

## Trade Snapshot

- HYPE long closed stop_loss: entry $32.20 -> exit $31.02, P&L $-259.67 (7000 USD, 10x).
- Entry time (UTC): 2026-03-03T16:50:56.399Z
- Hold window target: intraday
- Max loss budget: $245.00 (35.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 621 minutes
- Adverse move: 3.66%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (timestamps)? What was CT sentiment on HYPE at entry vs. exit? Was there a macro shift (BTC dump, Fed news, etc.) that broke the thesis?

**On the trade itself:** A 3.7% stop on a 10x is razor-tight — sentiment can swing 10-15% intraday on low-cap alts without fundamentals changing. If CT was bullish at entry but turned neutral/bearish at exit, that's a sentiment fade you could've seen coming via X_PULSE. If macro shifted (BTC -2%+ or macro headline), that's exogenous — not a sentiment miss on your part.

**What I'd check:** Pull the X pulse from entry and exit timestamps. If sentiment was still +40 but you got stopped, the issue was position sizing/stop placement, not sentiment read. If sentiment

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

Missing key context: **when** this closed (market regime—bull/consolidation/crash?), **what the Polymarket odds were at entry/exit** for HYPE price direction, and **whether volume spiked into your stop** (liquidation cascade vs. organic selling). That said: a 3.7% stop hit on 10x leverage in a perp is tight positioning for any asset without a catalyst—if Polymarket wasn't pricing a sharp directional move at your entry, you were fighting the consensus. **Confidence: 0.4** (need regime + odds snapshot to isolate execution vs. thesis error).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your thesis (bull week ahead? support hold?), and did price invalidate it before the stop, or did you get stopped into noise? 

**On mechanics:** 10x on a $7K position into HYPE at $32 is aggressive sizing for a weekly wheel asset—you're betting the full stack on directional conviction, not income. That stop at $31.02 (3.7% below entry) is tight for a volatile asset; you likely got shaken out on intraday noise rather than a structural break. If the thesis was still intact, that's a structure problem (position too big relative to conviction or volatility budget). If thesis broke, the stop worked—no feedback needed.

**Next time:** Separate wheel capital (premium income, tight stops OK) from directional bets (larger stops, smaller size, or skip entirely). HYPE wheel = sell puts/calls for

## Root-Cause Tags

- Primary: regime_conflict
- Secondary: sizing_too_aggressive

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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 98/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 98
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: sizing_too_aggressive
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 98,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [
    "sizing_too_aggressive"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 621,
  "adverseMovePct": 3.66,
  "echoContext": {
    "entryTimestampUtc": "2026-03-03T16:50:56.399Z",
    "exitTimestampUtc": "2026-03-04T03:12:12.889Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-03T16:50:56.399Z",
    "exitTimestampUtc": "2026-03-04T03:12:12.889Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 3.5,
    "maxLossUsd": 245,
    "maxLossPct": 35,
    "entryAtrPct": 7
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
