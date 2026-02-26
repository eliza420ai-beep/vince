# Post-mortem: MU short (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- MU short closed stop_loss: entry $421.14 -> exit $427.57, P&L $-30.76 (1949.696 USD, 10x).
- Entry time (UTC): 2026-02-26T00:17:26.324Z
- Hold window target: intraday
- Max loss budget: $29.25 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 349 minutes
- Adverse move: 1.528%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on MU/semis at entry vs. exit? Was there a macro catalyst (Fed speak, earnings, rate expectations) that shifted the vibe between those two points?

**On the loss itself:** Without the sentiment timeline, I can't tell if you got caught in a contrarian flush (bearish → bullish flip) or if macro whipsawed you. If semis/tech sentiment flipped bullish during your hold, that's a lesson on timing entries to sentiment extremes — not just price levels.

**What I need to audit this properly:** Entry timestamp, CT's vibe on MU/semis at that moment, and what changed by exit. Then I can flag whether you were fighting momentum or if it was just bad luck.

Confidence: 0.3 (too much missing to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the Polymarket odds for MU at entry and exit to compare paper price action vs. market pricing—did the market repriced MU higher into your entry, or did you get caught in a whipsaw the desk didn't see coming? 

**On the trade itself:** $421→$427 is a 1.4% move against a 10x short on a mega-cap semiconductor name—tight stop, reasonable risk management. The real question is regime: was this a mean-reversion setup (market overbought, you shorted) that broke into momentum instead, or did macro/earnings risk shift the Polymarket odds for MU during your hold? 

**What I'd pull:** Live Polymarket odds for MU earnings/guidance, and whether IV crushed into your exit or expanded. That tells us if the market repriced fundamentals or if this was pure technical liquidation noise.

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Was this a perp on Hyperliquid (funding rate, liquidation price, hold time)? A stock short (borrow cost, short squeeze risk)? The 10x leverage on a $421 entry is aggressive for a semiconductor name—MU's typical daily move is 2-3%, so a 1.5% stop was tight. If this was a paper trade to test the bot, the loss is fine; if live capital, the leverage-to-volatility ratio needs reset: either lower leverage (5x), wider stops (3-4%), or skip MU entirely in favor of lower-vol assets. **Confidence: 0.6** (need trade context—perp vs stock, hold duration, why 10x).

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 349,
  "adverseMovePct": 1.528
}
```
