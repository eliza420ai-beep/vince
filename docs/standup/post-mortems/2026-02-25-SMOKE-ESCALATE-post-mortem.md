# Post-mortem: NVDA short (stop_loss)

**Date:** 2026-02-25

## Trade Snapshot

- NVDA short closed stop_loss: entry $190.56 -> exit $193.65, P&L $-112.26 (6720 USD, 10x).
- Entry time (UTC): 2026-02-25T11:28:09.359Z
- Hold window target: intraday
- Max loss budget: $108.97 (16.22%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 72.7%
- Hold duration: 22 minutes
- Adverse move: 1.622%
- Sentiment snapshot: unavailable
- Regime snapshot: unavailable
- Missing data: sentimentScore, regime, entryATRPct

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

I need timestamp/date-time and ticker context to evaluate this loss. Confidence: 0.20

### Oracle

- Lane: prediction market regime
- Confidence: 18%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id, market_name

Need condition_id and market name to check what was priced. Confidence: 0.18

### Solus

- Lane: options mechanics and sizing
- Confidence: 22%
- Source stamp: options_mechanics_snapshot
- Missing data flags: lane_coverage_gap

This is outside my lane without proper context and sizing inputs. Confidence: 0.22

## Root-Cause Tags

- Primary: missing_pretrade_data
- Secondary: sizing_too_aggressive, agent_lane_mismatch

## Corrective Actions

1. [immediate] owner=vince due=next_trade
   - action: Require PTQG completion and explicit max-loss check before next entry.
   - success_metric: Next trade includes complete PTQG fields and no missing_data flags.
   - rollback: If signal quality drops for 10+ trades, review cap thresholds.
2. [policy] owner=sentinel due=72h
   - action: Enforce post-mortem schema validation; reject outputs missing evidence fields.
   - success_metric: Post-mortems with pmevCompletenessPct >= 90% over rolling 7 days.
   - rollback: If operational overhead causes missed trades, reduce required manual fields.
3. [experiment] owner=solus due=7d
   - action: A/B test defined-risk structure recommendation vs spot leverage entries.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 34/100
- Escalate to Sentinel: true
- Score breakdown: completeness=18, evidence=15, diagnosis=20, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Escalate this loss to Sentinel weekly governance review.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 34
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: missing_pretrade_data
- PM_SECONDARY_CAUSES: sizing_too_aggressive,agent_lane_mismatch
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 72.7
- PM_MISSING_DATA_COUNT: 3

```json
{
  "qualityScore": 34,
  "qualityEscalate": true,
  "primaryCause": "missing_pretrade_data",
  "secondaryCauses": [
    "sizing_too_aggressive",
    "agent_lane_mismatch"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 72.7,
  "missingData": [
    "sentimentScore",
    "regime",
    "entryATRPct"
  ],
  "holdMinutes": 22,
  "adverseMovePct": 1.622
}
```
