# Post-mortem: SILVER short (stop_loss)

**Date:** 2026-03-04

## Trade Snapshot

- SILVER short closed stop_loss: entry $83.23 -> exit $85.02, P&L $-35.82 (1628.7378113207546 USD, 5x).
- Entry time (UTC): 2026-03-03T18:33:18.592Z
- Hold window target: intraday
- Max loss budget: $24.43 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 590 minutes
- Adverse move: 2.149%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on SILVER/commodities at entry vs. exit? Was there a macro catalyst (Fed speak, inflation data, DXY move) that shifted the vibe between those two points?

Without the timing and sentiment snapshot, I can't tell if you got caught in a contrarian crowded short or if macro conditions actually flipped against the thesis. If this was a multi-day hold, CT's macro pulse likely shifted — check whether inflation expectations or USD strength narratives changed in that window.

**Confidence: 0.3** (need trade timestamp + CT sentiment delta to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** I need the entry/exit timestamps and the Polymarket SILVER prediction during that window—was the market pricing silver higher or lower than spot at entry? That tells us whether you fought consensus or got caught in a regime shift.

**Quick take:** A $1.79 move against a 5x short is tight risk management, but without knowing if Polymarket was pricing upside (bullish consensus) or if spot just gapped on macro data, I can't say whether this was a regime miss or a well-executed stop. If Poly was pricing $85+ when you shorted $83.23, you were fighting the market's own forecast—that's a regime call, not an edge call.

**What I'd pull:** Live SILVER prediction from Polymarket during your trade window, and whether macro (jobs, inflation print, DXY move) shifted the market's fair-value anchor between entry and

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Was this a perp on Hyperliquid or paper bot simulation? What was the intended hold time, and did macro (DXY, real rates, Fed signals) shift against the thesis intraday? The 1.8% move against you is normal for SILVER on 5x, but the real question is whether the stop was *mechanically sound* (right % distance from entry for the volatility regime) or reactive. If it was reactive, tighten your invalidation rules before entry—don't let intraday noise trigger the exit. If it was mechanical and macro shifted, that's a data input problem (VINCE's lane for macro timing), not a sizing problem.

**Confidence: 0.6** (need trade setup details—intended hold, stop placement logic, macro context at entry vs exit).

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

- Quality score: 89/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 590,
  "adverseMovePct": 2.149,
  "echoContext": {
    "entryTimestampUtc": "2026-03-03T18:33:18.592Z",
    "exitTimestampUtc": "2026-03-04T04:23:30.989Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-03T18:33:18.592Z",
    "exitTimestampUtc": "2026-03-04T04:23:30.989Z"
  },
  "solusContext": {
    "assetClass": "commodity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 24.43,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
