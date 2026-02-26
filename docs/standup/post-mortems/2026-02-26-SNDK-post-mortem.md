# Post-mortem: SNDK short (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- SNDK short closed stop_loss: entry $611.74 -> exit $621.79, P&L $-25.49 (1505.28 USD, 5x).
- Entry time (UTC): 2026-02-26T15:20:56.172Z
- Hold window target: intraday
- Max loss budget: $22.58 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 24 minutes
- Adverse move: 1.643%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing critical context:** Did CT have a bearish thesis on SNDK before entry, and did sentiment flip before your stop? Without knowing the sentiment backdrop (was this a contrarian short against bullish CT, or riding bearish momentum?), I can't assess whether the trade was misaligned with the crowd or just got shaken out. 

**What I'd need:** X posts/sentiment on SNDK in the 48h before entry + exit, whale positioning, and whether this was a macro play (tech selloff) or ticker-specific. 

**Quick take:** If CT was neutral-to-bullish on SNDK and you shorted into strength, that's fighting the vibe — usually a losing edge unless you had alpha the crowd missed. If CT was already bearish and you got stopped on noise, that's just volatility tax.

**Confidence: 0.3** (can't assess without the sentiment

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need the trade date/time, market regime (volatility spike, earnings, sector rotation?), and what Polymarket was pricing for SNDK around entry—was the market already pricing a move higher, or did sentiment shift post-entry? Without that lens, I can't tell if the stop was tight relative to fair value or if you got caught in a regime flip the market saw coming.

**What I can say:** A $10 move on a $611 entry (1.6%) triggering a 5x stop suggests tight risk management, which is sound discipline—but on a short, that means the market was already leaning long or you entered into a crowded short. If Polymarket had SNDK rally priced in at >55% before your entry, the stop was rational; if it was sub-40%, the trade had edge but got shaken.

**Ask:** Pull the entry timestamp and

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Was this a hedge against a long position, or standalone directional? What was your invalidation thesis—did price break it cleanly, or did you get stopped on noise? 

**On mechanics:** 5x leverage on a $611 semiconductor stock is aggressive sizing for a $100K stack (notional ~$3K, margin ~$600). The 1.6% stop ($10 absolute) is tight for SNDK's typical daily range—you likely got shaken out. For semiconductors, I'd target 2-3% stops minimum unless you're hedging a larger long position. 

**Next:** Post your entry thesis and what price action triggered the stop. That tells us if it was bad structure or bad timing.

**Confidence: 0.6** (need invalidation and position context to assess).

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
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 24,
  "adverseMovePct": 1.643
}
```
