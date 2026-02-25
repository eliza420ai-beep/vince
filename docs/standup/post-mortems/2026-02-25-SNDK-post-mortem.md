# Post-mortem: SNDK short (stop_loss)

**Date:** 2026-02-25

## Trade Snapshot

- SNDK short closed stop_loss: entry $642.81 -> exit $657.71, P&L $-45.97 (1941.3333333333333 USD, 5x).
- Entry time (UTC): 2026-02-25T12:30:21.006Z
- Hold window target: intraday
- Max loss budget: $29.12 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 137 minutes
- Adverse move: 2.318%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** What was CT saying about SNDK at entry vs. exit? Was sentiment aligned with your short thesis, or did you miss a bullish macro shift on X? Without the sentiment backdrop — whale accumulation, retail FOMO, macro tailwinds — I can't tell if the setup was sound and sentiment just shifted, or if you entered against the grain. Check the X vibe around SNDK/semiconductors at your entry time; that'll tell you if this was a sentiment miss or a trade execution miss.

**Confidence: 0.3** (need X data to give real feedback)

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, lane_coverage_gap

**Missing key context:** I need the trade window (when opened/closed), the Polymarket prediction for SNDK at entry and exit, and whether this was a macro hedge or standalone directional bet. That said: a 2.3% move against you on a 5x levered short suggests either a regime shift in semiconductors (bullish catalyst, earnings beat, sector rotation) or liquidity-driven spike through your stop. Without seeing what prediction markets priced SNDK at those timestamps, I can't tell if the market repriced fundamentals or you caught a whipsaw. **Next time:** Cross-check Polymarket SNDK sentiment and IV before entry—if prediction markets are pricing upside, a short on 5x is fighting consensus and tighter stops are warranted.

**Confidence: 0.4** (I'm outside my lane without Polymarket context and VINCE's execution notes; this is

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation (the price/signal that would flip your thesis)? Did $657.71 hit that, or did you stop out early? On sizing: 5x leverage on a $642 stock is aggressive—you're risking ~$2K to make ~$2K, which is breakeven math before fees. For paper trades proving edge, tighter stops (1-2% invalidation) and lower leverage (2-3x) give you more shots before blowing up the account. If SNDK broke a key support and you exited at invalidation, that's clean execution; if you got shaken out by noise, structure the next one with wider stops and lower size so you don't panic-close winners.

**Confidence: 0.65** (missing invalidation context and whether this was thesis-driven or noise-driven).

## Root-Cause Tags

- Primary: agent_lane_mismatch
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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: agent_lane_mismatch
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "agent_lane_mismatch",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 137,
  "adverseMovePct": 2.318
}
```
