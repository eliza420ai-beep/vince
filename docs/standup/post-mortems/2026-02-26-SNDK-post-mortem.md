# Post-mortem: SNDK long (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- SNDK long closed stop_loss: entry $670.54 -> exit $660.25, P&L $-85.46 (5391.176470588235 USD, 5x).
- Entry time (UTC): 2026-02-26T09:51:13.107Z
- Hold window target: intraday
- Max loss budget: $80.87 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 48 minutes
- Adverse move: 1.535%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on SNDK at entry vs. exit? Was there a macro event or earnings catalyst that shifted the vibe? Without the timing and sentiment backdrop, I can't tell you if this was a "trade the sentiment wrong" miss or a legitimate stop-hit. 

**What I need to give you real feedback:** Run me an X_PULSE on SNDK for the entry window, and let me know if macro (Fed, yields, tech sector) shifted hard during your hold. Then I can tell you if CT saw this coming or if it was just bad luck on a solid thesis.

**Confidence: 0.3** (can't assess without sentiment data + timing)

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing critical context:** I need the trade date, the Polymarket odds on SNDK at entry/exit, and what macro regime you thought you were in (tech rally, rate shock, earnings cycle). Without those, I can't tell if you got stopped on noise or if the market repriced the fundamental. **What I can say:** A $10 stop on a $670 entry is tight (1.5%)—fine for scalping vol crush, brutal if you were positioning on a thesis. If Polymarket had SNDK directional odds and they didn't move, you likely got shaken out of a good trade; if they collapsed with you, the market killed the thesis. **Ask:** What were the Poly odds when you entered and exited? That tells us whether this was slippage or signal.

Confidence: 0.3

### Solus

- Lane: options mechanics and sizing
- Confidence: 70%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your thesis invalidation trigger? Was the stop at support or arbitrary? On 5x leverage with a $670.54 entry and $660.25 exit, you're risking ~1.5% notional for what potential upside—2-3%? That's a poor risk/reward before slippage and funding ate you. **Mechanic call:** If SNDK is a core thesis, 5x leverage on a thin margin of safety is sizing wrong—either reduce leverage to 2-3x or widen your invalidation zone so you're not stopped on noise. The trade structure (entry, stop, target) matters more than the outcome; this one looks reactive, not architected.

**Confidence: 0.7** (I don't have your original thesis or target, so I'm inferring from the numbers).

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 48,
  "adverseMovePct": 1.535
}
```
