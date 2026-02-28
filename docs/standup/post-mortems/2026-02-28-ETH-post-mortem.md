# Post-mortem: ETH long (stop_loss)

**Date:** 2026-02-28

## Trade Snapshot

- ETH long closed stop_loss: entry $1924.48 -> exit $1895.00, P&L $-34.22 (2163.155376404494 USD, 10x).
- Entry time (UTC): 2026-02-28T01:45:57.472Z
- Hold window target: intraday
- Max loss budget: $16.11 (7.45%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 278 minutes
- Adverse move: 1.532%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter (exact time/date)? What was CT sentiment at entry vs. exit? Did macro shift (Fed news, BTC dump, etc.) or was it pure liquidation cascade?

**Sentiment take:** If you entered during a local ETH rally and exited into a broader macro red, the trade thesis was sound — you just got shaken out by momentum. If CT was already bearish and you went long anyway, that's fighting the vibe, which is a different lesson.

**What I need to audit this properly:** Your entry timestamp + what X was saying about ETH/macro at that exact moment. Then I can tell you if sentiment killed you or if it was just leverage + volatility.

Confidence: 0.4 (incomplete data)

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing context:** What's the condition_id or Polymarket ETH contract you were tracking? Without the live odds (fair value vs. your entry), I can't tell if you got stopped into a regime shift or just hit volatility noise. **The math:** 2.3% loss on 10x is tight risk management—good discipline. **The question:** Was this a mismatch between Poly's fair value and your entry (edge gone), or did macro/sentiment flip (check Poly volume/spread into the close)? Grab the live odds for the contract you shorted and I'll tell you if the market repriced or you just got whipsawed.

**Confidence: 0.3** (need market data to diagnose regime vs. noise).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** What was your thesis duration (1h/1d/2d hold?), and what triggered the stop—volatility spike or directional rejection? **On mechanics:** 10x leverage on a $1,924 entry with a $29.48 stop (1.5% buffer) is tight for ETH's intraday swings; you got shaken out. **Call:** For paper bot tuning, widen stops to 2–3% or size down leverage to 5x if thesis is <4h. $2,163 notional on 10x is aggressive for testing—dial it back, let winners run longer. **Confidence: 0.6** (structure sound, but missing hold duration and vol context makes precision hard).

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
  "holdMinutes": 278,
  "adverseMovePct": 1.532,
  "echoContext": {
    "entryTimestampUtc": "2026-02-28T01:45:57.472Z",
    "exitTimestampUtc": "2026-02-28T06:23:42.945Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-02-28T01:45:57.472Z",
    "exitTimestampUtc": "2026-02-28T06:23:42.945Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.745,
    "maxLossUsd": 16.11,
    "maxLossPct": 7.45,
    "entryAtrPct": 1.4892146596858638
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
