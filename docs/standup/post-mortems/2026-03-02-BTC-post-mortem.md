# Post-mortem: BTC long (stop_loss)

**Date:** 2026-03-02

## Trade Snapshot

- BTC long closed stop_loss: entry $69196.84 -> exit $68690.00, P&L $-65.02 (8309.178743961353 USD, 10x).
- Entry time (UTC): 2026-03-02T18:33:51.502Z
- Hold window target: intraday
- Max loss budget: $54.01 (6.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 30 minutes
- Adverse move: 0.732%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Sentiment Post-Mortem:**

The loss timing matters more than the size here — was this stop hit during a macro dump (Fed speak, macro data) or pure CT capitulation? If CT was still net-bullish when you got stopped, that's a false breakout setup (sentiment divergence = alpha next time). If sentiment had already turned bearish 4–6 hours before, you were fighting the vibe — good stop discipline, but entry timing missed the macro shift.

**Missing context:** What was CT sentiment (X_PULSE score) at entry vs. exit? Any macro catalyst in that 1–2 hour window? That tells me if this was "sentiment was wrong" or "you read sentiment right but got unlucky on a wick."

Confidence: 0.6 (need the sentiment snapshot to grade the actual decision).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Which Polymarket(s) were you tracking for BTC directional bias during the trade window? Without seeing the implied probability (Poly price vs. your entry/exit), I can't tell if the market repriced against you or if you caught a genuine overreaction that unwound. 

**On the loss itself:** $65.02 P&L on 10x leverage into a $500 range move is tight risk management—the stop worked. The real question: were Poly shorts (or macro hedges) pricing in that downside before your entry, or did sentiment flip post-entry? That tells us if this was regime chop or a signal miss.

**Regime read:** If BTC Poly markets stayed flat or drifted lower into your stop, you were fighting the consensus. If they rallied *after* your exit, you got shaken out of a reversing setup—that's different

### Solus

- Lane: options mechanics and sizing
- Confidence: 62%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry time, hold duration, funding rate at entry/exit, and whether this was part of a larger hedge or standalone. That said: **$8.3K loss on 10x leverage with ~0.94% drawdown suggests tight stops (good discipline) but also that the sizing may have been too aggressive relative to your edge window**—if this was a 1–4h scalp, the stop was appropriate; if it was meant to be a swing (12h+), you got shaken out of a viable structure. **Mechanics call: tighten your entries to support levels with higher conviction, or size down 2–3x and let winners run longer.** The stop itself is sound; the bet sizing relative to your thesis window is where the leak is.

**Confidence: 0.62** (need hold duration and market regime to refine).

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

- Quality score: 100/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 100
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 100,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 30,
  "adverseMovePct": 0.732,
  "echoContext": {
    "entryTimestampUtc": "2026-03-02T18:33:51.502Z",
    "exitTimestampUtc": "2026-03-02T19:03:50.427Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-02T18:33:51.502Z",
    "exitTimestampUtc": "2026-03-02T19:03:50.427Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.65,
    "maxLossUsd": 54.01,
    "maxLossPct": 6.5,
    "entryAtrPct": 1.1076439790575914
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
