# Post-mortem: SILVER long (stop_loss)

**Date:** 2026-02-28

## Trade Snapshot

- SILVER long closed stop_loss: entry $97.45 -> exit $95.97, P&L $-78.07 (4965.777411523842 USD, 3x).
- Entry time (UTC): 2026-02-28T10:00:54.488Z
- Hold window target: 1d
- Max loss budget: $74.49 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 81.8%
- Hold duration: 108 minutes
- Adverse move: 1.522%
- Sentiment snapshot: unavailable
- Regime snapshot: unavailable
- Missing data: sentimentScore, regime

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on SILVER/commodities at entry vs. exit? Was there a macro catalyst (Fed speak, DXI move, real rates shift) that shifted the vibe?

Without the timing and sentiment backdrop, I can't tell if you got caught in a contrarian crowded trade or if macro conditions flipped. **What I'd need:** entry timestamp + what CT was saying about commodities/USD strength at that moment.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

Missing key context: **entry time, exit time, and what Polymarket was pricing SILVER at those moments**—without that, I can't compare your paper trade thesis to what the market was actually saying. That said: a $1.48 stop hit on a 3x leveraged commodity position is tight; if you entered on a specific catalyst or model signal, check whether Poly's event odds shifted *before* your stop—if they didn't, your edge thesis may have been crowded or timing-dependent rather than structural. **Confidence: 0.3** (need Poly price snapshots and your entry thesis to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** Was this a perps trade (your lane) or options (mine)? If perps—that's your execution, not my domain. If you're asking me to review sizing/mechanics: 3x leverage on SILVER spot is tight; $78 loss on a $5.48 move (5.6%) suggests you were sized for tighter stops than the asset's typical intraday range. For SILVER specifically, ATR usually runs $1-2/day—your stop was ~2.5% from entry, which gets clipped by noise. Next time: widen stops to 1.5-2x ATR or reduce leverage to 1.5x to absorb normal chop. **Confidence: 0.6** (I'd need to know your target, thesis invalidation, and whether this was a conviction trade or a scalp to give a sharper read).

## Root-Cause Tags

- Primary: thesis_invalid
- Secondary: missing_pretrade_data

## Corrective Actions

1. [immediate] owner=vince due=next_trade
   - action: Require PTQG completion and explicit max-loss check before next entry.
   - success_metric: Next trade includes complete PTQG fields and no missing_data flags.
   - rollback: If signal quality drops for 10+ trades, review cap thresholds.
2. [policy] owner=sentinel due=72h
   - action: Enforce post-mortem schema validation; reject outputs missing evidence fields.
   - success_metric: Post-mortems with pmevCompletenessPct >= 90% over rolling 7 days.
   - rollback: If operational overhead causes missed trades, reduce required manual fields.
3. [experiment] owner=solus due=7d
   - action: A/B test defined-risk structure recommendation vs spot leverage entries.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 47/100
- Escalate to Sentinel: true
- Score breakdown: completeness=22, evidence=15, diagnosis=15, actionability=15, ownership=10
- Context completeness: 78.6%
- Regime vs execution: unclear

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Escalate this loss to Sentinel weekly governance review.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 47
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: thesis_invalid
- PM_SECONDARY_CAUSES: missing_pretrade_data
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 81.8
- PM_MISSING_DATA_COUNT: 2
- PM_CONTEXT_COMPLETENESS_PCT: 78.6

```json
{
  "qualityScore": 47,
  "qualityEscalate": true,
  "primaryCause": "thesis_invalid",
  "secondaryCauses": [
    "missing_pretrade_data"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 81.8,
  "missingData": [
    "sentimentScore",
    "regime"
  ],
  "holdMinutes": 108,
  "adverseMovePct": 1.522,
  "echoContext": {
    "entryTimestampUtc": "2026-02-28T10:00:54.488Z",
    "exitTimestampUtc": "2026-02-28T11:48:56.788Z"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-02-28T10:00:54.488Z",
    "exitTimestampUtc": "2026-02-28T11:48:56.788Z"
  },
  "solusContext": {
    "assetClass": "commodity",
    "thesisClass": "event",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 74.49,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 78.6,
  "regimeVsExecution": "unclear"
}
```
