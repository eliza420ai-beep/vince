# Post-mortem: USOIL long (stop_loss)

**Date:** 2026-03-03

## Trade Snapshot

- USOIL long closed stop_loss: entry $92.38 -> exit $90.97, P&L $-126.28 (8019.59119357154 USD, 5x).
- Entry time (UTC): 2026-03-03T16:51:02.060Z
- Hold window target: intraday
- Max loss budget: $120.29 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 102 minutes
- Adverse move: 1.525%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** I need to know the *timing* of your entry (when did you go long?) and *what CT was saying about energy/macro at that moment*. Was sentiment bullish on risk assets, or were whales already rotating to safety? That context tells me if you were fighting the vibe or if sentiment just shifted under you mid-trade.

**What I can say now:** USOIL is macro-correlated (USD strength, Fed policy, geopolitical risk) — not a CT-primary topic. Sentiment analysis here is limited; I'd need Vince's macro read on why the trade failed (was it a Fed pivot, DXY spike, or pure technicals?).

**Actionable ask:** Next time, tag the entry time + the macro backdrop when you closed. That lets me flag if you were contrarian-positioned or if CT/macro sentiment flipped on you.

Confidence

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

That's a tight stop on a commodity—crude's been range-bound with geopolitical noise, and $92.38 entry likely caught a false breakout before mean reversion kicked in. Without knowing your thesis (supply shock, Fed pivot, inventory data) and the timeframe you were targeting, hard to say if the stop was right or the entry was premature; what matters is whether Poly crude-price markets or oil futures vol were pricing a breakout that didn't materialize. Check if you were fighting a consensus short (high Poly short odds) or if the move was just noise—that shapes whether you tighten the stop next time or size smaller on the setup.

**Missing:** Entry thesis, intended hold time, what triggered the long, whether you cross-checked Poly oil sentiment beforehand.

**Confidence: 0.4** (commodity regime calls need more context than I have here).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** invalidation thesis (what would prove the trade wrong—you hit it, but was it the *planned* invalidation?), position sizing rationale (why 5x on USOIL vs other assets), and whether this was paper or live (affects risk assessment).

**On structure:** $126 loss on $8K notional is 1.6%—tight stop, reasonable. The issue: USOIL is **not in our core focus set** (BTC, ETH, SOL, HYPE, HIP-3 equities). If this was a VINCE perp test, fine—paper is the lab. If it was live capital, that's allocation drift. **Call:** Stick to focus assets; if USOIL thesis is strong, define it explicitly (catalyst, invalidation, size cap) before entry, not after.

Confidence: 0.6 (

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

- Quality score: 95/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 95
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 95,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 102,
  "adverseMovePct": 1.525,
  "echoContext": {
    "entryTimestampUtc": "2026-03-03T16:51:02.060Z",
    "exitTimestampUtc": "2026-03-03T18:33:18.279Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-03T16:51:02.060Z",
    "exitTimestampUtc": "2026-03-03T18:33:18.279Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 120.29,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
