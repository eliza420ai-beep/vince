# Post-mortem: COIN long (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- COIN long closed stop_loss: entry $182.27 -> exit $179.19, P&L $-142.36 (8191.418181818181 USD, 10x).
- Entry time (UTC): 2026-02-26T16:37:15.013Z
- Hold window target: intraday
- Max loss budget: $122.87 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 44 minutes
- Adverse move: 1.688%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment *at entry* vs. *at exit*? Was this a contrarian setup (extreme sentiment) or consensus trade? Without the sentiment backdrop, I can't tell if the setup was sound but timing was off, or if you traded *into* a momentum reversal that CT was already pricing.

**What I'd need to give you real feedback:** X pulse at entry + exit timestamps, and whether whale accounts were already rotating out of this position before your stop hit.

Confidence: 0.2 (insufficient sentiment data to assess the trade thesis).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: entry timestamp, exit timestamp, and what Polymarket was pricing COIN at those two points—that's the regime signal I need to assess whether the stop was premature or correctly sized for realized vol. The $3 drawdown on 10x (1.6% move) suggests tight risk management, but without knowing if Poly had COIN conviction higher or lower at entry, I can't tell if you got shaken out of a directional edge or hit real invalidation. Pull the Poly odds snapshot at entry and exit, and I can give you a proper regime read on whether that stop placement was calibrated right.

**Confidence: 0.3**

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your conviction level on COIN (bull/bear/neutral for the week)? What's the invalidation that triggered the stop? 10x on a $8K position is aggressive sizing for a perp trade — was that intentional risk or did you scale in?

**On the trade itself:** $179.19 exit is clean (stop hit, no slippage), but the 1.7% loss on 10x means you risked ~17% of notional on that trade. If COIN was a "medium conviction" play, that's oversized; if it was "high conviction + thesis broke," the stop is correct but you may want to pre-size smaller (5x) on medium-confidence setups.

**Mechanic:** Paper bot executed the stop properly — no execution issue. The real question is: did the thesis break, or did you get shaken out by noise? If

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

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 79
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 79,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 44,
  "adverseMovePct": 1.688
}
```
