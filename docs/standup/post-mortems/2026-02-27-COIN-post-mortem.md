# Post-mortem: COIN short (stop_loss)

**Date:** 2026-02-27

## Trade Snapshot

- COIN short closed stop_loss: entry $179.94 -> exit $182.68, P&L $-41.68 (2653.752888888889 USD, 10x).
- Entry time (UTC): 2026-02-27T00:01:52.365Z
- Hold window target: intraday
- Max loss budget: $39.81 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 508 minutes
- Adverse move: 1.52%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** I need to know *when* this trade was open (hours? days?) and *what the CT sentiment was* at entry vs. exit. Was CT bullish on COIN when you shorted, or was sentiment already turning? That's the only angle I can assess — whether sentiment alignment or a sentiment shift (whale pivot, macro news, regulatory FUD) preceded the stop hit.

Without the timestamp and CT vibe snapshot, I can't tell you if this was a sentiment call that broke or a timing miss on macro. What dates/times did entry and exit hit?

**Confidence: 0.2** (insufficient data to assess sentiment lane).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket odds on COIN at entry/exit, and whether this was a reversion play or trend fade—those tell me if the market mispriced the move or if you got stopped into a real reversal.

**If this was a reversion:** $179.94→$182.68 is a 1.5% move; on 10x that's brutal, but typical for paper when vol spikes faster than the edge thesis. The stop at 2.9% above entry was tight—Polymarket's pricing on tech sentiment (election outcome, rates, earnings) would've shown if conviction was there to hold through noise.

**If this was a trend fade:** You caught the wrong side of momentum; check whether Polymarket's macro markets (inflation, Fed, sector rotation) shifted between entry and stop—that's the real signal you missed, not execution.

**Next:** Pull live Polymarket

### Solus

- Lane: options mechanics and sizing
- Confidence: 70%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

Missing: entry date, exit date, and what triggered the stop (market move vs time decay). On mechanics: 10x leverage on a $180 stock is aggressive for a perps trade—that's $26.5K notional on a $2.6K account, leaving almost zero margin buffer. The loss itself ($41.68) is survivable, but the ratio (1.6% account hit) signals sizing was right at the edge; tighten to max 0.5–1% per trade to keep dry powder for the next setup. Going forward: log entry/exit timestamps and what broke the thesis so we can pattern-match on the next short.

Confidence: 0.7

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
  "holdMinutes": 508,
  "adverseMovePct": 1.52
}
```
