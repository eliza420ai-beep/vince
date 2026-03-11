# Post-mortem: ANTHROPIC short (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- ANTHROPIC short closed stop_loss: entry $503.62 -> exit $511.47, P&L $-15.20 (944.9860553359684 USD, 3x).
- Entry time (UTC): 2026-02-26T16:32:44.091Z
- Hold window target: intraday
- Max loss budget: $14.17 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 293 minutes
- Adverse move: 1.559%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context:** Did CT have a bearish or bullish lean on ANTHROPIC at entry/exit? Was there a macro headwind (rates, tech rotation, AI sentiment shift) that contradicted the trade thesis? Without X sentiment data around those timestamps, I can't tell you if you fought the crowd or ignored a red flag.

**What I'd need:** Entry/exit timestamps + the original trade thesis. Then I can cross-check against CT vibe, whale positioning, and any macro shifts that might've telegraphed the move.

Confidence: 0.3 (can't assess sentiment impact without the data).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the trade date, Polymarket ANTHROPIC prediction at entry/exit, and whether this was a macro regime shift (e.g., AI sentiment flip) or local volatility. A $8 move on a $500 entry with 3x is tight—if Poly odds stayed flat, the stop was aggressive; if Poly repriced sharply higher, the regime turned and the stop was right. Without the market's own pricing signal, I can't tell if this was bad execution or correct risk management in a genuine reversal.

**Confidence: 0.3** (need Poly odds snapshot + date to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** underlying timeframe (perp or spot?), liquidation distance at 3x, funding rate at entry, and whether this was a hedge against a long position elsewhere in the stack. On mechanics alone: 3x leverage on a $944 notional is tight—$315 collateral backing it leaves almost no room for noise on a micro-cap like ANTHROPIC. If this was a directional short without hedge rationale, the sizing was aggressive for the risk/reward; if it was a hedge, the loss is acceptable cost of insurance. **Next time:** state the hedge thesis upfront so we can right-size leverage to portfolio beta, not raw notional. **Confidence: 0.6** (need timeframe and liquidation data to assess if stop was placed correctly).

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
  "holdMinutes": 293,
  "adverseMovePct": 1.559
}
```
