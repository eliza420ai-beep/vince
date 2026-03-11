# Post-mortem: CRCL short (stop_loss)

**Date:** 2026-02-27

## Trade Snapshot

- CRCL short closed stop_loss: entry $83.04 -> exit $84.34, P&L $-78.21 (4864.853966564923 USD, 10x).
- Entry time (UTC): 2026-02-27T15:19:08.312Z
- Hold window target: intraday
- Max loss budget: $72.97 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 6 minutes
- Adverse move: 1.558%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** I need to know *when* you entered (date/time) and what CT sentiment was at that moment vs. now—was CRCL getting hyped into your entry, or was it already cooling? Also: did you size this based on a contrarian setup (extreme bullish CT = short signal) or a fundamental bearish thesis? 

Without the sentiment backdrop at entry, I can't tell if you fought the crowd or missed a macro shift. That's the edge I'd flag.

**Confidence: 0.3** — can't give you real feedback without knowing the sentiment context around your entry.

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing context:** What's the Polymarket odds on CRCL's next move, and what was your thesis—mean reversion, macro headwind, or technical breakdown? Without the prediction-market read on where smart money priced it, I can't tell if this was a regime miss (market repriced risk) or execution (stopped too tight on noise). The 1.56% slippage on a 10x short into illiquidity is real, but the real question is whether the market's pricing now reflects your original edge or if consensus shifted. If you have the market condition_id or can paste the Poly odds at entry/exit, I can pull the regime picture.

**Confidence: 0.3** (need market data to calibrate).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** direction thesis (why short?), hold duration, and whether this was part of a larger hedge or standalone. On mechanics alone: 10x leverage on a $4,864 notional position is aggressive for a $100K stack—that's 4.8% of capital risked on a single micro-cap equity short. The 1.3-point stop ($78 loss) is tight; CRCL's typical daily range probably exceeded that, so you either got shaken or the thesis broke fast. For paper trades, tighten leverage (2-3x max) and widen stops to separate noise from invalidation.

**Confidence: 0.6** (structure feedback solid; thesis assessment blocked without your original case).

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 6,
  "adverseMovePct": 1.558
}
```
