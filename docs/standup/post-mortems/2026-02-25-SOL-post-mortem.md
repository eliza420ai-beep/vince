# Post-mortem: SOL short (stop_loss)

**Date:** 2026-02-25

## Trade Snapshot

- SOL short closed stop_loss: entry $83.30 -> exit $87.17, P&L $-90.61 (1928.7707496296296 USD, 3x).
- Entry time (UTC): 2026-02-25T12:29:56.221Z
- Hold window target: intraday
- Max loss budget: $77.15 (12.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 248 minutes
- Adverse move: 4.648%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

Missing key context: **When did you enter?** Sentiment shifts fast—if you shorted SOL while CT was euphoric (which it was mid-Jan), you were fighting momentum, not reading it. Did you check CT's SOL vibe at entry, or did you size based on TA alone? The stop hit quick ($3.87 range), which suggests either tight risk management or you caught a genuine bullish squeeze—I'd need the timestamp and CT's sentiment *at entry* to tell you if this was a sentiment-read miss or just bad timing on a contrarian play. **What I'd pull for next time:** Run X_PULSE on SOL sentiment before entry, flag if whale accounts are accumulating (bearish setup) vs. retail FOMO (your short gets squeezed). 

Confidence: 0.3 (not enough data to assess sentiment execution).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the Polymarket odds for SOL price at entry/exit time—did the prediction market price a move above $87 as <20% or >40%? That tells us if the stop was hit in a regime shift the market saw coming, or if you got whipsawed by vol the market underpriced. Also: what was your thesis (mean reversion, macro headwind, technical)? The $3.87 move on 3x is a ~1.5% spot move—tight stop for a perp, easy to tag in chop. **Bottom line:** Without the market's probability lens, I can't tell if this was a regime call that failed or just bad timing in a ranging market. Pull the SOL prediction markets from that window and I'll give you the real post-mortem.

Confidence: 0.3

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation? At what price did you expect to be wrong, and why did $87.17 breach it? On structure: 3x leverage on a $1,928 position (notional ~$5,784) is reasonable sizing, but the stop at $87.17 (4.7% above entry) is tight for SOL's typical daily swings—you got shaken out. **Call:** Next time, widen stops to 6-8% or use a tighter entry closer to support. Post the invalidation level and I'll tell you if the structure was sound.

**Confidence: 0.6** (mechanics check only; need your thesis + invalidation to assess if stop placement was right or if entry itself was weak).

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 248,
  "adverseMovePct": 4.648
}
```
