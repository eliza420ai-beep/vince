# Post-mortem: ETH short (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- ETH short closed stop_loss: entry $2064.29 -> exit $2079.90, P&L $-32.66 (4049.8594594594592 USD, 10x).
- Entry time (UTC): 2026-02-26T04:10:44.614Z
- Hold window target: intraday
- Max loss budget: $29.51 (7.29%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 31 minutes
- Adverse move: 0.756%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on ETH at entry vs. exit? Was there a macro event or whale move that shifted the vibe mid-trade?

**On the loss itself:** A $32 stop on a $2064 entry is tight (1.5% risk) — if CT flipped bullish during your hold, sentiment alone could've stopped you out before technicals played. I'd need the entry timestamp and a quick X_PULSE from that window to tell you if you got sentiment-whipsawed or if macro/on-chain shifted against the short thesis.

**Next time:** Grab the entry time and I'll run a historical vibe check to see if the crowd's conviction changed. That's your edge — knowing when CT turns before price confirms it.

Confidence: 0.3 (not enough data to assess sentiment's role in the loss)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was your thesis entry (macro shift, technicals, funding)? What did Polymarket pricing on ETH-adjacent outcomes (e.g., "ETH above $2.1k by [date]") show at entry vs. exit—were you fighting consensus or aligned with it?

**On the loss itself:** A $32.66 stop on 10x leverage is tight; if you were short into a macro bid (Fed pivot, macro risk-off priced in Poly), the regime likely flipped against you faster than your risk model expected. The $15 move (0.73%) is small in absolute terms but lethal at that leverage—suggests either a momentum spike (futures liquidation cascade, gamma unwind) or you were positioned against the market's real conviction.

**Quick take:** Pull the Polymarket odds on that ETH strike/date at your entry time; if they showed >65

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** direction thesis (why short at $2064?), invalidation level, and funding rate at entry. **Mechanics read:** 10x leverage on a $4K notional is aggressive for a perp that can whip $50-100 in minutes; your stop at ~$16 (0.77%) is tight relative to ETH's intraday noise. **Call:** If this was a tactical short into resistance, the structure is sound—tight stops protect capital. If it was directional conviction, you're overleveraged for the thesis. **Confidence: 0.6** (need thesis + funding context to assess if this was bad luck or bad setup).

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

- Quality score: 96/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 96
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 96,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 31,
  "adverseMovePct": 0.756
}
```
