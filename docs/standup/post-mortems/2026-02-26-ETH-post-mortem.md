# Post-mortem: ETH long (signal_flip)

**Date:** 2026-02-26

## Trade Snapshot

- ETH long closed signal_flip: entry $2024.10 -> exit $2024.10, P&L $-2.89 (5789.960940841055 USD, 10x).
- Entry time (UTC): 2026-02-26T21:09:24.602Z
- Hold window target: intraday
- Max loss budget: $101.32 (17.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 0 minutes
- Adverse move: 0%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context:** CT sentiment *at entry and exit* — did you go long into euphoria or capitulation? Also need macro backdrop (Fed news, BTC momentum, ETH narrative that day). Without those, I can't tell if you fought sentiment headwinds or just got shaken out of a crowded trade.

**What I'd need:** X pulse from entry/exit timestamps, and which macro event (if any) was moving the needle. That'll tell us if sentiment was against you or if it was pure execution/timing.

Confidence: 0.3 (can't assess without the data)

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing critical context:** Was this a Polymarket-informed entry (i.e., did ETH prediction markets signal upside that didn't materialize), or a pure technicals flip? The flat price action ($2024.10 → $2024.10) with a $2.89 loss on 10x suggests slippage/funding bleed rather than directional miss—typical of choppy, low-conviction regimes. **To give you regime feedback:** Pull the ETH weekly/monthly prediction market odds at entry and exit; if they stayed flat or inverted, that's your regime signal (markets weren't pricing in your conviction). If Poly odds actually moved *against* your entry thesis, that's a data point—prediction markets caught the regime shift before spot price did, which is their edge.

**Confidence: 0.4** (need Polymarket context from your entry time to isolate regime vs. execution

### Solus

- Lane: options mechanics and sizing
- Confidence: 62%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry time, hold duration, liquidation distance at entry, and funding rate environment—these shape whether this was a sizing problem or a signal problem. **On structure:** 10x leverage on a $2K entry with zero price movement but -$5.8K loss screams funding bleed, not execution error. **The call:** If you held >4h in a funding spike, that's a sizing problem (reduce leverage or position size in high-funding regimes). If <1h, the slippage/fees ate you—tighten entry/exit logic. **Next:** Log hold time and avg funding rate for this trade; compare to your edge window.

Confidence: 0.62

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
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 0,
  "adverseMovePct": 0
}
```
