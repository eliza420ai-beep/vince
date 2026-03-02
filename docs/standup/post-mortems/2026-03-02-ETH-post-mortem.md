# Post-mortem: ETH long (stop_loss)

**Date:** 2026-03-02

## Trade Snapshot

- ETH long closed stop_loss: entry $1938.69 -> exit $1923.40, P&L $-49.72 (5928.7127280397335 USD, 10x).
- Entry time (UTC): 2026-03-02T08:00:33.310Z
- Hold window target: intraday
- Max loss budget: $45.22 (7.63%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 13 minutes
- Adverse move: 0.789%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (time/date)? What was CT sentiment on ETH during that window — was it shifting bearish before your stop hit, or did macro surprise you? Did whale accounts or alpha threads flag the weakness you didn't catch?

**On the trade itself:** A $50 loss on 10x leverage is tight risk management, which is solid. But sentiment-wise, I'd need to know if CT was already rotating out of ETH (which would've been your early warning) or if this was a surprise macro flush that caught everyone.

**Next time:** Run X_PULSE on ETH before entry to catch the vibe, then monitor it during hold. If sentiment flips from bullish → neutral, that's often your canary before price breaks.

**Confidence: 0.3** — I'm light here because I don't have the timestamp or CT sentiment snapshot from your

### Oracle

- Lane: prediction market regime
- Confidence: 55%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket ETH price at entry/exit, implied vol regime (IV crush?), and whether this was a directional hedge against a specific options position or standalone. That said: a $50 loss on 10x leverage suggests tight stops in a choppy regime—if Poly was pricing ETH lower than spot at entry, you were fighting the consensus. Check whether the trade was sized to a Hypersurface strike or if it was orphaned directional exposure; if the latter, the loss is tuition for regime-reading, not a signal failure.

**Confidence: 0.55** (need Poly snapshot + your thesis to isolate regime vs. execution).

### Solus

- Lane: options mechanics and sizing
- Confidence: 78%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, and whether this was part of a planned series or isolated. That said, the mechanics issue is clear—10x leverage on a $1938 entry with a $15 stop (0.77% from entry) is razor-thin for ETH's daily noise; you're fighting slippage and wicks before conviction can play out. If this was a 1-2h hold, the risk/reward was inverted; if multi-day, the stop was too tight for the timeframe. For paper trades proving edge, tighten the leverage (2-5x) and widen stops to 2-3% so signal survives noise—you need 50+ trades to see real edge, not 10x binary bets. **Confidence: 0.78** (structure is clear, but missing hold duration changes the read).

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
  "holdMinutes": 13,
  "adverseMovePct": 0.789,
  "echoContext": {
    "entryTimestampUtc": "2026-03-02T08:00:33.310Z",
    "exitTimestampUtc": "2026-03-02T08:13:21.796Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-02T08:00:33.310Z",
    "exitTimestampUtc": "2026-03-02T08:13:21.796Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.763,
    "maxLossUsd": 45.22,
    "maxLossPct": 7.63,
    "entryAtrPct": 1.5254450261780104
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
