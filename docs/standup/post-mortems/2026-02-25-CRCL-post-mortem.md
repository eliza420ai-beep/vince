# Post-mortem: CRCL long (stop_loss)

**Date:** 2026-02-25

## Trade Snapshot

- CRCL long closed stop_loss: entry $72.62 -> exit $71.24, P&L $-146.83 (7505.018181818183 USD, 10x).
- Entry time (UTC): 2026-02-25T15:08:27.718Z
- Hold window target: intraday
- Max loss budget: $112.58 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 5 minutes
- Adverse move: 1.906%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing critical context:** Was CT sentiment on CRCL bullish into your entry, or were you contrarian? Did whale accounts or alpha builders have a thesis that broke? Without knowing the sentiment setup—whether you were riding momentum or fading fear—I can't assess if this was a sentiment mispricing that failed or just bad timing on an already-crowded trade.

**What I need:** CT vibe on CRCL at entry time, and whether you had a sentiment edge (e.g., "everyone hated it, I went long") or followed the crowd.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I'd need the trade date, CRCL's Polymarket condition (if one exists), and what regime signal triggered the long—was this a paper bot prediction, a perp setup ahead of options, or a macro vibe play? Without that, I can't tie the stop-loss to market pricing or tell you if the exit was early or late relative to what the prediction markets were pricing.

**What I can say:** A 1.9% loss on 10x levered perps is tight risk management—the stop worked. But if CRCL had an active prediction market and we were long on a Synth forecast edge, I'd want to know if Poly repriced *before* your exit; that's the tell on whether you got shaken out or if the regime actually shifted.

**Next step:** Paste the trade date and what signaled the entry, and I can pull CRC

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** Was this a perp (leverage) or spot? What was your invalidation level going in, and did price breach it or did you hit the stop mechanically? On a $750K notional position (10x on $75K), a 1.9% move shouldn't trigger unless your stop was razor-tight—that's either disciplined risk management or a whipsaw entry. **The structure itself is sound** (defined risk, tight stop), but I need to know: did price invalidate your thesis, or did slippage/liquidity hit the stop before the move played out? Without that, I can't tell if this was a good trade that lost or a bad entry that got lucky with a stop.

**Confidence: 0.3** (mechanics are there, but thesis/invalidation missing).

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

- Quality score: 85/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 85
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 85,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 5,
  "adverseMovePct": 1.906
}
```
