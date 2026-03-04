# Post-mortem: BTC short (stop_loss)

**Date:** 2026-03-04

## Trade Snapshot

- BTC short closed stop_loss: entry $70835.83 -> exit $71374.00, P&L $-56.68 (7000 USD, 10x).
- Entry time (UTC): 2026-03-04T09:05:24.141Z
- Hold window target: intraday
- Max loss budget: $45.50 (6.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 12 minutes
- Adverse move: 0.76%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter? What was CT sentiment at entry vs. exit? Was there a macro catalyst (Fed news, ETF flow, whale buying) that shifted the vibe between those two timestamps?

That said — a $7k loss on a BTC short in a macro environment where CT has been cautiously bullish (ETF inflows, supply shock narratives dominating) suggests you were fighting sentiment headwinds. If you shorted into rising whale accumulation or positive macro chatter, that's a sentiment mismatch, not a sizing issue. Next time: check X_PULSE before entry to see if CT conviction is against your thesis.

**Confidence: 0.6** (need timestamps and CT vibe at entry/exit to give you real signal).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was your thesis entry signal (technicals, macro narrative, Polymarket odds on BTC direction)? Was this a hedge against a long options position, or a directional bet? Without knowing the regime you were trading (range, trend, volatility regime) and what Polymarket priced BTC at entry/exit, I can't isolate whether this was a bad call or bad timing.

**What I can say:** A $56.68 loss on 10x leverage into a $71K asset suggests tight stops—good risk management. But if Polymarket odds on "BTC above $72K by [date]" were >60% at entry, you were fighting consensus pricing; if they were <40%, you had edge and bad luck. The regime matters: in a bull breakout, shorts get liquidated fast. In a choppy macro, tight stops bleed.

**Next time:** Ping

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry signal (why short at $70,835?), stop placement logic (why $71,374 = 0.76% above entry?), and intended hold duration. That said: **the stop is tight for a 10x perp**—0.76% move is noise on BTC hourly, especially if this was a swing/daily thesis. At 10x, you're fighting funding bleed + volatility tax; a 50–100 bps stop would've given the trade room to breathe without being reckless. **Sizing-wise:** $56.68 loss on a $7K notional is clean (risk-managed), but if this was a high-conviction setup, the tight stop suggests either (a) conviction wasn't there, or (b) the entry was tactical/scalp-style and should've been smaller notional with looser stops. **Next:** paste the

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
  "holdMinutes": 12,
  "adverseMovePct": 0.76,
  "echoContext": {
    "entryTimestampUtc": "2026-03-04T09:05:24.141Z",
    "exitTimestampUtc": "2026-03-04T09:17:49.950Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-04T09:05:24.141Z",
    "exitTimestampUtc": "2026-03-04T09:17:49.950Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.65,
    "maxLossUsd": 45.5,
    "maxLossPct": 6.5,
    "entryAtrPct": 1.1589528795811517
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
