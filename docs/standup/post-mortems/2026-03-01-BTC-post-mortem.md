# Post-mortem: BTC long (stop_loss)

**Date:** 2026-03-01

## Trade Snapshot

- BTC long closed stop_loss: entry $66439.29 -> exit $65998.00, P&L $-46.19 (6466.809087989007 USD, 10x).
- Entry time (UTC): 2026-03-01T18:05:18.085Z
- Hold window target: intraday
- Max loss budget: $42.03 (6.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 77 minutes
- Adverse move: 0.664%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (exact time/date)? What was CT sentiment at entry vs. exit? Was this during a macro dump, Fed news, or localized BTC weakness? 

**On the loss itself:** A $441 stop on a $66k entry is tight—you got shaken out on noise, not a trend break. Without knowing the sentiment backdrop (was CT capitulating or just consolidating?), I can't tell if this was bad timing or bad setup. If CT was neutral-to-bullish and you caught a wick, that's a learning; if we were in a macro downtrend and you ignored the vibe, that's a discipline miss.

**Run X_PULSE for that date/time and I can give you the real post-mortem.**

Confidence: 0.3 (incomplete data)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was your thesis entry signal (technicals, macro, Polymarket edge)? Was this tied to a specific prediction market (e.g., BTC price by week-end)? Did Polymarket odds move against you before or after stop hit?

**On the loss itself:** $46 loss on 10x leverage into a $66.4K entry is tight risk management—you sized correctly for a stop hunt. The real question is whether the stop was *placed* on regime conviction or just mechanical risk. If you had a Polymarket edge (e.g., "BTC >$67K by Friday at 65% implied") and got shaken out before that thesis played, that's a regime miss, not a trade miss. If you had no edge and were chasing momentum, the loss is the tuition.

**What I'd need to audit:** Live Polymarket odds for BTC price at

### Solus

- Lane: options mechanics and sizing
- Confidence: 72%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry time, hold duration, funding rate at entry/exit, and whether this was part of a larger perp strategy or standalone. On mechanics alone: 10x on a $66K entry with a $441 stop (0.66% loss) is tight—you're paying heavy funding to defend a narrow range. If this was a 1–2h trade, the funding bleed alone likely ate 30–50% of your available edge; if it was longer, the stop was too close relative to BTC's intraday vol (~1–2% typical). Structure feedback: either widen the stop (accept more loss, reduce funding bleed) or reduce leverage (5x instead of 10x) and hold longer, or skip this timeframe entirely if funding is >0.01%. **Confidence: 0.72** (mechanics clear, but missing trade duration and funding data limits precision).

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
  "holdMinutes": 77,
  "adverseMovePct": 0.664,
  "echoContext": {
    "entryTimestampUtc": "2026-03-01T18:05:18.085Z",
    "exitTimestampUtc": "2026-03-01T19:21:48.679Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-01T18:05:18.085Z",
    "exitTimestampUtc": "2026-03-01T19:21:48.679Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.65,
    "maxLossUsd": 42.03,
    "maxLossPct": 6.5,
    "entryAtrPct": 1.161675392670157
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
