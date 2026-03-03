# Post-mortem: ETH long (stop_loss)

**Date:** 2026-03-03

## Trade Snapshot

- ETH long closed stop_loss: entry $2050.91 -> exit $2011.90, P&L $-56.02 (2869.704158584531 USD, 3x).
- Entry time (UTC): 2026-03-02T20:06:24.202Z
- Hold window target: intraday
- Max loss budget: $43.14 (4.51%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 362 minutes
- Adverse move: 1.902%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment at entry vs. exit? Was there a macro catalyst (Fed news, BTC dump, liquidation cascade) that broke the thesis, or pure technicals?

That said — **$56 loss on a 3x leveraged ETH long is tight risk management**, which is solid. If you entered into extreme bullish sentiment and exited into capitulation, that's textbook "got shaken out before the bounce." If you entered into already-neutral/bearish CT and it got worse, the sentiment thesis was weak from the jump.

**Need the timestamp and what CT was saying at entry/exit to give you real feedback.** Sentiment doesn't move price alone, but it *predicts* who's left to sell.

Confidence: 0.3 (incomplete data).

### Oracle

- Lane: prediction market regime
- Confidence: 55%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** ETH/USD pair timeframe (4h, 1d?), entry signal source (paper bot model, Polymarket edge, macro?), and whether this hit stop or closed on signal. That said: a 2% loss on 3x leverage into a down regime is textbook risk management—the stop worked. Check if Polymarket's ETH macro markets (Fed policy, inflation bets) shifted *before* your entry; if so, the regime signal was already priced in and your edge window had closed. If this was model-driven, compare the paper bot's fair-value assumption at $2050 vs. what the market was actually pricing (check our ETH prediction markets for consensus)—mismatch there tells you if the model lagged price discovery.

**Confidence: 0.55** (need entry rationale and timeframe to isolate whether this was regime miss or execution timing).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** leverage ratio (3x noted but need confirmation on notional), position duration (hours? days?), and what triggered entry—was this a perp signal or discretionary? On mechanics: 2% loss on a 3x leveraged position is tight risk management, but the stop-hit suggests either entry was borderline or volatility whipsawed you fast. For paper trades, this is good discipline—you're proving the stop works. **Confidence: 0.6** (can't assess structure without knowing signal quality and hold time).

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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

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
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 362,
  "adverseMovePct": 1.902,
  "echoContext": {
    "entryTimestampUtc": "2026-03-02T20:06:24.202Z",
    "exitTimestampUtc": "2026-03-03T02:08:51.078Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-02T20:06:24.202Z",
    "exitTimestampUtc": "2026-03-03T02:08:51.078Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.503,
    "maxLossUsd": 43.14,
    "maxLossPct": 4.51,
    "entryAtrPct": 1.5032460732984292
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
