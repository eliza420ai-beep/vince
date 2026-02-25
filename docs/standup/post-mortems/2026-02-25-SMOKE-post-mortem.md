# Post-mortem: BTC short (stop_loss)

**Date:** 2026-02-25

## Trade Snapshot

- BTC short closed stop_loss: entry $64000.00 -> exit $63741.00, P&L $-45.23 (3360 USD, 3x).
- Entry time (UTC): 2026-02-25T10:53:36.075Z
- Hold window target: intraday
- Max loss budget: $45.23 (4.04%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 55 minutes
- Adverse move: 0.405%
- Sentiment snapshot: sentiment_score:6
- Regime snapshot: regime:risk-on
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 78%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

CT was cautiously bullish, this short was contrarian. Confidence: 0.78

### Oracle

- Lane: prediction market regime
- Confidence: 72%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

Regime was risk-on and not ideal for this short. Confidence: 0.72

### Solus

- Lane: options mechanics and sizing
- Confidence: 69%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

Mechanics were fine; mostly directional miss. Confidence: 0.69

## Root-Cause Tags

- Primary: stop_too_tight_for_vol
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

- Quality score: 95/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 95
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: stop_too_tight_for_vol
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 95,
  "qualityEscalate": false,
  "primaryCause": "stop_too_tight_for_vol",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 55,
  "adverseMovePct": 0.405
}
```
