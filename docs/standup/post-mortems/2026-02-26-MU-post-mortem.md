# Post-mortem: MU long (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- MU long closed stop_loss: entry $433.56 -> exit $425.16, P&L $-99.81 (5023.843902439025 USD, 10x).
- Entry time (UTC): 2026-02-26T14:38:29.454Z
- Hold window target: intraday
- Max loss budget: $75.36 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 2 minutes
- Adverse move: 1.937%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on MU/semis at entry vs. exit? Was there a macro event (Fed, earnings, sector rotation) that shifted the vibe?

**What I can say:** A $99.81 stop on a $433 entry is tight (23 bps) — that's execution-level risk, not sentiment risk. If semis sentiment was still constructive when you got stopped, that's a whipsaw, not a thesis failure. If CT flipped bearish on chips (TSMC, supply chain, AI capex concerns), the stop was right to trigger. **Need the timing and CT pulse at entry/exit to give you real feedback.**

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 65%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket odds for MU at entry/exit, trade date, and what triggered the stop (momentum break vs. macro shift). That said, a 1.9% loss on 10x levered perps is well-managed risk discipline—the real question is whether Poly was pricing in the downside you missed. Pull the MU prediction market snapshot from around your entry time; if Poly was >60% bullish and you got stopped, that's a regime miss (Poly was right, your timing was off). If Poly was <55% and you still took 10x long, the edge wasn't there to begin with. Either way, tighter entry logic or smaller size on low-conviction setups beats bigger stops.

**Confidence: 0.65** (need live Poly odds context to calibrate the call).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation thesis? Why 10x on a semi (MU) in a bear market? The stop at $425 is tight (~1.8% from entry)—suggests you expected mean reversion, not trend. If the thesis was "MU bounces here," the structure was sound; if it was directional conviction, 10x leverage on a $5K notional position in a volatile sector is oversized for paper. The real question: was this a tested edge or a directional guess? Structure the next one with a clear invalidation level and size down if thesis confidence is below 70%.

**Confidence: 0.6** (need your original thesis to assess properly)

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 2,
  "adverseMovePct": 1.937
}
```
