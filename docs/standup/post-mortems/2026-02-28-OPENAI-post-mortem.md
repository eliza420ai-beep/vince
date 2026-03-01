# Post-mortem: OPENAI long (stop_loss)

**Date:** 2026-02-28

## Trade Snapshot

- OPENAI long closed stop_loss: entry $839.85 -> exit $826.52, P&L $-20.13 (1229.8430633053058 USD, 3x).
- Entry time (UTC): 2026-02-28T15:41:02.054Z
- Hold window target: intraday
- Max loss budget: $18.45 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 7 minutes
- Adverse move: 1.587%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit? Was this during a CT sentiment shift (e.g., tech selloff, AI narrative pivot, macro reversal)? And what was the thesis — were you riding AI hype or betting against it?

**Sentiment read:** OPENAI trades on narrative momentum. If CT flipped bearish on AI mega-cap valuations or macro turned risk-off during your hold, that's a headwind no position size fixes. A $20 loss on 3x is tight risk management, but I'd need the entry/exit timestamps to tell you if you got caught in a sentiment reversal or just bad timing within a stable vibe.

**Ask Vince** for the exact trade window — I can pull CT sentiment for that period and tell you if macro/narrative was working against you.

Confidence: 0.4 (incomplete data).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need the trade date/time and the Polymarket OPENAI price action around your entry/exit to map regime—was there a sharp move in the prediction market that telegraphed the reversal, or did perps lead? Also: what was your thesis (mean-reversion, breakout, macro trigger)?

**That said:** A $20 loss on 3x leverage in a $800+ asset is tight risk management—the stop worked. Without seeing Polymarket odds at entry/exit, I can't tell if the market repriced the event risk you were trading against or if it was pure momentum chop. If Polymarket showed conviction *against* your directional bet, that's the regime signal to catch next time.

**Ask VINCE** for the live perps action and his entry thesis—I can cross-check what Polymarket was pricing on OPENAI at that moment.

**

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was the thesis (directional, volatility, catalyst timing)? What timeframe? Did you hit stop at support or was it random slippage? 

**On mechanics:** 3x leverage on a $839 entry is aggressive for a paper bot testing edge—you're amplifying noise. If this was meant to prove a directional signal, the sizing masks whether the *idea* was right (entry logic, hold duration, exit trigger). Losing $1.2K on a $20 move suggests the thesis was either wrong or the position was too leveraged for the conviction level.

**Recommendation:** Post-mortem should isolate: (1) Was the entry signal valid? (2) Should you have sized down instead of using 3x? (3) Did you exit at a predetermined level or panic? Answer those, and you'll know if it's a sizing problem or a signal problem.

**

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
  "holdMinutes": 7,
  "adverseMovePct": 1.587,
  "echoContext": {
    "entryTimestampUtc": "2026-02-28T15:41:02.054Z",
    "exitTimestampUtc": "2026-02-28T15:47:55.934Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-02-28T15:41:02.054Z",
    "exitTimestampUtc": "2026-02-28T15:47:55.934Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 18.45,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
