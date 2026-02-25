# Post-mortem: HYPE short (stop_loss)

**Date:** 2026-02-25

## Trade Snapshot

- HYPE short closed stop_loss: entry $27.87 -> exit $28.99, P&L $-24.90 (611.1586518432258 USD, 3x).
- Entry time (UTC): 2026-02-25T15:23:14.983Z
- Hold window target: intraday
- Max loss budget: $24.45 (12.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 198 minutes
- Adverse move: 4.025%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter (exact time/date)? What was CT sentiment at entry vs. exit? Was there a macro catalyst or news event that moved HYPE during your hold? Without the sentiment backdrop and timing, I can't tell you if CT was ahead of the move or if you got caught in a reversal you should've seen coming.

**What I need to give you real feedback:** X pulse at entry time, any whale/alpha accounts calling the move, and whether sentiment was already turning bearish on HYPE before your stop.

Confidence: 0.2 (not enough data to assess sentiment-side execution).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id, market_name

**Missing context:** I need the condition_id or market name for HYPE to pull live Polymarket odds—without that, I can't compare your entry price to what the market was pricing the outcome at, which is the real tell. That said, a $1.12 move (4% against you on 3x) suggests either tight stops in a volatile regime or a quick repricing; if Polymarket had already shifted probability higher before your exit, that's regime confirmation (market knew something). 

**What I'd check:** Pull the Polymarket price history for HYPE around your entry/exit timestamps—if the CLOB was already climbing, your stop was right (don't fight repricing). If it was flat and you got shaken out, that's execution/regime mismatch worth reviewing with the paper bot's vol settings.

**Confidence: 0.6** (need live market data to diagnose

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** Was this a perp short or options position? If perps, what was funding rate at entry/exit, and did you have a hedge (e.g., long calls)? If options, what strike/expiry and was it early-closed or held to expiry?

**On sizing alone:** $611 notional on 3x leverage is tight for a $100K stack—you're risking ~0.6% per trade, which is sound, but HYPE's volatility (especially sub-$30) demands tighter stops or smaller size. The 4% move ($27.87→$28.99) hit your stop; that's reasonable execution, but if this is recurring on HYPE shorts, consider: (1) higher IV = wider stops needed, or (2) skip HYPE shorts entirely and stick to the wheel (puts/calls where premium is the edge, not direction

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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 89/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 198,
  "adverseMovePct": 4.025
}
```
