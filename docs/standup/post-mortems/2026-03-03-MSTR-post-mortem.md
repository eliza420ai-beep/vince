# Post-mortem: MSTR long (stop_loss)

**Date:** 2026-03-03

## Trade Snapshot

- MSTR long closed stop_loss: entry $137.69 -> exit $135.52, P&L $-133.42 (8214.285714285714 USD, 5x).
- Entry time (UTC): 2026-03-02T18:50:23.155Z
- Hold window target: intraday
- Max loss budget: $123.21 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 455 minutes
- Adverse move: 1.574%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Sentiment read:** MSTR was riding mega-bullish CT vibes (BTC proxy play, Saylor narrative dominates), so the stop hit despite macro tailwinds. Key missing: **Did CT sentiment actually shift before your exit, or did this feel like noise/liquidation cascade?** If whales and alpha accounts were still long MSTR when you stopped, that's a signal the trade thesis held but your risk management was tighter than the crowd's conviction. If sentiment had already turned bearish, you dodged a bigger bleed.

**What I'd need to give you real feedback:** Exact exit date/time + did you check X_PULSE that morning to see if the MSTR/BTC narrative had flipped?

Confidence: 0.6 (missing temporal context on when sentiment actually shifted relative to your stop).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What's the Polymarket price on MSTR (or broader tech/macro proxy) at entry and exit? That'd show whether the paper bot was fighting consensus or if Poly had already priced in the move. Also—what was the thesis (momentum, mean reversion, macro trigger)? Without that framing, I can't tell if the stop was well-placed or reactive.

**Given the data:** $2 drawdown on a $137 entry (1.5%) with 5x leverage → $133 loss is textbook tight-stop execution. If Poly had MSTR bid/ask wider than that at entry, the paper bot was fighting illiquidity, not thesis. If Poly was already pricing weakness, the trade was contrarian and the stop saved you from worse bleed.

**Call:** Pull the live Polymarket odds on MSTR (or ask me to) and compare

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Was this a hedge against BTC or a standalone directional bet? What was your thesis invalidation trigger—and did $135.52 hit it, or did you stop out early? At 5x leverage on a $8.2K position, you're sizing aggressively; if MSTR is meant to be a long-term thesis hedge (not a swing trade), that leverage is too hot for the thesis.

**The mechanic:** $2.17 stop (1.58% below entry) is tight for MSTR's typical daily noise—you likely got shaken out on intraday volatility, not thesis break. If the thesis is intact, tighter stops on larger positions bleed capital on whipsaws.

**Call:** Either widen stops to match thesis (3–5% for stock hedges) or drop leverage (2x max for thesis hedges). Paper trades should prove position structure

## Root-Cause Tags

- Primary: thesis_invalid
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

- Quality score: 88/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=10, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: unclear

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 88
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: thesis_invalid
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 88,
  "qualityEscalate": false,
  "primaryCause": "thesis_invalid",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 455,
  "adverseMovePct": 1.574,
  "echoContext": {
    "entryTimestampUtc": "2026-03-02T18:50:23.155Z",
    "exitTimestampUtc": "2026-03-03T02:25:45.304Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-02T18:50:23.155Z",
    "exitTimestampUtc": "2026-03-03T02:25:45.304Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 123.21,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "unclear"
}
```
