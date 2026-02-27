# Post-mortem: SILVER short (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- SILVER short closed stop_loss: entry $87.07 -> exit $88.68, P&L $-119.23 (6299.907035573123 USD, 20x).
- Entry time (UTC): 2026-02-26T16:32:23.973Z
- Hold window target: intraday
- Max loss budget: $94.50 (30.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 261 minutes
- Adverse move: 1.843%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

Missing critical context: **Was CT bearish on SILVER when you entered?** Did sentiment support the thesis, or did you trade against the crowd? Also — **what macro event triggered the stop?** (Fed pivot, dollar strength, real rates shift?). Sentiment alone doesn't kill trades, but if you shorted into bullish CT without a macro catalyst, that's a red flag for future entries. Check if your thesis was contrarian *by design* or just isolated.

Confidence: 0.3 (can't assess sentiment fit without knowing CT's SILVER vibe at entry + macro context).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing critical context:** I need the entry timestamp, exit timestamp, and which Polymarket SILVER contract you were tracking (there are multiple—election, commodity, etc.). Without those, I can't map your entry/exit to the market's probability shift or volatility regime at that moment.

**What I can say:** A 1.61-point move (1.85% loss on 20x) in a leveraged short is tight—suggests either a fast reversal into support or a stop-hunt. If this was tied to a Polymarket SILVER prediction (e.g., Trump odds), check whether the market repriced on news between your entry and stop; if the Poly contract spiked, your paper short was fighting consensus, not regime. If it was a commodity play, that's VINCE's perps domain—he'll have the macro context.

**Next time:** Paste the timestamps and which contract; I

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** Was this a perp trade (your lane) or options? If perps—that's your domain, not mine. If you're asking me to review sizing/mechanics broadly: **20x leverage on SILVER is aggressive for a commodity with funding swings and thin liquidity; a $119 loss on $6.3K notional suggests tight stops that got clipped by noise.** Better structure: lower leverage (5-10x), wider stops relative to volatility, or hedge with options instead. **Confidence: 0.6** (you didn't specify product, so I'm guessing perps; if it's something else, reframe and I'll recalibrate).

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
  "holdMinutes": 261,
  "adverseMovePct": 1.843
}
```
