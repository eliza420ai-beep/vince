# Post-mortem: ETH short (stop_loss)

**Date:** 2026-02-25

## Trade Snapshot

- ETH short closed stop_loss: entry $1981.80 -> exit $1999.70, P&L $-34.13 (3581.364705882353 USD, 10x).
- Entry time (UTC): 2026-02-25T14:47:12.383Z
- Hold window target: intraday
- Max loss budget: $25.63 (7.16%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 40 minutes
- Adverse move: 0.903%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter (timestamp)? What was CT sentiment *at entry* vs. *at exit*? Was this a contrarian fade or consensus short? Did macro shift (Fed news, BTC move, etc.) between entry/close?

**Sentiment angle:** If you shorted into bullish CT consensus without a macro catalyst, that's fighting momentum — historically a loser. If you entered on extreme bullish euphoria and exited on a pullback, the thesis was sound but sizing/stop placement matters (not my lane). 

**One concrete ask:** Run me an X_PULSE for the 4h window around your entry — I'll flag if CT sentiment was actually supporting the short or if you were solo.

Confidence: 0.4 (need timestamps + macro context to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing critical context:** Polymarket's ETH price prediction for your timeframe (daily/weekly), open interest, and the broader macro regime (risk-on/off) at entry/exit. That said, a $1,981–$1,999 move (0.9%) stopped you out on 10x—tight risk management, but suggests either (1) you were fighting short-term momentum that Poly had priced as bullish, or (2) your entry didn't align with the market's consensus probability at that moment. Pull the live ETH price odds from a relevant Poly market (e.g., "ETH above $2000 by Friday") and compare to your thesis; if Poly had >65% on the upside, the regime was against you from the jump. Confidence: 0.4 (need Polymarket snapshot at your entry time to validate).

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context blocks the call:** leverage (10x noted), position duration, invalidation level at entry, and why that strike/size. On mechanics alone: $3,581 loss on a $1,981 entry (10x) means you sized for ~1.8% move before stop—tight for ETH's typical daily range. If this was a 4h/daily trade, that's undersized risk buffer; if intraday scalp, it's reasonable. **The real question:** was the invalidation hit (market broke your thesis) or did you get shaken out early? Post the entry thesis + invalidation + hold duration, and I'll give you the structure feedback.

**Confidence: 0.3** (insufficient data on thesis/duration/invalidation).

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

- Quality score: 88/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 88
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 88,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 40,
  "adverseMovePct": 0.903
}
```
