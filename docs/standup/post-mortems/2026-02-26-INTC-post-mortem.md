# Post-mortem: INTC long (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- INTC long closed stop_loss: entry $46.59 -> exit $45.85, P&L $-126.44 (7765.333333333333 USD, 10x).
- Entry time (UTC): 2026-02-26T11:35:18.842Z
- Hold window target: intraday
- Max loss budget: $116.48 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 192 minutes
- Adverse move: 1.578%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on INTC at entry vs. exit? Was there a macro catalyst (Fed, earnings, sector rotation) that shifted the vibe between those two points?

**Sentiment take:** INTC is a boomer stock — CT doesn't drive it, macro does. If you caught a fade on a Fed pivot or tech selloff, that's macro timing, not sentiment edge. Check if CT was already pricing the move before your stop hit, or if you got whipsawed by intraday noise outside the sentiment lane.

**Confidence: 0.4** (need entry timestamp + CT pulse at both points to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need the trade date/timeframe and what macro or event was pricing INTC at entry—was this ahead of earnings, Fed speak, or sector rotation? Without that, I can't map it to prediction-market sentiment or regime shifts that would've telegraphed the move.

**What I can say:** A 1.6% stop hit on a 10x levered perps position is tight mechanics—the real question is whether Polymarket's semiconductor/INTC markets (if active) showed deteriorating odds before your entry, or whether realized vol just spiked. If you have the exact entry time, I can check what the prediction markets were pricing for that window and flag whether on-chain conviction was already fading.

**Ask VINCE for the regime call**—he'll have the tape and whether this was a false breakout or a real macro shift. I can then cross-check Poly odds

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your thesis entry (support level, breakout, catalyst)? What triggered the stop at exactly $45.85 — was that a hard invalidation or panic exit? And what's your typical win rate / risk-to-reward ratio on paper trades — are you targeting 2:1 or better?

**On structure:** $126 loss on a $46 entry is a tight 0.27% stop, which is reasonable for a 10x perp play, but only if your target was 5%+ upside to justify the leverage. If you're taking 0.27% stops routinely, you need a win rate north of 75% to break even after fees — hard to sustain. **Call:** Post-mortem the thesis invalidation (why did $45.85 break?), then decide: tighter entries with wider stops, or lower leverage with longer holds.

**

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

- Quality score: 89/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 192,
  "adverseMovePct": 1.578
}
```
