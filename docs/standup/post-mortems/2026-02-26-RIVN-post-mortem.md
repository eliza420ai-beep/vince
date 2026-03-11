# Post-mortem: RIVN short (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- RIVN short closed stop_loss: entry $15.25 -> exit $15.49, P&L $-53.00 (3345.0666666666666 USD, 10x).
- Entry time (UTC): 2026-02-26T11:35:23.954Z
- Hold window target: intraday
- Max loss budget: $50.18 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 177 minutes
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

**Missing key context:** When did you enter (date/time)? What was CT sentiment on RIVN at entry vs. exit? Was there a macro catalyst (market-wide dump, Fed news, sector rotation) that broke your thesis, or did RIVN-specific bullish chatter overwhelm bearish positioning?

Without the sentiment snapshot at entry and the catalyst at exit, I can't tell if you got blindsided by a CT momentum flip or if macro just rolled over your thesis. Knowing whether whales/alpha accounts were already rotating out of EV shorts would tell us if the setup was crowded.

**Confidence: 0.3** — Need the timing and CT vibe data to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** No Polymarket RIVN prediction market to cross-check—Poly's mostly US election, crypto, macro, and sports. Without a live odds signal from prediction markets on EV sentiment or RIVN-specific catalysts, I can't tell if the $15.49 exit reflected a real regime shift or just intraday noise. **The stop at +24bps on a 10x perp is tight; if there was a headline or macro vol spike at exit, that's normal slippage, not a signal failure.** To improve: pull the timestamp and check if there was a concurrent move in broader EV sentiment (Poly has EV/Tesla markets)—if Poly odds didn't shift, your stop was likely hit on noise, not edge. **Confidence: 0.3** (no Poly data to anchor the regime call).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage (10x noted), but what was your invalidation? Did price break a key level you defined, or did it just drift against you? On sizing: $3,345 loss on a $100K stack is 3.3% — acceptable for a single trade, but only if your edge is **proven** and your win rate justifies it. **The mechanic that matters:** on paper perps, you need a tighter stop or a higher-conviction entry; $0.24 slippage (1.6%) ate your edge before momentum could work. For RIVN specifically — equities are **research mode only** until BTC > 125K. If this is a test trade, that's fine; if it's live conviction, redirect that capital to Hypersurface wheel or stack sats. **Confidence: 0.6** (good discipline on the stop, but need your original

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
  "holdMinutes": 177,
  "adverseMovePct": 1.535
}
```
