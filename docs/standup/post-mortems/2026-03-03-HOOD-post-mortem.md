# Post-mortem: HOOD long (stop_loss)

**Date:** 2026-03-03

## Trade Snapshot

- HOOD long closed stop_loss: entry $79.12 -> exit $77.85, P&L $-134.05 (8118.279569892473 USD, 5x).
- Entry time (UTC): 2026-03-02T18:34:12.690Z
- Hold window target: intraday
- Max loss budget: $121.77 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 455 minutes
- Adverse move: 1.601%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** What was CT's sentiment on HOOD at entry vs. exit? Was this a contrarian fade (CT hated it, you bought) or momentum chase (CT loved it, you followed)? Without the X vibe snapshot, I can't tell if you were fighting sentiment headwinds or if macro shifted underneath you. Also: did a specific news/earnings event tank it, or was it pure sentiment bleed?

**General take:** 5x leverage on a single-name stock (not even crypto) in a choppy macro environment is high-risk for sentiment-driven whipsaw — HOOD moves on retail flow and Robinhood headlines, both volatile on X. If CT wasn't already bullish pre-entry, you were fighting the crowd.

**What I need:** CT sentiment score on HOOD at entry time, and whether macro (rates, Fed, market breadth) shifted during the hold.

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id

I need the Polymarket condition for HOOD to give you real odds context—was the market pricing a breakout or fade when you entered at $79.12? Without that snapshot (what the prediction market implied for the move, IV regime, volume), I can't tell if your stop was too tight for the vol or if the market repriced against you fundamentally. Missing: entry timestamp, Poly HOOD condition ID, and whether this was a vol crush or directional reversal. If you pull the live odds for the relevant HOOD market, I can compare fair value to your entry and tell you if the regime shift was telegraphed.

**Confidence: 0.3** (incomplete market data).

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, initial thesis invalidation trigger, and whether this was part of a sector rotation (Robotics/Defense/Semiconductors watchlist context). On mechanics: 5x leverage on a $79 stock with a $1.27 stop (1.6% risk) is tight—typical for scalp/day trades, not swing thesis. If HOOD was a 2-4 hour hold, structure is sound (tight stop, defined risk); if it was meant to be multi-day, the leverage-to-thesis mismatch cost you. **Call:** Post the entry date and original thesis invalidation—that tells me if the stop was premature or if the setup itself was flawed.

**Confidence: 0.4**

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 455,
  "adverseMovePct": 1.601,
  "echoContext": {
    "entryTimestampUtc": "2026-03-02T18:34:12.690Z",
    "exitTimestampUtc": "2026-03-03T02:08:51.693Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-02T18:34:12.690Z",
    "exitTimestampUtc": "2026-03-03T02:08:51.693Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 121.77,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp",
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
