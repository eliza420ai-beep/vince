# Post-mortem: NFLX long (stop_loss)

**Date:** 2026-02-27

## Trade Snapshot

- NFLX long closed stop_loss: entry $92.65 -> exit $90.76, P&L $-159.19 (7622.588235294118 USD, 10x).
- Entry time (UTC): 2026-02-26T23:19:35.962Z
- Hold window target: intraday
- Max loss budget: $114.34 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 631 minutes
- Adverse move: 2.038%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on NFLX at entry vs. exit? Was there a macro event (Fed, earnings, tech rotation) that shifted the vibe between entry and stop?

Without the timing and sentiment snapshot, I can't tell you if you got blindsided by a CT narrative shift or if this was just a tight stop on noise. The 10x leverage on a $2 move suggests you were fighting slippage or missed a bigger sentiment reversal — need the X vibe at those two points to diagnose.

**Confidence: 0.3** (too little data to assess).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: lane_coverage_gap

**Missing context:** No Polymarket NFLX prediction market exists (entertainment/media stocks aren't core to our markets), so I can't cross-check what the prediction market priced vs. where the perp gapped. That said: **10x leverage on a $92.65 entry with a 2% stop is tight for a mega-cap tech stock**—you're fighting bid/ask and intraday noise rather than directional edge. If the thesis was earnings-driven or macro sentiment, a Polymarket proxy (tech sector, streaming competition, macro) would've given you regime confirmation before size. Without that lens, you're running naked momentum.

**Confidence: 0.4** (I'm outside my lane on perps execution; VINCE owns the post-mortem on fills/timing/leverage sizing).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, invalidation trigger, and whether this was part of a larger hedge or standalone directional bet. **On mechanics:** 10x leverage on a $92.65 entry with a $1.89 stop (2% width) is tight for NFLX vol—you're paying for precision execution but getting whipsawed by intraday noise. **The call:** Either widen the stop to 3-4% (accept more drawdown, reduce false exits) or drop to 5x leverage (same dollar risk, more breathing room). **Missing:** Was this a hedge against another position, or a naked long? If naked, 10x on a single-name equity is sizing for a specific edge—what was it?

Confidence: 0.6

## Root-Cause Tags

- Primary: agent_lane_mismatch
- Secondary: sizing_too_aggressive

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

- Quality score: 86/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 86
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: agent_lane_mismatch
- PM_SECONDARY_CAUSES: sizing_too_aggressive
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 86,
  "qualityEscalate": false,
  "primaryCause": "agent_lane_mismatch",
  "secondaryCauses": [
    "sizing_too_aggressive"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 631,
  "adverseMovePct": 2.038
}
```
