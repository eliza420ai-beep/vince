# Post-mortem: BTC long (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- BTC long closed stop_loss: entry $68209.64 -> exit $67283.00, P&L $-54.30 (3855.211860353898 USD, 3x).
- Entry time (UTC): 2026-02-26T12:17:02.084Z
- Hold window target: intraday
- Max loss budget: $42.61 (3.32%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 151 minutes
- Adverse move: 1.359%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter (exact time/date)? What was CT sentiment at entry vs. exit? Were there macro events (Fed, macro data, geopolitical) between entry and stop? And crucially — what was your thesis: contrarian long into fear, or momentum continuation?

Without the timestamp and CT vibe at those two points, I can't tell you whether you got whipsawed by noise or if sentiment actually shifted against your thesis. That's the only feedback that matters from my lane.

**Confidence: 0.3** (need the data to give you real intel)

### Oracle

- Lane: prediction market regime
- Confidence: 62%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket BTC price at entry/exit, election/macro event timing, and whether this was a paper-bot signal or discretionary. That said, a $3.8K loss on a 3x long in a $926 range suggests the bot got whipsawed on intraday volatility—typical when macro uncertainty (Fed, geopolitical) keeps spot choppy but doesn't establish a clear directional bias. If Polymarket odds on BTC >$70K by a specific date were <40% at entry, the trade was fighting consensus; if they were >60%, the stop was too tight for the regime. The post-mortem hinges on whether this was signal-timing (bot early) or sizing (3x too aggressive for vol).

**Confidence: 0.62** (need Polymarket snapshot + bot signal source to isolate regime vs execution).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage ratio (3x on what notional?), holding period, and whether this was a directional bet or hedge against an options position. **On mechanics:** $3.8K loss on 3x leverage is reasonable slippage for a stop, but the entry ($68.2K) was already near resistance—tighter stop or smaller size would've capped damage. **Call:** If this was a hedge against short puts or calls, the loss offsets premium collected; if pure directional, the sizing was too aggressive for a $100K stack (should be <1% risk per trade). **Next:** Post your options positions (puts/calls live?) and I'll assess whether this stop made sense structurally.

Confidence: 0.6

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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 151,
  "adverseMovePct": 1.359
}
```
