# Post-mortem: INTC short (stop_loss)

**Date:** 2026-02-25

## Trade Snapshot

- INTC short closed stop_loss: entry $45.76 -> exit $46.53, P&L $-24.53 (1430.0159999999998 USD, 10x).
- Entry time (UTC): 2026-02-25T14:53:08.884Z
- Hold window target: intraday
- Max loss budget: $21.45 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 154 minutes
- Adverse move: 1.665%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter (what was CT sentiment then vs. now)? Was this a contrarian fade of extreme bullish INTC hype, or did you miss a macro shift (Fed pivot, semis rotation)? Did whale accounts flip on the trade thesis mid-hold?

**Sentiment read:** If you shorted into retail FOMO on INTC (typical semis pump narrative), the stop hit because macro didn't cooperate — no surprise there. But I'd need the entry timestamp + what CT was saying about Fed/rates/semis at that moment to tell you if sentiment *should* have warned you out earlier.

**What I'd check:** Pull the X_PULSE from your entry date. Did whale accounts already flip bearish on semis? If so, you were fighting sentiment; if not, this was a macro miss, not a sentiment miss.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing context:** I need the Polymarket condition_id or event for INTC (earnings date, timeframe) to pull live odds and compare your entry thesis to what the market was pricing. Without that, I can't tell if you got stopped into a micro-reversal or if the market repriced fundamentals against your short.

**What I can say:** A 77 bps stop on a 10x leveraged short is tight—typical for scalping intraday noise, not thesis trades. If this was earnings-week volatility or a sector rotation, Polymarket would've shown that repricing in real-time via the orderbook and spreads.

**Next time:** Pull the Polymarket odds for the same event/timeframe before entry, and again at exit—that tells us if you were fighting the consensus or just got clipped by vol. Post the condition_id and I'll give you the regime read.

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage product (perps vs spot vs options?), position duration, stop placement rationale, and whether this was a thesis trade or scalp. **On mechanics alone:** $1,430 loss on a $45.76 entry with 10x suggests tight stop (0.77 points = 1.7% — very tight for equities, especially mega-cap semi like INTC which routinely whipsaw 2-3% intraday). **Call:** Either the stop was too close for the thesis (widen it next time) or the thesis was wrong and you caught it fast (good). **Missing:** Why INTC short at that price? Was it a hedge against your long NVDA/semi thesis, or conviction bearish? That changes whether this was a good close or a structural problem.

Confidence: 0.3 (need trade thesis + product type + market regime context

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
  "holdMinutes": 154,
  "adverseMovePct": 1.665
}
```
