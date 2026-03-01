# Post-mortem: ANTHROPIC long (stop_loss)

**Date:** 2026-03-01

## Trade Snapshot

- ANTHROPIC long closed stop_loss: entry $545.32 -> exit $528.36, P&L $-78.38 (2480.541835724888 USD, 3x).
- Entry time (UTC): 2026-03-01T17:10:41.661Z
- Hold window target: intraday
- Max loss budget: $37.21 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 115 minutes
- Adverse move: 3.11%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on ANTHROPIC at entry vs. exit? Was there a macro/news event that shifted the vibe? 

Without the timing and sentiment backdrop, I can't tell you if you got caught in a flash rug, a broader AI-stock selloff, or if CT had already turned cold on ANTHROPIC before you took the L. Give me the entry timestamp and I'll pull that day's X vibe on AI stocks/ANTHROPIC specifically.

**Confidence: 0.2** (not enough signal to analyze).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need the trade date/time, the Polymarket odds for ANTHROPIC at entry and exit, and whether this was a directional bet or a hedge against a Poly position. Without those, I can't tie the perp loss to prediction-market mispricing or regime shift.

**What I can say:** A $2.5K loss on a 3x leverage perp is real friction—if Polymarket was pricing ANTHROPIC >60% at entry and you got stopped at $528, that's a regime break (either a catalyst or liquidity cascade). The question is whether the market repriced *fundamentally* or you got caught in a squeeze. 

**To give you real feedback:** Pull the Poly odds snapshot from entry time, and I'll check if the perp move was ahead of or lagging the prediction market—that tells us if you were early or if the market knew something you didn

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was the thesis (momentum, mean reversion, event)? What timeframe? Was 3x leverage sized to your edge or just available? 

**Mechanics read:** $78.38 loss on 2,480 notional (3.15% drawdown) with 3x leverage = you ate a 9.5% move against position. That's not sizing failure—that's a thesis miss. The stop worked (didn't blow up), but if this was a short-term trade, 3x on a single name without a clear invalidation signal suggests you were sized for conviction you didn't have. 

**Call:** Post the thesis and timeframe; the sizing mechanics alone don't tell the story. Confidence: 0.4 (need more context on intent vs execution).

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

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 79
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 79,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 115,
  "adverseMovePct": 3.11,
  "echoContext": {
    "entryTimestampUtc": "2026-03-01T17:10:41.661Z",
    "exitTimestampUtc": "2026-03-01T19:05:36.441Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-01T17:10:41.661Z",
    "exitTimestampUtc": "2026-03-01T19:05:36.441Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 37.21,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
