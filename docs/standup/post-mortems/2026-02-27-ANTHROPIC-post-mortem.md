# Post-mortem: ANTHROPIC short (stop_loss)

**Date:** 2026-02-27

## Trade Snapshot

- ANTHROPIC short closed stop_loss: entry $509.84 -> exit $519.77, P&L $-15.71 (786.0906666666665 USD, 3x).
- Entry time (UTC): 2026-02-26T23:32:34.310Z
- Hold window target: intraday
- Max loss budget: $11.79 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 551 minutes
- Adverse move: 1.948%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on ANTHROPIC at entry vs. exit? Was there a macro event (Fed, BTC dump, AI news)? Without the sentiment backdrop and timing, I can't tell if you were fighting CT headwinds or if the trade was just unlucky execution.

**What I'd need to give you real feedback:** X pulse on ANTHROPIC sentiment at entry and exit, plus macro vibe (was crypto broadly selling?). Then I can tell you if the loss was a sentiment mismatch or just a tight stop.

Confidence: 0.3 (can't assess sentiment lane without the data).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing critical context:** I need the trade date/time, the Polymarket odds for ANTHROPIC at entry and exit, and whether this was a reaction to model output or news. That said, the $10 move on a $509 entry (2%) with 3x leverage is a standard stop—the real question is whether Poly was pricing a higher tail risk that your model missed. If ANTHROPIC prediction markets showed >60% for a specific outcome (earnings miss, regulatory news, etc.) and your entry assumed lower probability, that's regime drift worth flagging for the paper bot calibration.

**What I'd need to give you edge feedback:** Pull the Polymarket ANTHROPIC markets active around your entry time—if they were pricing >70% on a downside event and your model was neutral, that's a signal mismatch to bake into future entries. Otherwise, it's just leverage + volatility.

**

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage (3x noted, but was this on perps or spot?), position duration, and what triggered the stop. On the mechanics: $786 loss on a $509 short with 3x means you sized ~1.5 BTC notional—reasonable for a paper trade, but the 1.9% move against you (509→520) suggests either tight stops or a momentum setup that didn't hold. For perps, that's a solid stop discipline; for options, we'd be looking at theta/IV instead. **Recommendation:** Post the setup (timeframe, why you shorted, what broke) so I can assess if this was a structure miss or just unlucky entry timing.

**Confidence: 0.4** (not enough data on context or product type).

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 551,
  "adverseMovePct": 1.948
}
```
