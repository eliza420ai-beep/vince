# Post-mortem: CRCL short (stop_loss)

**Date:** 2026-03-16

## Trade Snapshot

- CRCL short closed stop_loss: entry $118.91 -> exit $120.70, P&L $-118.73 (7617.571832210389 USD, 10x).
- Entry time (UTC): 2026-03-16T09:31:21.547Z
- Hold window target: intraday
- Max loss budget: $114.26 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 39 minutes
- Adverse move: 1.509%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on CRCL at entry vs. exit? Was there a macro catalyst (Fed, BTC move, sector rotation) that shifted the vibe between entry and stop?

Without the sentiment backdrop and timing, I can't tell if you got caught in a genuine repricing or if CT missed the signal entirely. If you share entry time + what was being said about CRCL on X, I can run a quick vibe check and flag whether the loss was a sentiment miss or macro whipsaw.

**Confidence: 0.3** (not enough data to assess).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the entry date, exit date, and what CRCL was pricing at Polymarket during your hold—did the market shift consensus (e.g., macro event, earnings surprise) that broke your thesis, or was this pure liquidation risk on a tight stop? A 1.5% move on 10x is tight; if Poly showed rising conviction on CRCL upside during your hold, that's regime shift; if Poly stayed flat and you got stopped on noise, that's position-sizing (Kelly or volatility-adjusted stops). Without the Polymarket pricing context during your hold, I can't isolate whether this was thesis-breaking or execution friction.

**Confidence: 0.3** (need market-pricing timeline to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold time, IV/vol regime at entry vs exit, and whether this was part of a defined hedge or directional bet. On mechanics alone: 10x leverage on a $118.91 short with a $1.79 stop (1.5% width) is tight—you got stopped in normal intraday noise. For a $7.6K account, that's aggressive sizing; a 2-3% stop would've given the thesis room to breathe. If CRCL was a short vol/mean-reversion play, tighten entry to support, widen stops to 3-5%, and size down by 30-50% on leverage. If it was directional, confirm the invalidation (what price kills the bear case?) before entry next time.

**Confidence: 0.6** — need hold time, thesis type, and vol context to grade the actual

## Root-Cause Tags

- Primary: sizing_too_aggressive
- Secondary: none

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
   - action: A/B test defined-risk structure recommendation vs spot leverage entries.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$114.26, realized=$118.73, slippage=$4.47, breach=true
- Consistency checks: pass

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.
- No automatic policy mutation due to data/quality gate.

## Recursive Policy Delta

- Adaptation eligible: false
- Policy version at entry: baseline
- Proposed delta: none

## Machine-Readable Summary

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.47
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 39,
  "adverseMovePct": 1.509,
  "riskBudget": {
    "plannedRiskUsd": 114.26,
    "realizedRiskUsd": 118.73,
    "riskSlippageUsd": 4.47,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.509,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-16T09:31:21.547Z",
    "exitTimestampUtc": "2026-03-16T10:10:34.411Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-16T09:31:21.547Z",
    "exitTimestampUtc": "2026-03-16T10:10:34.411Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 1.5,
    "maxLossUsd": 114.26,
    "maxLossPct": 15,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
