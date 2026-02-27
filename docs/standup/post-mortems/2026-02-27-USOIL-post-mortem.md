# Post-mortem: USOIL short (stop_loss)

**Date:** 2026-02-27

## Trade Snapshot

- USOIL short closed stop_loss: entry $79.41 -> exit $80.73, P&L $-45.30 (2653.752888888889 USD, 10x).
- Entry time (UTC): 2026-02-27T00:01:43.436Z
- Hold window target: intraday
- Max loss budget: $39.81 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 595 minutes
- Adverse move: 1.657%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing critical context:** What was CT sentiment on USOIL/energy macro when you entered vs. exited? Was there a macro shift (Fed pivot, geopolitical event, supply shock) that CT caught before price moved? Without the sentiment timeline, I can't tell if you missed a CT signal or if this was just bad timing on a contrarian setup.

**What I need:** Entry/exit timestamps, and I'll run X_PULSE to see if energy/macro sentiment shifted during your hold. That'll tell us if CT saw the move coming.

Confidence: 0.3 (can't assess sentiment miss without the data).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: **entry timestamp, hold duration, and whether a Polymarket crude/energy market was live at entry/exit** — that'd show if the paper bot was pricing ahead of spot or lagging consensus. The $1.32 move against you on 10x is brutal but not unusual for USOIL intraday; **if this was <1hr hold, the stop was tight relative to typical volatility**—a regime call (mean reversion vs. trend) would tell you if the entry thesis broke or just got shaken out. Without the Polymarket angle (geopolitical event probability, supply shock odds), I can't say if the market repriced risk mid-trade or if it was pure technicals. **Next time: log the market condition at entry (trending, mean-reverting, vol regime) and any live Poly odds for the underlying macro event—that'll separate bad timing from bad thesis.**

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Was this a perp on Hyperliquid or paper bot sim? What was the intended thesis (bear oil, macro headwind, reversion)? And crucially—what was your invalidation level, and did price action *break* it or just hit your stop?

**On mechanics:** 10x on a commodity (USOIL) is aggressive sizing for a directional short; oil's intraday range can easily swallow 1-2% without invalidating thesis. If your stop was tight (1.3% from entry), you likely got shaken out of a valid setup. Next time: widen stops to your *actual* invalidation level, not a fixed % or dollar amount.

**Confidence: 0.6** (need trade context and thesis to score structure properly).

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 595,
  "adverseMovePct": 1.657
}
```
