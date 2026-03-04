# Post-mortem: ETH short (stop_loss)

**Date:** 2026-03-04

## Trade Snapshot

- ETH short closed stop_loss: entry $2059.59 -> exit $2076.80, P&L $-46.61 (5262.382222222222 USD, 10x).
- Entry time (UTC): 2026-03-04T09:05:38.754Z
- Hold window target: intraday
- Max loss budget: $41.38 (7.86%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 12 minutes
- Adverse move: 0.836%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** Did CT flip bullish on ETH around entry, or was sentiment already hot? Was there a macro catalyst (Fed, BTC move, ETF flow) that caught the short off-guard? The stop hit tight ($17.21 range), so execution was clean, but I need to know if sentiment diverged from your thesis or if macro just shifted the bias. 

**What I'd check:** Pull the X_PULSE from your entry time — if whale accounts and retail were both long-biased and you shorted into that, that's a sentiment vs. thesis mismatch worth flagging for next time.

Confidence: 0.3 (need entry-time sentiment snapshot to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing critical context:** What was the Polymarket ETH price action around your entry/exit? Did spot or perp odds shift, and did you have a thesis tied to prediction-market edge (e.g., overreaction strat, Synth fair value vs. Poly price)? 

**On the P&L:** $46 loss on $5.2K notional (10x) is a clean stop—you sized right for the risk. The move ($17 slippage) into your short suggests momentum was against you; without knowing the market regime (was ETH rallying on macro, or did Poly signal overheating?), it's hard to say if the thesis broke or timing was off.

**Next:** Pull the Polymarket ETH markets around that timestamp—if Poly was pricing ETH lower and perp rallied into it, that's a regime mismatch worth flagging for

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your thesis invalidation trigger (what price/event would flip you to long)? Did funding rate or liquidation cascade inform the stop, or was it pure technicals?

**Mechanics read:** 10x on a $5.2K notional short is aggressive for a paper trade — sizing is fine, but the stop at +$16.80 (0.82% loss) suggests tight risk tolerance or weak conviction. If ETH was ranging, that's a whipsaw setup; if you had a clear invalidation level (e.g., $2080 breaks weekly support), the stop placement makes sense. The loss itself is noise on paper, but the *structure* tells me either (1) your thesis was thin, or (2) you're testing stops that are too tight for volatility.

**Next:** Post the invalidation and the daily chart context, and I'll assess whether the stop was mechan

## Root-Cause Tags

- Primary: sizing_too_aggressive
- Secondary: stop_too_tight_for_vol

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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 98/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 98
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 98,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 12,
  "adverseMovePct": 0.836,
  "echoContext": {
    "entryTimestampUtc": "2026-03-04T09:05:38.754Z",
    "exitTimestampUtc": "2026-03-04T09:17:49.981Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-04T09:05:38.754Z",
    "exitTimestampUtc": "2026-03-04T09:17:49.981Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.786,
    "maxLossUsd": 41.38,
    "maxLossPct": 7.86,
    "entryAtrPct": 1.5725654450261781
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
