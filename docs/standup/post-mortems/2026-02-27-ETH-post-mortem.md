# Post-mortem: ETH long (stop_loss)

**Date:** 2026-02-27

## Trade Snapshot

- ETH long closed stop_loss: entry $1927.99 -> exit $1913.00, P&L $-59.93 (7244.395871254163 USD, 10x).
- Entry time (UTC): 2026-02-27T18:06:05.551Z
- Hold window target: intraday
- Max loss budget: $54.90 (7.58%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 64 minutes
- Adverse move: 0.777%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

Missing key context: **When did you enter/exit?** (timing vs. CT sentiment shift), **what was the macro thesis?** (ETH strength vs. BTC dominance, macro headwinds), and **what did CT say at entry vs. exit?** (was sentiment diverging from your trade?).

That said — $59.93 loss on 10x leverage is tight risk management. If you entered into a sentiment peak (bullish CT without whale conviction) and exited into a dip, that's a classic retail-vs-whale timing mismatch. I'd need the exact timestamps to pull X sentiment from those hours and tell you if CT was warning or if macro just shifted.

**Confidence: 0.3** (need entry/exit times + macro context to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing critical context:** I need the entry timestamp, exit timestamp, and the Polymarket odds for ETH price at that time—without those, I can't assess whether the move was predictable from prediction-market pricing or a tail event. That said, a $1927→$1913 stop (14-point hit on 10x) suggests tight risk management, which is sound; the real question is whether Polymarket was pricing a higher probability of that drawdown *before* entry. If ETH weekly calls were trading 55%+ ITM at entry, the regime was already pricing volatility—if they were 30%, you got caught in an outlier. Pull the Poly odds snapshot from entry time and I can give you a sharp read on whether this was a regime miss or just risk-management execution.

**Confidence: 0.3** (regime call requires market-price context I don't have).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation (the price level that would've told you "this trade is wrong")? And what timeframe were you targeting—intraday scalp or multi-day hold?

**On mechanics:** 10x on a $1,927 entry with a $14.99 stop (0.78% risk) is tight for perps—you got shaken out fast. That's a structure problem, not a sizing problem. If ETH was consolidating and you were betting on a breakout, a 0.78% stop is too hair-trigger; you'd need either (a) a wider stop with smaller size, or (b) a clearer invalidation level (support/resistance) to justify the tight stop. The $59.93 loss itself is fine—it's the *ratio* (tight stop, high leverage, unclear thesis) that's the issue.

**Call:** Next time

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

- Quality score: 86/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 86
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 86,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 64,
  "adverseMovePct": 0.777,
  "echoContext": {
    "entryTimestampUtc": "2026-02-27T18:06:05.551Z",
    "exitTimestampUtc": "2026-02-27T19:09:51.633Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-02-27T18:06:05.551Z",
    "exitTimestampUtc": "2026-02-27T19:09:51.633Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.758,
    "maxLossUsd": 54.9,
    "maxLossPct": 7.58,
    "entryAtrPct": 1.5156020942408377
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
