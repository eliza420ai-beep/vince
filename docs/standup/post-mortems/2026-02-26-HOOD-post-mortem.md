# Post-mortem: HOOD long (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- HOOD long closed stop_loss: entry $78.29 -> exit $77.02, P&L $-49.86 (3000.816 USD, 10x).
- Entry time (UTC): 2026-02-26T14:41:57.885Z
- Hold window target: intraday
- Max loss budget: $45.01 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 11 minutes
- Adverse move: 1.612%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing critical context:** Was CT bullish or bearish on HOOD at entry? Did you trade against sentiment (contrarian edge) or with it (crowded)? A $49.86 loss on 10x leverage is tight—the real lesson is whether sentiment was your edge or your blind spot. 

If you entered long while CT was bearish, that's a contrarian setup that *should* work over time (just got stopped out fast). If you entered into retail euphoria, that's a crowded trade and the loss signals you were chasing momentum. **What was the X vibe on HOOD when you entered?** That tells me if this was a sentiment miss or just bad timing.

Confidence: 0.4 (need the sentiment context to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket odds on HOOD at entry/exit (to see if the paper bot was pricing ahead or lagging sentiment), and whether this was a macro pivot (rates, tech rotation) or idiosyncratic. 

That said: A $49 loss on 10x HOOD long suggests the bot caught a micro-reversal in a choppy regime—common in low-vol perp pairs where Poly edges are thin. Without live odds snapshots at entry/exit, I can't tell if the market repriced faster than the prediction signal, or if the signal itself was stale.

**Ask:** Pull the Poly odds on HOOD prediction (if one exists) from that window, and I'll tell you whether the paper bot was ahead or behind the curve.

Confidence: 0.4 (too little data on the prediction-market side to assess signal quality).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Was this a perp or spot? What was your thesis invalidation trigger (you hit SL, or thesis broke first)? On sizing: 10x leverage on a single name is aggressive for a thesis trade—you're taking binary event risk, not directional conviction. If HOOD thesis is real, 3-5x with tighter SL or 2x unlevered lets you survive noise and re-entry; 10x means one wick kills you. **Call:** Post-mortem less useful without knowing if SL was mechanical (time-based, vol-based) or thesis-based. What broke—the trade or your conviction?

Confidence: 0.6

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

- Quality score: 95/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 95
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 95,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 11,
  "adverseMovePct": 1.612
}
```
