# Post-mortem: MAG7 long (max_age)

**Date:** 2026-03-05

## Trade Snapshot

- MAG7 long closed max_age: entry $62.26 -> exit $62.23, P&L $-3.82 (3738.5855999999994 USD, 5x).
- Entry time (UTC): 2026-03-05T01:25:13.298Z
- Hold window target: intraday
- Max loss budget: $56.08 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 819 minutes
- Adverse move: 0.052%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (timestamps)? What was CT sentiment on MAG7 at entry and exit? Without the timing and X vibe, I can't tell if you got caught in a micro-reversal vs. a broader sentiment shift.

**That said:** $3.82 loss on a $62 entry is noise-level slippage on a 5x levered trade—if sentiment was stable, this reads like execution timing rather than a thesis miss. If CT flipped bearish between entry/exit, that's the real lesson: sentiment can turn fast on mega-cap tech, and leverage amplifies it.

**What I need:** Entry/exit timestamps + what was the CT macro vibe on MAG7 those hours?

Confidence: 0.3 (incomplete data)

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** What's the Polymarket odds on MAG7 (or equivalent tech mega-cap basket) at entry and exit? Without that, I can't tell if you were fighting a consensus shift or just caught a micro-reversion.

**Raw take:** $3.82 loss on a 5x levered position is tight—you got stopped or shaken out on noise, not a regime break. If Polymarket had tech strength priced in at entry and didn't shift at exit, this is a liquidity tax, not a signal failure. If Poly *did* shift lower between those timestamps, you were early and the market repriced risk—that's a different postmortem.

**What I need:** Polymarket odds (tech/MAG7 proxy) at entry and exit, and whether you had a hard stop or were manually exited.

Confidence: 0.4 (without odds

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing:** entry date, hold duration, and why you exited (stop hit, time decay, rebalance signal?). On mechanics alone: $3.7K loss on a $62 stock at 5x leverage over what looks like a tick move suggests either (1) slippage on entry/exit ate the edge, or (2) you're testing fills on illiquid hours—both fixable. If this was a 1–2 hour hold, you're fighting bid-ask spread; if longer, the move doesn't justify leverage. **Call:** Paper trades on MAG7 should either be larger notional (to absorb slippage) or lower leverage until you prove consistent entry timing. Paste hold duration and exit reason and I'll refine.

**Confidence: 0.4** (structure unclear without timestamps).

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

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$56.08, realized=$3.82, slippage=$-52.26, breach=false
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
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -52.26
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
  "holdMinutes": 819,
  "adverseMovePct": 0.052,
  "riskBudget": {
    "plannedRiskUsd": 56.08,
    "realizedRiskUsd": 3.82,
    "riskSlippageUsd": -52.26,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.052,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T01:25:13.298Z",
    "exitTimestampUtc": "2026-03-05T15:04:27.081Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T01:25:13.298Z",
    "exitTimestampUtc": "2026-03-05T15:04:27.081Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 56.08,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
