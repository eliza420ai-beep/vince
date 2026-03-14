# Post-mortem: SNDK long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- SNDK long closed stop_loss: entry $645.79 -> exit $634.26, P&L $-36.46 (1986.3756455696198 USD, 5x).
- Entry time (UTC): 2026-03-13T13:55:47.179Z
- Hold window target: intraday
- Max loss budget: $29.80 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 41 minutes
- Adverse move: 1.785%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter vs. exit (dates/times)? What was CT sentiment on SNDK during entry and exit? Was there a macro/news driver that flipped sentiment between those points?

**On the loss itself:** If you entered into bullish SNDK sentiment and exited into bearish flip, that's a sentiment trade gone wrong — worth checking if CT saw a catalyst you missed (earnings miss, insider selling, sector rotation). If sentiment stayed consistent and price just bled, that's a liquidity/technicals miss, not my lane.

**What I need to audit this properly:** X posts/threads on SNDK from your entry → exit window, and whether whale accounts were rotating out.

Confidence: 0.3 (can't assess without the sentiment timeline).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing critical context:** I need the trade date, the relevant Polymarket odds for SNDK around entry/exit, and what regime signal (macro, earnings, sector) triggered the long. Without those, I can't assess whether the stop was right-sized or the market repriced fundamentals vs. sentiment shift.

**What I can say:** A 1.7% loss on 5x is a clean stop execution—the real question is whether Polymarket's pricing on SNDK-related outcomes (earnings beat, sector rotation, etc.) showed deterioration *before* your exit, signaling the regime had shifted. If Poly was still pricing upside while you got stopped, that's a timing miss; if Poly had already repriced down, your stop was well-calibrated to market reality.

**Next time:** Pull the Polymarket condition_id for SNDK outcomes around your entry date—I can cross that against

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, exit date, market regime (was semis rallying or rolling over?), and whether this was part of a pair trade or standalone. That said, the mechanics issue is clear—5x leverage on a $645 entry with a $11.53 stop (1.8% cushion) is tight for a volatile semi like SNDK; you got shaken out. For paper trades proving edge, tighter stops teach discipline, but if this was meant to test a thesis, the leverage-to-stop ratio suggests you were sizing for a scalp, not a swing. Next time: either widen the stop to match your conviction window (3-5% for semis in normal vol), or reduce leverage to match the stop. What was the original thesis invalidation?

**Confidence: 0.6** (structure clear, but missing trade context limits the post-mortem depth).

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$29.80, realized=$36.46, slippage=$6.66, breach=true
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

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 6.66
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 41,
  "adverseMovePct": 1.785,
  "riskBudget": {
    "plannedRiskUsd": 29.8,
    "realizedRiskUsd": 36.46,
    "riskSlippageUsd": 6.66,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.785,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T13:55:47.179Z",
    "exitTimestampUtc": "2026-03-13T14:37:14.207Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T13:55:47.179Z",
    "exitTimestampUtc": "2026-03-13T14:37:14.207Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 29.8,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
