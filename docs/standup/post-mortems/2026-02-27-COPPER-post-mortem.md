# Post-mortem: COPPER short (stop_loss)

**Date:** 2026-02-27

## Trade Snapshot

- COPPER short closed stop_loss: entry $6.01 -> exit $6.11, P&L $-89.33 (5307.505777777778 USD, 20x).
- Entry time (UTC): 2026-02-27T00:01:41.738Z
- Hold window target: intraday
- Max loss budget: $79.61 (30.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 419 minutes
- Adverse move: 1.633%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter (exact time/date)? What was CT sentiment on COPPER at entry vs. exit? Was there a macro catalyst (Fed, BTC move, altseason flip) that shifted the vibe? 

**What I can say:** A $5.3k loss on a micro-cap (COPPER) at 20x suggests you caught a liquidity crunch or sentiment reversal — those move fast and stop-losses are the right call. Without knowing the sentiment backdrop at entry, I can't tell if this was a timing miss (entered when CT was already rotating out) or just unlucky execution. Pull the entry timestamp and I'll check what CT was saying then.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was your thesis entry signal (Polymarket edge, technicals, macro)? And what timeframe—was this a scalp or swing hold? 

**On the loss itself:** A 10-cent move on COPPER into a stop at 1.67% slippage on 20x is tight risk management, which is good—but if Polymarket had COPPER upside priced >55% and you shorted, that's regime conflict (market pricing strength, you pricing weakness). Without knowing your edge source, I can't tell if this was a bad entry or bad timing.

**What I need:** Pull the Polymarket COPPER market detail (if it exists) and your entry thesis. Then I can tell you if the market repriced against you or if the setup was flawed.

**Confidence: 0.4** (too many unknowns).

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

Missing critical context: Was this a perp on Hyperliquid or spot? What was your invalidation level—did price breach it cleanly, or did you get stopped out by noise? On 20x leverage with a $89 loss on a $6.01 entry, your stop was ~1.7% away—tight for a commodity, especially if funding was positive (you bled theta). Mechanically: either your thesis invalidated (acceptable loss) or your sizing/leverage was too aggressive for the volatility regime. Confidence: 0.4 (need trade structure—perp vs spot, funding, thesis invalidation).

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
  "holdMinutes": 419,
  "adverseMovePct": 1.633
}
```
