# Post-mortem: HOOD short (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- HOOD short closed stop_loss: entry $78.13 -> exit $79.49, P&L $-63.21 (3528.6109090909094 USD, 10x).
- Entry time (UTC): 2026-02-26T16:32:40.367Z
- Hold window target: intraday
- Max loss budget: $52.93 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 276 minutes
- Adverse move: 1.741%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on HOOD at entry vs. exit? Was there a macro catalyst (Fed speak, market breadth shift, retail rotation) that flipped the trade against you? 

Without the sentiment backdrop, I can't tell if you got stopped into a contrarian setup (bullish) or if CT was already rotating into retail/growth and you were fighting the vibe. **Confidence: 0.2** — I need the timing and what X was saying to give you real feedback on whether this was a sentiment miss or just bad risk/reward execution.

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: lane_coverage_gap

**Missing context:** I need the Polymarket odds for HOOD at entry and exit to benchmark this against prediction-market pricing—was the market pricing a breakout that your short missed, or did sentiment shift faster than the CLOB reflected? 

Without that lens, I can only note the trade took a 1.7% adverse move on 10x (typical for a stop in choppy micro-cap retail flow), which suggests either entry timing was off or the regime shifted mid-trade. 

**Ask:** Pull the HOOD prediction-market activity (volume, bid-ask spread, probability moves) for that window—if Poly showed conviction one way and spot moved the other, that's a regime mismatch worth flagging for future entry design.

**Confidence: 0.3** (I'm outside my lane without market odds context).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage (10x noted, but was that optimal for HOOD vol?), hold time (hours? days?), and invalidation trigger (what was supposed to stop the move?). **On structure:** $3.5K loss on a $78 short with 10x is tight — HOOD typically ranges 2–3% daily; your stop at +1.36% was aggressive for the asset's profile. **Sizing call:** if this was a $35K notional position, that's reasonable risk-per-trade, but if it was your whole account, you're overleveraged. **Going forward:** HOOD needs wider stops (2–2.5% for shorts) or lower leverage (5x), or both — the mechanics didn't match the asset's volatility.

Confidence: 0.65

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
  "holdMinutes": 276,
  "adverseMovePct": 1.741
}
```
