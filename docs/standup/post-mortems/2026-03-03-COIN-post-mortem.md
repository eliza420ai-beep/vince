# Post-mortem: COIN long (stop_loss)

**Date:** 2026-03-03

## Trade Snapshot

- COIN long closed stop_loss: entry $184.17 -> exit $181.19, P&L $-123.24 (7395.680570063747 USD, 5x).
- Entry time (UTC): 2026-03-02T20:18:39.467Z
- Hold window target: intraday
- Max loss budget: $110.94 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 472 minutes
- Adverse move: 1.616%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** What was CT's sentiment on COIN when you entered vs. exited? Was there a macro shift (Fed news, BTC dump, sector rotation)? Did whale accounts flip bearish before your stop hit? 

Without the sentiment timeline, I can't tell you if this was a "you missed the signal" or a "sentiment was genuinely mixed and stopped you out fairly." Run me the entry date/time and I'll pull X_PULSE to see what the vibe was — that'll show if CT had already turned or if this was just volatility noise.

**Confidence: 0.3** (need sentiment data to be useful here).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: **entry/exit timestamps, Polymarket COIN prediction at entry vs exit, and what regime shift (if any) triggered the stop.** That said, a $184→$181 move on 5x levered perps is tight—if Polymarket was pricing COIN >55% and spot dropped below that threshold on news, the stop was likely correct (you got shaken out of a mean-reversion setup that didn't mean-revert). If Polymarket stayed flat and spot just bled, that's regime drift—your thesis died, not your execution. Pull the Poly odds at entry time and compare; that tells you if you sized wrong or timed wrong. Confidence: 0.6 (need Polymarket price history + timestamp to isolate the regime call).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** Was this perps (leverage) or spot? What was your thesis invalidation—did funding spike, did macro shift, or did technicals break? At 5x on COIN ($7.4K notional), the stop at $181.19 is tight (~1.6% from entry); if you were betting on a specific catalyst or macro move, that's a reasonable structural stop, but I need to know *what changed* to assess if the stop was right-sized or if you got shaken out of a valid thesis.

**If this was perps:** The sizing is reasonable for a $100K stack (7.4K = 7.4%), but 5x leverage on a single name is aggressive without a clear short-term edge—consider 2-3x for thesis trades to survive noise. **If spot:** A $123 loss on a $7.4K position is solid risk management

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 472,
  "adverseMovePct": 1.616,
  "echoContext": {
    "entryTimestampUtc": "2026-03-02T20:18:39.467Z",
    "exitTimestampUtc": "2026-03-03T04:10:25.852Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-02T20:18:39.467Z",
    "exitTimestampUtc": "2026-03-03T04:10:25.852Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 110.94,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
