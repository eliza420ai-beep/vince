# Post-mortem: ETH long (stop_loss)

**Date:** 2026-02-27

## Trade Snapshot

- ETH long closed stop_loss: entry $2042.51 -> exit $2024.00, P&L $-42.90 (4486.818206896552 USD, 10x).
- Entry time (UTC): 2026-02-27T04:59:57.222Z
- Hold window target: intraday
- Max loss budget: $33.24 (7.41%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 160 minutes
- Adverse move: 0.906%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

Missing critical context: **What was CT's sentiment on ETH at entry vs. exit?** Was the trade thesis macro-bullish (inflation data, Fed pivot) or micro (ETH supply shock)? Without knowing if sentiment shifted against your thesis or if you got shaken out during normal noise, I can't give you real feedback. Also: **did whale positions move?** If large holders were exiting while retail chased, that's a sentiment divergence worth knowing.

Run an X_PULSE on ETH sentiment around your entry/exit timestamps, and I'll tell you if you got caught in a contrarian setup or if sentiment actually turned.

**Confidence: 0.3** (can't assess without the sentiment delta).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need the trade date/time and which Polymarket ETH prediction (if any) you were hedging against—was this a directional bet against a specific market's odds, or a standalone perp trade? The $42.90 stop on a $2042 entry (2.1% loss on 10x) is tight; if Polymarket ETH markets were pricing higher conviction upside that day, the regime mismatch explains the whipsaw. Without the timestamp and market odds at entry, I can't tell if you were fighting consensus or if the market repriced faster than your thesis.

**Direct feedback:** Post-mortems on perps are VINCE's lane (he has live fills and chain context). I can pull ETH prediction odds from that day if you want to cross-check whether Polymarket was signaling a regime shift you missed—that's the edge play.

Confidence:

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage (10x noted, but was this optimal for your edge?), duration (how long held?), and **why that stop placement**—$18.51 below entry is tight for ETH volatility. On structure: 10x on a $4.5K position is reasonable sizing, but the stop suggests you were fighting ETH's intraday noise rather than trading a directional thesis. If this was a short-term scalp, tighter stops make sense; if directional, you got shaken out. **Call:** Review your stop logic against your actual conviction—either widen for thesis trades or reduce size if you're taking noise-level hits. Confidence: 0.6 (need trade duration and thesis to assess properly).

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
  "holdMinutes": 160,
  "adverseMovePct": 0.906
}
```
