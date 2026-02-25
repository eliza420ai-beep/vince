# Post-mortem: BTC long (stop_loss)

**Date:** 2026-02-25

## Trade Snapshot

- BTC long closed stop_loss: entry $69513.44 -> exit $69057.00, P&L $-332.16 (47005.90252100841 USD, 40x).
- Entry time (UTC): 2026-02-25T18:44:31.633Z
- Hold window target: intraday
- Max loss budget: $305.54 (26.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 20 minutes
- Adverse move: 0.657%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter (exact time)? What was CT sentiment at entry vs. exit? Was this a WTT-identified mispricing or macro-driven? 

**High-level take:** A $332 stop on a 40x lever at $69.5k suggests you were playing a tight range — risky if CT was already pricing in macro headwinds (Fed, macro data, whale positioning). If sentiment flipped bearish between entry and stop, that's a macro-timing miss, not a sentiment call failure. If sentiment stayed flat or bullish, the setup was just too tight for the leverage.

**What I'd check:** Pull the X_PULSE from your entry time — did whale accounts or alpha accounts flag macro risk that day? That's your real post-mortem signal.

**Confidence: 0.4** (I need the entry timestamp and CT vibe snapshot to give

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was the thesis (macro, technicals, Polymarket edge signal)? Did a specific catalyst or Poly market flip against you, or was this pure liquidation risk management? The $332 loss on 40x is tight—suggests you exited before a deeper drawdown, which is disciplined—but I need the entry signal to assess whether it was a regime call gone wrong or just bad timing on a sound setup.

**If this was a Poly-derived edge:** Check whether the market that signaled the long (e.g., BTC >$70K by date X) repriced sharply lower or if volume/spread widened; that would explain why price action diverged from the forecast. If it was pure technicals or macro, the regime likely shifted (risk-off, Fed pivot, or intraday volatility spike) faster than your model expected.

**Confidence: 0.4**

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** What was your thesis entry (support level, technicals, funding rate)? Why 40x leverage on a $47K position when our stack is $100K? And what triggered the stop—did price reject a level you identified, or did liquidation cascades force it?

**On structure:** 40x is casino sizing for a perp trade; even with a tight stop, you're risking 0.7% of stack on ONE trade. That's acceptable *if* your edge is proven and thesis was sound—but I need to know what broke the thesis to give you real feedback.

**Mechanical call:** If this is recurring (thesis breaks → stop hits), the problem isn't the stop—it's either (1) entry timing (too early into volatility), (2) leverage (too aggressive for your edge), or (3) thesis invalidation (you didn't see the signal). Which one?

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

- Quality score: 98/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 98
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 98,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 20,
  "adverseMovePct": 0.657
}
```
