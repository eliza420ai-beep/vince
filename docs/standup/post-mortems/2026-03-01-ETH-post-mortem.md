# Post-mortem: ETH long (stop_loss)

**Date:** 2026-03-01

## Trade Snapshot

- ETH long closed stop_loss: entry $2007.50 -> exit $1991.80, P&L $-53.42 (6419.5331506849325 USD, 10x).
- Entry time (UTC): 2026-03-01T15:30:36.848Z
- Hold window target: intraday
- Max loss budget: $48.69 (7.58%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 30 minutes
- Adverse move: 0.782%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

Need the timestamp + trade thesis to give you real feedback — was this a WTT (what's the trade) play, macro bet, or technical setup? If it was sentiment-driven, I'd want to know: (1) what CT was saying when you entered, (2) what shifted before the stop, and (3) whether the macro pulse changed (Fed news, BTC dump, etc.). Without that, I can only tell you the trade got stopped 6 pips in — which is tight for a 10x and suggests either size was too aggressive for the thesis or sentiment reversed faster than expected.

**Confidence: 0.3** (need context).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need the trade date/time, the Polymarket ETH price at entry/exit (to compare perp vs prediction-market regime), and which market you were shadowing—was this a weekly options hedge play or a standalone perp bet? Without the Poly odds snapshot, I can't tell if the market repriced against you or if you caught a localized perp liquidation cascade. That said: a 10x stop at 0.78% loss suggests tight risk management, which is sound, but the $6.4K notional on a $53 loss implies the perp was moving slower than expected—either the catalyst didn't fire or macro bid held better than Poly implied. **Confidence: 0.4** (need Polymarket context to upgrade).

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry date, exit date, funding paid/collected, and your conviction thesis at entry (bull %, base %, bear % — what made you size 10x?). On mechanics alone: 10x on a $2007 entry with a $15.70 stop (0.78% risk) is tight for ETH's typical intraday range — you were fighting gamma/slippage from the jump. If this was a 1-4h hold, that's a structure problem (too tight stop for the timeframe); if it was a scalp, the stop was right but 10x on a micro-conviction play is oversized. **What was your hold thesis and duration?** That determines if this was bad sizing or bad timing.

**Confidence: 0.3** (need entry/exit timestamps and your original bull case to assess).

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

- Quality score: 84/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 84
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 84,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 30,
  "adverseMovePct": 0.782,
  "echoContext": {
    "entryTimestampUtc": "2026-03-01T15:30:36.848Z",
    "exitTimestampUtc": "2026-03-01T16:00:31.577Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-01T15:30:36.848Z",
    "exitTimestampUtc": "2026-03-01T16:00:31.577Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.758,
    "maxLossUsd": 48.69,
    "maxLossPct": 7.58,
    "entryAtrPct": 1.5168586387434555
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "entry_datetime"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
