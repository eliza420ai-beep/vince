# Post-mortem: CRCL long (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- CRCL long closed stop_loss: entry $88.06 -> exit $86.74, P&L $-139.52 (8990.2756706753 USD, 10x).
- Entry time (UTC): 2026-02-26T14:50:57.702Z
- Hold window target: intraday
- Max loss budget: $134.85 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 32 minutes
- Adverse move: 1.502%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter vs. close? What was CT sentiment on CRCL at entry vs. exit? Was there a macro/BTC dump, or did CRCL-specific bearish chatter spike? Without the timing and sentiment backdrop, I can't tell if you got whipsawed by noise or if CT actually turned on the token.

**What I need:** Entry date/time, exit date/time, and I'll run X_PULSE on CRCL sentiment around those windows to see if CT saw it coming.

Confidence: 0.3 (can't assess sentiment impact without the data).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing critical context:** I need the trade timeframe (hours? days?), what triggered your entry signal (technicals, news, Polymarket edge?), and whether CRCL had active prediction markets during your hold. Without that—plus current Polymarket odds on CRCL if they exist—I can't isolate whether this was regime drift, liquidity slippage, or a signal that didn't age well. 

**What I can say:** A $1.32 move (1.5%) stop on a 10x perp is tight; if you were trading on short-term momentum or a Polymarket-derived edge, that regime often reprices fast on news or orderbook imbalance. 

**Ask me:** Pull live Polymarket CRCL odds and recent volume if markets exist—that'll show me what the market priced in *after* your exit, and we can see if

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** invalidation (what price/signal would have told you to exit before stop?), hold time (how long did you hold?), and why 10x on a stock ticker (CRCL is equities—leverage on illiquid names is brutal). **On structure:** $139 loss on $8,990 notional is 1.5% drawdown, acceptable for a stop; but 10x on a sub-$100 stock has wide spreads and slippage risk that eats edge. **Mechanics call:** If CRCL is in HIP-3 (it's not yet—it's TradFi), paper leverage is fine for proof-of-concept; if this was live, that's too much leverage on a name with poor liquidity. **Next:** Post invalidation + hold time, I can assess whether the stop was well-placed or if you're exiting too

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 32,
  "adverseMovePct": 1.502
}
```
