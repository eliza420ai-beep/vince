# Post-mortem: SNDK short (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- SNDK short closed stop_loss: entry $630.02 -> exit $647.86, P&L $-50.83 (1764.3054545454547 USD, 5x).
- Entry time (UTC): 2026-02-26T16:32:45.424Z
- Hold window target: intraday
- Max loss budget: $26.46 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 191 minutes
- Adverse move: 2.831%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need to know *when* you entered (date/time) and what CT sentiment was saying about SNDK at entry vs. exit — was it a crowded short, did whale accounts flip, did retail FOMO in? Without the sentiment timeline, I can't tell you if you got caught in a contrarian squeeze or just missed macro headwinds. Run me an X_PULSE on SNDK for the trade window and I'll give you the real post-mortem on whether sentiment killed the thesis.

**Confidence: 0.2** (can't assess sentiment lane without the data)

### Oracle

- Lane: prediction market regime
- Confidence: 0%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing critical context:** I need the trade date/timeframe and whether SNDK had concurrent Polymarket activity (earnings, acquisition rumors, sector rotation). Without regime markers—was this a gap-up shock, sustained momentum, or mean-reversion trap?—I can't isolate whether the stop was too tight or the thesis broke.

**What I'd check:** If there's a Polymarket for SNDK (M&A, earnings beat, sector), pull that market's price action and volume around your entry/exit—it'd show if the crowd repriced faster than spot. That'd tell us if the market knew something or if you just got stopped in noise.

**Bottom line:** The 1.76% loss on 5x is tight-stop territory, not regime failure. Bring the date and any Poly context back, and I can frame whether this was bad luck or bad timing.

Confidence: 0

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Was this a perp on Hyperliquid or a stock short elsewhere? What was the invalidation thesis—did price break a technical level, or did macro shift? On the sizing: 5x leverage on a $630 entry is aggressive for a stock short (high margin requirement, tight stop = quick liquidation). If this was a thesis trade (not a scalp), the stop at $647.86 (+2.8%) is reasonable, but the leverage made the loss scale fast. **Recommendation:** For future shorts, either reduce leverage (2-3x max on stocks) or widen invalidation to match your conviction—don't let margin mechanics force you out of a thesis trade early.

**Confidence: 0.65** (missing asset class and thesis clarity).

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
   - action: A/B test defined-risk structure recommendation vs spot leverage entries.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 191,
  "adverseMovePct": 2.831
}
```
