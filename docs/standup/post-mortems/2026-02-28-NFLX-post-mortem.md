# Post-mortem: NFLX long (max_age)

**Date:** 2026-02-28

## Trade Snapshot

- NFLX long closed max_age: entry $95.68 -> exit $95.47, P&L $-20.79 (7650.782608695653 USD, 10x).
- Entry time (UTC): 2026-02-27T19:10:36.144Z
- Hold window target: intraday
- Max loss budget: $114.76 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 724 minutes
- Adverse move: 0.222%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** Was this trade thesis built on CT sentiment divergence, or was it a technical/macro setup? If sentiment-driven, I'd need to know what the X pulse said at entry (bullish/bearish, conviction level) vs. what actually moved price — did CT flip, or did macro override retail positioning?

**On the loss itself:** A $20 move on a $95 stock is noise-level; 10x leverage made it sting. From sentiment lane: NFLX doesn't typically drive CT crypto conversation, so this wasn't a "crypto trade" — if you're trading equities on leverage, that's Solus's sizing/execution domain, not mine.

**What I'd flag:** If this was a hedge or macro play tied to rate expectations, check whether the Fed narrative shifted at entry — that's where sentiment can whip fast and break thesis.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the entry/exit dates and the NFLX earnings prediction market odds at those timestamps to connect this to regime. A $0.21 loss on 10x leverage over what timeframe—hours, days?—tells me either you caught a micro-reversion or got caught in noise; without knowing *when* you entered vs. macro vol or earnings-window pricing, I can't isolate whether this was bad timing vs. bad setup.

**If this was pre-earnings:** Polymarket NFLX earnings odds (and IV crush expectations) would've flagged that the move was already priced; post-earnings, the micro-structure flips. **If this was post-earnings:** The loss is likely noise—you were right on direction but got shaken out by liquidity or gamma before the thesis played out.

**Bring me the dates and I'll cross-check against Polymarket earnings

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** Was this a perp (funding bleed?) or spot (why 10x leverage on a $95 stock?). On the mechanics: $20 loss on 10x leverage from a $0.21 move is expected slippage + fees, not a structure problem—but 10x on NFLX spot is outsized for paper. If perp, check: did funding drain the edge before the move reversed? If spot, that leverage doesn't match our $100K stack philosophy (max 2-3x for core positions). **Call:** Tighten entry/exit rules (invalidation bands) and size down leverage unless you have a specific catalyst window. Confidence: 0.6 (need to know product type and why that leverage).

## Root-Cause Tags

- Primary: sizing_too_aggressive
- Secondary: none

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
   - action: A/B test defined-risk structure recommendation vs spot leverage entries.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 724,
  "adverseMovePct": 0.222,
  "echoContext": {
    "entryTimestampUtc": "2026-02-27T19:10:36.144Z",
    "exitTimestampUtc": "2026-02-28T07:14:27.992Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-02-27T19:10:36.144Z",
    "exitTimestampUtc": "2026-02-28T07:14:27.992Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 1.5,
    "maxLossUsd": 114.76,
    "maxLossPct": 15,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
