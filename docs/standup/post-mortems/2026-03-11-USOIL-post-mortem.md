# Post-mortem: USOIL long (stop_loss)

**Date:** 2026-03-11

## Trade Snapshot

- USOIL long closed stop_loss: entry $107.83 -> exit $106.10, P&L $-38.10 (2300.844 USD, 5x).
- Entry time (UTC): 2026-03-11T16:04:18.422Z
- Hold window target: intraday
- Max loss budget: $34.51 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 59 minutes
- Adverse move: 1.606%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** Did CT have a bearish macro pulse on energy/USD strength going into this? Was there a geopolitical risk-off or Fed hawkish signal that week? Without the sentiment backdrop (was this a contrarian fade or with-the-crowd trade?), I can't assess whether the thesis was sound but timing was off, or if sentiment missed a macro shift. **What I need:** The entry date and CT's vibe on energy/macro that day — then I can tell you if sentiment was pricing in the move or if you got blindsided by a narrative shift.

Confidence: 0.3 (incomplete signal).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: lane_coverage_gap

That's outside my lane—oil futures regime and perp mechanics sit with you. What I can offer: if you want to cross-check the macro sentiment (geopolitical risk, supply shock priced in), I can pull active Polymarket odds on OPEC cuts, Middle East escalation, or recession timing to see if the market's baseline shifted while you were in the trade. Missing context I'd need: entry thesis (technical, macro, carry?), timeframe, and whether you're asking about the stop placement or the underlying regime call. 

**Confidence: 0.3** (this is your domain; I'm just offering a sentiment cross-check if useful).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation (what price/signal would have told you to exit before stop)? And your position sizing rationale—was 5x leverage intentional for USOIL, or did it drift?

**On structure:** Stop at $106.10 on a $107.83 entry is tight (~1.6% risk)—reasonable for a mean-revert play, but USOIL's daily vol can whip through that in one candle. If this was a directional short-term trade, the stop placement was sound; if it was a swing hold, 5x leverage + tight stop = you're fighting vol instead of riding thesis. The loss itself ($38 notional, $2.3K on 5x) is within acceptable variance for a single trade—the real question is whether this fits your paper bot's edge or was just unlucky execution.

**Confidence:

## Root-Cause Tags

- Primary: agent_lane_mismatch
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

- Quality score: 75/100
- Escalate to Sentinel: true
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: unclear
- Risk budget: planned=$34.51, realized=$38.10, slippage=$3.59, breach=true
- Consistency checks: fail (truncated_agent_findings)

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

- PM_QUALITY_SCORE: 75
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: agent_lane_mismatch
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 3.59
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 75,
  "qualityEscalate": true,
  "primaryCause": "agent_lane_mismatch",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 59,
  "adverseMovePct": 1.606,
  "riskBudget": {
    "plannedRiskUsd": 34.51,
    "realizedRiskUsd": 38.1,
    "riskSlippageUsd": 3.59,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": false,
    "issues": [
      "truncated_agent_findings"
    ],
    "adverseMovePctFromPrices": 1.606,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": true
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T16:04:18.422Z",
    "exitTimestampUtc": "2026-03-11T17:02:48.494Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T16:04:18.422Z",
    "exitTimestampUtc": "2026-03-11T17:02:48.494Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 34.51,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "lane_coverage_gap"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "unclear"
}
```
