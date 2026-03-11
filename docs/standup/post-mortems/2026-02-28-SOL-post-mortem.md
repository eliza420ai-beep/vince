# Post-mortem: SOL long (stop_loss)

**Date:** 2026-02-28

## Trade Snapshot

- SOL long closed stop_loss: entry $81.19 -> exit $78.58, P&L $-245.45 (7523.054896794028 USD, 10x).
- Entry time (UTC): 2026-02-27T19:10:08.647Z
- Hold window target: intraday
- Max loss budget: $188.08 (25.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 690 minutes
- Adverse move: 3.213%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Sentiment read on the SOL stop-loss:**

SOL was riding a micro rally into your entry — did CT flip bearish between entry and exit, or was this a macro dump (BTC weakness, rate fears)? That context matters: if sentiment stayed bullish while price dumped, you got shaken out of a contrarian setup; if CT turned cold, the stop was right. Also missing: **what was the macro backdrop?** (Fed news, equity dump, on-chain metrics?) and **what did whale accounts say during your hold?** Without that, I can't tell if this was a sentiment miss or just volatility eating your leverage.

**Confidence: 0.4** — need the time window, macro event, and CT vibe during the trade to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was the Polymarket SOL price action around your entry/exit window? Was there a coordinated macro move (Fed, crypto sentiment flip, liquidation cascade)? Did on-chain metrics or whale flow precede the stop?

**On the trade itself:** A 3.3% stop on a 10x perp is tight—you got shaken out in normal intraday noise. The real question is whether SOL's prediction-market probability shifted materially (e.g., weekly options IV spiked, or Poly bets on macro headwinds moved against you). If Poly odds stayed flat or bullish, that's a regime call you got wrong, not a market-structure problem. If they rolled bearish *before* your stop, you had warning.

**Next time:** Pull Polymarket SOL weekly/monthly odds *before* entry and at stop-loss time—that delta tells

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Was this a perps trade (funding, liquidation distance, duration) or spot? What was your invalidation thesis—did price break it cleanly, or did you get shaken out before structure confirmed the move? On sizing: $245 loss on $7.5K notional (3.3% drawdown) is reasonable for a stop hit, but 10x leverage on SOL (high beta, correlated to BTC) needs tight risk discipline—did you size based on account risk or position risk? **The call:** If invalidation triggered cleanly (e.g., support broke), the stop was right; if you got shaken and price recovered after, that's a structure/patience miss, not a mechanics miss. Either way, 10x on SOL requires sub-1% stops or smaller size to survive noise.

**Confidence: 0.65** (perps mechanics are Vince's

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

- Quality score: 100/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 100
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: sizing_too_aggressive
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 100,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [
    "sizing_too_aggressive"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 690,
  "adverseMovePct": 3.213,
  "echoContext": {
    "entryTimestampUtc": "2026-02-27T19:10:08.647Z",
    "exitTimestampUtc": "2026-02-28T06:40:29.833Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-02-27T19:10:08.647Z",
    "exitTimestampUtc": "2026-02-28T06:40:29.833Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 2.5,
    "maxLossUsd": 188.08,
    "maxLossPct": 25,
    "entryAtrPct": 5
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
