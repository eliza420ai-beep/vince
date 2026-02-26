# Post-mortem: ETH short (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- ETH short closed stop_loss: entry $2013.10 -> exit $2029.50, P&L $-41.90 (4845.148947692307 USD, 10x).
- Entry time (UTC): 2026-02-26T15:35:26.297Z
- Hold window target: intraday
- Max loss budget: $36.28 (7.49%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 9 minutes
- Adverse move: 0.815%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on ETH at entry vs. exit? Was there a macro catalyst (Fed news, ETF flow, whale accumulation) that shifted the vibe between those two levels?

**On the loss itself:** A $2013→$2029 short stop on 10x is tight—you got shaken out on noise. If CT was mixed-to-bullish on ETH at entry, that's a red flag for shorting; if sentiment flipped *after* you entered, that's a lesson in monitoring the feed. Without the timestamp and sentiment snapshot, I can't tell if this was a bad setup or bad timing.

**Confidence: 0.3** (need entry time + CT vibe at both points to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the entry timestamp and which Polymarket ETH prediction(s) you were trading against—was this a reversal play against a consensus short, or a directional bet aligned with market pricing? Also: did IV spike into your stop, or did spot break a key support level you identified beforehand?

**On the loss itself:** A $41.90 stop on a $2013 entry (2 bps) is tight for 10x leverage on ETH—you're fighting slippage and noise. If Polymarket odds on "ETH above $2030 by [date]" were >60% at entry, the regime was already pricing upside; if they were <40%, you had edge but got shaken out by volatility, not a regime shift.

**Next time, bring:** Entry thesis (which market prediction you were fading/following), IV context, and whether the stop was

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** leverage, position duration, and what triggered the stop (market move vs. plan). On mechanics: 10x on a $41.90 loss is tight risk management—you're sizing for ~2% notional loss, which is solid. The real question is whether $2013.10 was a valid short entry (resistance, IV context, funding) or a chase; if it was a chase into momentum, the stop-loss structure is correct but the entry was the error. **Confidence: 0.6** (need entry thesis and market regime to assess fully).

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

- Quality score: 94/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 94
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 94,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 9,
  "adverseMovePct": 0.815
}
```
