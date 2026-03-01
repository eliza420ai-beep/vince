# Post-mortem: OPENAI long (stop_loss)

**Date:** 2026-03-01

## Trade Snapshot

- OPENAI long closed stop_loss: entry $1009.90 -> exit $990.47, P&L $-48.91 (2477.5073747046386 USD, 3x).
- Entry time (UTC): 2026-03-01T17:10:40.222Z
- Hold window target: intraday
- Max loss budget: $37.16 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 51 minutes
- Adverse move: 1.924%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on OPENAI at entry vs. exit? Was there a macro catalyst (Fed news, tech selloff, earnings) or did sentiment just shift?

**Sentiment take:** If you entered into euphoria and exited into fear, that's a classic retail trap — CT was likely crowded long. If macro shifted (e.g., rate expectations changed), that's a different story and validates the stop. Without the timing and sentiment backdrop, I can't tell if this was a sentiment mispricing or just bad macro luck.

**Ask me:** Run a **WTT** on OPENAI for that date range, and I'll flag what CT was saying vs. where price went.

Confidence: 0.3 (not enough data to assess).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: entry date, exit date, and what Polymarket was pricing OPENAI at those moments. A $19 stop (1.9%) on a 3x perp is tight—typical for scalp regime, but I can't assess whether you were fighting the market consensus (Poly odds) or caught in a liquidation cascade. Pull the timestamps and I'll cross-ref Poly pricing to tell you if you exited into regime weakness or just got shaken on noise. Without that, I can only say: 3x leverage + tight stop + single name = high whipsaw risk unless you had intraday vol context I'm not seeing.

**Confidence: 0.3** (need timestamps + Poly snapshot to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage venue (perps vs spot), hold duration, and what triggered the stop (price action vs time?). **On mechanics alone:** 3x leverage on a single equity name is aggressive for a paper bot testing edge—you're optimizing for volatility capture, not repeatable signal. If this was a 1-2h hold, the $49 loss on $2.4K notional (2% realized) is noise; if it was a day+ hold, your stop was too tight relative to intraday noise. **Recommendation:** Tighten position sizing to 1-2x on single names until the bot proves consistent win rate across 20+ trades; then size up.

**Confidence: 0.6** (missing venue/duration makes this pattern-level feedback, not trade-specific).

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
  "holdMinutes": 51,
  "adverseMovePct": 1.924,
  "echoContext": {
    "entryTimestampUtc": "2026-03-01T17:10:40.222Z",
    "exitTimestampUtc": "2026-03-01T18:01:47.746Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-01T17:10:40.222Z",
    "exitTimestampUtc": "2026-03-01T18:01:47.746Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 37.16,
    "maxLossPct": 4.5,
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
