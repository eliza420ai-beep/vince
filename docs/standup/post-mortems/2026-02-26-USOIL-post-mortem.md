# Post-mortem: USOIL short (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- USOIL short closed stop_loss: entry $78.34 -> exit $79.63, P&L $-54.29 (3198.0307692307697 USD, 10x).
- Entry time (UTC): 2026-02-26T11:35:08.780Z
- Hold window target: intraday
- Max loss budget: $47.97 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 224 minutes
- Adverse move: 1.648%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Sentiment read:** Oil sentiment was likely bullish into your entry — geopolitical risk, supply concerns, or macro tailwinds probably had CT and macro traders long. Your short fought the crowd. 

**What I'd need to give you better feedback:** When did you enter? Was there a specific news catalyst, or did you go contrarian on a vibe read? If you shorted into a macro bid (Fed pivot, Middle East escalation, supply shock), that's a tough setup — sentiment + flows beat solo thesis.

**The edge question:** Did X/CT sentiment diverge from your thesis before the stop, or did macro just move against you? If it's the latter, this is a market-timing miss, not a sentiment miss on my end.

Confidence: 0.4 (need entry timestamp + catalyst context to assess whether sentiment was a headwind or just market structure).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the Polymarket odds on oil price direction at entry and exit to frame this against consensus. Without that, I can only say: your $1.29 move against you on a 10x short is classic whipsaw in a range-bound regime—oil's been choppy on macro uncertainty. The stop at $79.63 was tight for the volatility; if Poly had priced >55% odds on a move above $79, your risk/reward was already unfavorable at entry. Pull the Poly odds snapshot from when you entered, and I can tell you if the market was pricing the move you got stopped on.

**Confidence: 0.3** (too little regime data; need Polymarket context to be useful here).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation for the short? Was $79.63 your planned stop, or did it breach unexpectedly? On 10x leverage with $3,198 notional, a 1.6% move against you is tight—typical for commodities vol, but the real question is whether the setup had edge or if you were chasing premium in a choppy market.

**Mechanic feedback:** USOIL on perps is low-liquidity relative to BTC/ETH; slippage on 10x entries/exits can eat 20-40bps. If you're paper-testing the bot here, scale down to 2-3x first to isolate signal from leverage noise. The loss itself is fine (part of proving edge), but I'd want to see: entry rationale, stop placement logic, and whether this trade fits your weekly vol/correlation thesis or was reactive.

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 224,
  "adverseMovePct": 1.648
}
```
