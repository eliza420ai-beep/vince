# Post-mortem: ETH long (stop_loss)

**Date:** 2026-03-02

## Trade Snapshot

- ETH long closed stop_loss: entry $2035.61 -> exit $2018.80, P&L $-73.31 (8372.093023255813 USD, 10x).
- Entry time (UTC): 2026-03-02T18:33:54.066Z
- Hold window target: intraday
- Max loss budget: $63.85 (7.63%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 36 minutes
- Adverse move: 0.826%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

Need context: **What was CT's sentiment on ETH when you entered?** Was it bullish consensus (red flag for crowded trade) or contrarian setup? Also — **did macro shift during your hold?** (Fed speak, BTC moves, macro news). Without knowing if you were fighting sentiment or riding it, I can't give you real feedback. The stop hit tight ($16.81), which suggests either low conviction entry or high slippage — but that's execution, not my lane.

**Confidence: 0.3** (missing sentiment baseline + macro context)

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need the trade date/time, the Polymarket ETH price action around entry/exit (was there a macro shock or just chop?), and what thesis drove the long (macro, technicals, options expiry gamma?). 

**What I can say:** A $73 loss on a 10x long from a $16.81 move (0.83%) suggests tight stops in a choppy regime—if ETH was trading sideways on Poly while you got stopped on Hyperliquid perps, that's regime mismatch (perps are noisier). If there was a coordinated Poly dump (e.g., Fed news, BTC correlation), the stop was well-placed; if it was just intraday volatility, consider wider stops or lower leverage on thesis-light entries.

**Confidence: 0.4** (need trade timestamp and Poly context

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry signal/thesis, stop placement rationale, position duration, market regime at entry. **On mechanics:** 10x leverage on ETH perps with a $73 absolute loss suggests tight stop (0.83% from entry) — likely hit by noise rather than thesis break. If this was a short-term scalp, the sizing is reasonable; if medium-term directional, the stop was too aggressive for ETH's intraday volatility (typically 1-3% daily moves). **Call:** Widen stops to 1.5-2% of entry for perps, or reduce leverage to 5x if keeping tight stops — you're fighting noise, not thesis.

**Confidence: 0.6** (need entry signal and intended hold duration to assess if stop placement was the flaw or if thesis itself was weak).

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
  "holdMinutes": 36,
  "adverseMovePct": 0.826,
  "echoContext": {
    "entryTimestampUtc": "2026-03-02T18:33:54.066Z",
    "exitTimestampUtc": "2026-03-02T19:09:47.084Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-02T18:33:54.066Z",
    "exitTimestampUtc": "2026-03-02T19:09:47.084Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.763,
    "maxLossUsd": 63.85,
    "maxLossPct": 7.63,
    "entryAtrPct": 1.5252356020942408
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
