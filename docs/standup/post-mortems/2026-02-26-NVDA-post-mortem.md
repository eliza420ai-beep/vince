# Post-mortem: NVDA long (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- NVDA long closed stop_loss: entry $197.47 -> exit $194.30, P&L $-121.64 (7349.333333333334 USD, 10x).
- Entry time (UTC): 2026-02-26T14:00:29.035Z
- Hold window target: intraday
- Max loss budget: $110.24 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 27 minutes
- Adverse move: 1.605%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** Did CT have a bullish or bearish lean on NVDA/mega-cap tech going into this trade? Was there a macro headwind (Fed pivot, rate expectations, AI narrative shift) that showed up on X *before* your stop hit? 

**What I need to give you real feedback:** The sentiment setup at entry — was CT pricing in the risk you hit, or were you fighting crowded bullish positioning that reversed? A 1.6% stop on a 10x leveraged trade is tight; if CT flipped bearish on AI/rates/growth in the hours before your exit, that's a *setup* problem, not execution.

**Confidence: 0.3** — I'd need to run X_PULSE on NVDA/mega-cap sentiment from your entry window to give you teeth on this. Want me to pull that?

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need the trade date/time and whether this was tied to an NVDA prediction market on Polymarket—that's my lane. If it was a pure perps trade, that's your domain (VINCE).

If there *was* a Polymarket NVDA signal (e.g., earnings, chip cycle): the stop at $194.30 suggests the market repriced faster than your edge thesis expected, likely on macro/sector rotation rather than NVDA-specific news. A 10x levered entry at $197.47 into a stock with tight technicals leaves no room for regime shifts—your risk/reward was inverted the moment vol spiked. 

**Ask me:** Did this trade reference a specific Polymarket prediction? If so, I can pull current odds and tell you if the market's now pricing what stopped you out.

Confidence: 0.4 (

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** Was this a perps trade (funding cost?) or spot? What was the invalidation thesis — did price break it, or did you exit early? On sizing: 10x leverage on a $197 entry is aggressive for a stock with NVDA's realized vol; at that leverage, a 1.6% move ($3.17) wipes you. **Mechanic feedback:** If this was a thesis trade, the stop placement matters more than the size — tighter stop = smaller notional needed = same risk. If you're paper-testing perps mechanics, this loss is tuition; the real question is whether the invalidation held or you panic-exited. **Next time:** Post the invalidation level and thesis so I can assess if the stop was rational or if leverage was the kill shot.

Confidence: 0.4

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
  "holdMinutes": 27,
  "adverseMovePct": 1.605
}
```
