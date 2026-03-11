# Post-mortem: COIN short (stop_loss)

**Date:** 2026-03-03

## Trade Snapshot

- COIN short closed stop_loss: entry $181.74 -> exit $184.59, P&L $-47.62 (2946.5146773272418 USD, 5x).
- Entry time (UTC): 2026-03-03T16:51:17.312Z
- Hold window target: intraday
- Max loss budget: $44.20 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 100 minutes
- Adverse move: 1.566%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter (exact time/date)? What was CT sentiment on COIN at entry vs. exit? Was there a macro catalyst (Fed news, BTC move, etc.) that shifted the vibe? 

**Without that:** A 5x short on a mid-cap alt that stops at +1.6% suggests the risk/reward was tight to begin with — sentiment-wise, COIN probably wasn't showing extreme bearish divergence (whale short positioning, negative alpha threads) to justify leveraged short thesis. If you entered into neutral-to-bullish CT vibes, that's the lesson.

**What I'd need to give you real feedback:** Entry timestamp + the X pulse/vibe at that moment (was COIN being discussed? by whom? bullish or bearish?). Then I can tell you if sentiment was actually on your side or if you were fighting the crowd.

Confidence

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the Polymarket odds for COIN at entry and exit to assess whether the market repriced against you or you caught a genuine regime shift. A $2.85 move on 5x is tight—was there news, or did perp liquidity just thin out? Without the prediction-market read, I can't tell if this was bad timing or bad thesis. Pull the live COIN market odds if you want me to compare: did Poly stay flat while perps rallied, or did both shift?

**Confidence: 0.3** (missing the key signal—Polymarket price action relative to your entry/exit).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry thesis (why short COIN?), exit trigger (stop hit or discretionary?), and current market regime for COIN/equities. That said: **5x on a $181 equity short is aggressive sizing for a paper bot—typical leverage for equities should be 2-3x max unless you're hedging a long position.** The $47 loss on a $2,946 notional suggests tight stop (1.6% from entry), which is reasonable, but if this was a thesis trade (not a scalp), the stop was probably too close given equity vol. **Confidence: 0.65** (need entry thesis and regime context to assess whether structure was sound or stop placement was the issue).

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 100,
  "adverseMovePct": 1.566,
  "echoContext": {
    "entryTimestampUtc": "2026-03-03T16:51:17.312Z",
    "exitTimestampUtc": "2026-03-03T18:31:46.764Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-03T16:51:17.312Z",
    "exitTimestampUtc": "2026-03-03T18:31:46.764Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 44.2,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
