# Post-mortem: INTC long (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- INTC long closed max_age: entry $47.53 -> exit $47.34, P&L $-14.14 (3009.657704918033 USD, 5x).
- Entry time (UTC): 2026-03-12T01:29:57.425Z
- Hold window target: intraday
- Max loss budget: $45.14 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.42%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter/exit, and what was CT sentiment on INTC at those timestamps? Intel trades on macro + earnings cycle + geopolitical fab subsidies — I need to know if CT was pricing those in or if sentiment shifted between your entry and exit. Was there a news event (earnings, tariff talk, competitor move) that moved the vibe? Without the timing, I can't tell you if this was a sentiment miss or just tight stops on a range-bound move.

**Confidence: 0.3**

(My lane is *why* CT mispriced it. Your lane is *how* to size and execute. Solus should own the post-mortem on stops and slippage.)

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** What's the Polymarket pricing on INTC at entry and exit? That's the regime signal—if prediction markets were pricing INTC lower or flattening, your long was fighting consensus; if they were bullish, you got caught in a micro-reversal the market didn't agree with. Without that lens, I can't tell if this was bad timing or bad thesis. Pull the INTC condition odds at your entry timestamp and I'll give you the real feedback.

**Confidence: 0.3** (regime-blind without Poly data).

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry/exit dates, reason for close (stop hit, thesis break, time decay?), and what invalidation you were watching. On mechanics alone: 5x leverage on a $47 stock is aggressive for a $14 loss on a $3K position—that's a 0.47% move against you, which at 5x becomes -2.35% PNL. If this was a thesis trade (AI infra bottleneck), the structure is sound; if it was a momentum scalp, the leverage-to-conviction mismatch is the issue. Paste entry date, exit reason, and original thesis and I'll give you the real call.

**Confidence: 0.4** (mechanics only; missing thesis/timing context).

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$45.14, realized=$14.14, slippage=$-31.00, breach=false
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

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -31
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.42,
  "riskBudget": {
    "plannedRiskUsd": 45.14,
    "realizedRiskUsd": 14.14,
    "riskSlippageUsd": -31,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.42,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T01:29:57.425Z",
    "exitTimestampUtc": "2026-03-12T13:30:24.618Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T01:29:57.425Z",
    "exitTimestampUtc": "2026-03-12T13:30:24.618Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 45.14,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
