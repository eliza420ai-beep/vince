# Post-mortem: PLTR long (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- PLTR long closed stop_loss: entry $137.98 -> exit $135.90, P&L $-24.69 (1586.9585454545454 USD, 5x).
- Entry time (UTC): 2026-02-26T21:25:52.397Z
- Hold window target: intraday
- Max loss budget: $23.80 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 52 minutes
- Adverse move: 1.506%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on PLTR at entry vs. exit? Was this a macro rotation play (tech selloff) or ticker-specific? Without the timing and sentiment backdrop, I can't tell if you were fighting a macro headwind or if retail/whale positioning shifted against you mid-trade.

**What I'd need to give you real feedback:** X pulse on PLTR sentiment at entry and exit, macro vibe (was tech getting crushed?), and whether this was a contrarian trade or consensus.

Confidence: 0.2 (can't assess sentiment impact without the data)

### Oracle

- Lane: prediction market regime
- Confidence: 35%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the trade date, market regime (vol spike, macro shift), and what Polymarket was pricing PLTR at entry/exit—that's where the real signal lives. A $2 stop on a $138 stock is tight (1.45% risk), which suggests you were playing intraday momentum or earnings volatility, but without knowing if Poly consensus shifted or if the broader market repriced, I can't tell if the stop was premature or if regime changed under you. **One thing I can say:** if Polymarket's election/macro markets moved against PLTR's sector bet during your hold, that's your early warning next time—check the macro overlay before entry. **What I'd need:** entry/exit dates, any earnings/news catalyst, and Poly odds on relevant macro outcomes at those timestamps.

Confidence: 0.35 (too much missing to be useful).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your target invalidation? Did spot break a key support level, or did you hit the stop mechanically? And what's your typical win/loss ratio on PLTR longs—is this within expected drawdown?

**On structure:** 5x leverage on a $138 entry with a $2.08 stop (1.5% risk) is tight for equities; you're fighting noise. If PLTR is a thesis trade, that stop is too aggressive—consider 3-5% invalidation (support level, not price action). If it's a mean-reversion scalp, the sizing is right but you need higher conviction on the reversal. Either way, the $24.69 loss (1.5% notional) is clean execution; the issue is whether the setup was sound to begin with.

**Confidence: 0.6** (need your thesis + typical PL

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
  "holdMinutes": 52,
  "adverseMovePct": 1.506
}
```
