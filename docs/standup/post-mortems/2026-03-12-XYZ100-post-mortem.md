# Post-mortem: XYZ100 short (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- XYZ100 short closed max_age: entry $24801.04 -> exit $24832.00, P&L $-2.47 (1411.1999999999998 USD, 5x).
- Entry time (UTC): 2026-03-11T23:12:48.723Z
- Hold window target: intraday
- Max loss budget: $21.17 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.125%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

I need the **exact entry/exit timestamps** and **what CT sentiment was saying at those moments** — did you short into FOMO, capitulation, or a genuine reversal signal? Without knowing if sentiment was extreme bullish (your edge) or already turning, I can't tell if this was a sentiment-read miss or just unlucky timing on a 1% move. Also: **was there a macro catalyst or news event** between entry and exit that shifted the vibe? A $31 loss on 5x is tight, but the real feedback depends on whether you fought the sentiment or read it wrong.

**Confidence: 0.3** (missing critical context)

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id, market_name

I need the **condition_id** and **market close date** to pull live Polymarket odds at entry/exit and compare to your spot price move—that's the regime signal. Without it, I can only note: a $31 move on BTC spot (0.12%) with 5x leverage = $155 notional loss on $31 gross move, which tracks; but the *why* (was Poly pricing a retest lower? did sentiment flip?) is invisible to me. **Missing:** entry/exit timestamps, which Polymarket(s) you were hedging against, and whether this was a directional bet or basis trade. If you paste the market name or condition_id, I can tell you if Poly was pricing the move and you got caught on the wrong side of consensus.

**Confidence: 0.3** (too much missing context).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, exit date, and reason for close (stop hit, time-based, discretionary). That said—**sizing mechanic issue:** $1,411 loss on a $24.8K notional (5x) means you took 5.7% drawdown on a single trade; at 5x leverage, that's a ~1.1% move against you. For paper bot validation, that's acceptable noise, but **you need a defined max loss per trade (suggest 0.5–1% notional pre-leverage) and a time-stop rule** (e.g., close if thesis breaks or >3 days old). **Structure call:** If this was a directional short on XYZ100 (index), consider sizing down or requiring a catalyst/invalidation trigger before entry next time—indices are harder to time than spot assets. What was the thesis, and did it break or did

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

- Quality score: 77/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$21.17, realized=$2.47, slippage=$-18.70, breach=false
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

- PM_QUALITY_SCORE: 77
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -18.7
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 77,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.125,
  "riskBudget": {
    "plannedRiskUsd": 21.17,
    "realizedRiskUsd": 2.47,
    "riskSlippageUsd": -18.7,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.125,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T23:12:48.723Z",
    "exitTimestampUtc": "2026-03-12T11:12:58.070Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T23:12:48.723Z",
    "exitTimestampUtc": "2026-03-12T11:12:58.070Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 21.17,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp",
      "condition_id",
      "market_name"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
