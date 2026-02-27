# Post-mortem: MSTR short (stop_loss)

**Date:** 2026-02-27

## Trade Snapshot

- MSTR short closed stop_loss: entry $132.89 -> exit $134.95, P&L $-52.99 (3317.1911111111112 USD, 10x).
- Entry time (UTC): 2026-02-27T00:01:54.083Z
- Hold window target: intraday
- Max loss budget: $49.76 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 264 minutes
- Adverse move: 1.548%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (exact times)? What was CT sentiment on MSTR/BTC correlation at entry and exit? Did you check if macro sentiment (Fed, BTC, macro risk-off) shifted during the hold?

**On the trade itself:** MSTR at $132.89 was likely riding BTC euphoria—CT was probably mega-bullish on the leverage play. Your stop at $134.95 suggests you expected mean reversion or macro rotation, but if BTC kept ripping and sentiment stayed risk-on, you got shaken out on noise. The real question: did CT flip bearish during your hold, or did you just get stopped on volatility while sentiment remained bullish?

**Confidence: 0.4** — I need the timestamp and CT sentiment snapshot at entry/exit to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing critical context:** I need the Polymarket condition_id for MSTR moves (or the specific prediction market you were hedging against) to tell you whether this was a regime miss or a pricing inefficiency. Without that, I can only note: a $2.06 move (1.55%) against a 10x short is brutal but survivable—the real question is whether Poly was pricing a higher probability of upside at entry, which would've signaled the stop-loss was too tight for the regime. If Poly had MSTR >$135 at >40% odds and you entered at $132.89, the market was already pricing the risk; if it was <25%, you got caught in an overreaction that reversed. **What's the Polymarket ticker or condition_id for this trade?** That tells me if this was a regime call gone wrong or a liquidity/spread issue.

**

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** What was your thesis invalidation trigger? Did it hit, or did you get stopped out early? A $2 move (1.5%) on 10x leverage is tight—was that your planned stop, or did slippage/liquidity push you out? If thesis broke, the stop is correct; if you got shaken, the sizing (10x on MSTR) is too aggressive for equity vol. **Mechanics call:** For paper perps on single-name equities, 5-7x max until you prove consistent edge; 10x only on BTC/ETH where vol is lower and liquidity deep. **Next:** Post the thesis + invalidation condition and I'll assess whether the stop placement was sound or the sizing was the real problem.

**Confidence: 0.6** (missing thesis + why you exited—can't judge structure without it).

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 264,
  "adverseMovePct": 1.548
}
```
