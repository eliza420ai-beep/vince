# Post-mortem: BTC long (stop_loss)

**Date:** 2026-03-06

## Trade Snapshot

- BTC long closed stop_loss: entry $71059.21 -> exit $70152.00, P&L $-39.63 (2986.8545641571272 USD, 3x).
- Entry time (UTC): 2026-03-05T16:32:28.470Z
- Hold window target: intraday
- Max loss budget: $34.71 (3.49%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 790 minutes
- Adverse move: 1.277%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter (exact time)? What was CT sentiment at entry vs. exit? Was there a macro event (Fed, jobs, geopolitical) that shifted the vibe between those two points?

**Sentiment angle:** If you entered into extreme bullish sentiment (CT euphoria), that's a classic fade setup — retail piling in right before a wick. If you exited into a sudden bearish spike (panic selling, news shock), you might've been shaken out before a bounce. The $900 loss on 3x is tight, which suggests good risk discipline, but sentiment-wise I'd need to know if CT was turning bearish *before* your stop or *after*.

**What I'd check:** Pull the X vibe from your entry time. If CT was +70 or higher, that's a red flag for mean reversion. If it was neutral-to-negative and you

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need the trade date/time, the Polymarket BTC price action around your entry/exit (was it consolidating or trending down?), and whether you had an edge signal from a specific market (e.g., "BTC above $72K by Friday"). Without that, I can't tie the loss to regime mispricing vs. a legitimate stop.

That said: A $71K entry with a tight ~$900 stop on 3x is a high-conviction, short-duration play—likely a weekly or daily breakout attempt that failed. If Polymarket was pricing BTC above $71.5K with >60% confidence at your entry, the stop was rational; if it was already showing weakness (<50%), you may have been fighting the market's own forecast.

**Confidence: 0.3** — I need the Polymarket snapshot and trade timestamp to give you real feedback.

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** Entry time, exit time, funding rate at entry/exit, and what triggered the stop (market move vs liquidation cascade). On mechanics: 3x on a $71K entry with a $907 stop is tight (1.28% loss buffer)—that's aggressive for BTC's typical intraday swings. If this was a quick scalp into resistance, the sizing was right; if it was a swing hold, you got shaken out by noise. Check: did funding spike before exit? Did you hit the stop on a wick or a real breakdown?

**Confidence: 0.4** (need trade timestamp and market context to assess structure properly).

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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$34.71, realized=$39.63, slippage=$4.92, breach=true
- Consistency checks: pass

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.
- No automatic policy mutation due to data/quality gate.

## Recursive Policy Delta

- Adaptation eligible: false
- Policy version at entry: baseline
- Proposed delta: none

## Machine-Readable Summary

- PM_QUALITY_SCORE: 79
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.92
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 79,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 790,
  "adverseMovePct": 1.277,
  "riskBudget": {
    "plannedRiskUsd": 34.71,
    "realizedRiskUsd": 39.63,
    "riskSlippageUsd": 4.92,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.277,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.162,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T16:32:28.470Z",
    "exitTimestampUtc": "2026-03-06T05:42:29.218Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T16:32:28.470Z",
    "exitTimestampUtc": "2026-03-06T05:42:29.218Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.162,
    "maxLossUsd": 34.71,
    "maxLossPct": 3.49,
    "entryAtrPct": 1.1620942408376964
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp",
      "entry_datetime"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
