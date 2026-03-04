# Post-mortem: CRCL long (stop_loss)

**Date:** 2026-03-04

## Trade Snapshot

- CRCL long closed stop_loss: entry $104.73 -> exit $102.96, P&L $-142.69 (8195.876288659794 USD, 5x).
- Entry time (UTC): 2026-03-04T11:47:20.636Z
- Hold window target: intraday
- Max loss budget: $122.94 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 19 minutes
- Adverse move: 1.691%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: lane_coverage_gap

**Missing context:** Did CT have conviction on CRCL at entry, or was this a low-sentiment play? Was the stop hit on macro dump (BTC/ETH weakness), or isolated CRCL selling? Without knowing the sentiment backdrop and whether macro betrayed you, I can't tell if this was a signal failure or just bad timing. 

**What I need:** X pulse on CRCL sentiment at entry time, and whether BTC/ETH were dumping when you got stopped.

Confidence: 0.3

(This one's outside my lane without the sentiment data — **ASK_AGENT Solus** for sizing/execution feedback, **ASK_AGENT Vince** for macro context at entry time.)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the trade date, the CRCL prediction-market price at entry/exit, and whether this was a perps or spot trade—that tells me if you were fighting Polymarket consensus or if the market repriced faster than the underlying moved.

**If perps:** A $1.77 move (1.7%) on 5x leverage is a tight stop; check if CRCL had a Polymarket event (earnings, catalyst) that repriced during your hold—prediction markets often front-run spot by hours. **If spot:** The loss is small relative to size, which is good risk management; without the market context, I can't tell if you were early (regime shift) or just unlucky on timing.

**What I'd pull:** Live CRCL Polymarket odds (if a market exists) and the orderbook depth at your entry price—that shows whether liquidity dried

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** What was the thesis invalidation trigger (news, chart break, funding spike)? Was this a solo CRCL trade or part of a broader AI infra hedge? 

**On structure:** $8.2K notional on a $100K stack at 5x is reasonable sizing (~8% risk), but the stop at –1.7% is tight for a leverage trade—you're getting shaken out on noise. For paper bot validation, tighter stops are fine; for live execution, you'd want 2–3% minimum buffer unless the invalidation is explicit and hit.

**Next:** Log the exact invalidation trigger (what made you pull the plug?) so we know if this was discipline or whipsaw. If whipsaw, widen stops or reduce leverage; if discipline, log it and move on.

**Confidence: 0.6** (mechanics clear, thesis context missing).

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: unclear
- Risk budget: planned=$122.94, realized=$142.69, slippage=$19.75, breach=true
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
- PM_PRIMARY_CAUSE: agent_lane_mismatch
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 19.75
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "agent_lane_mismatch",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 19,
  "adverseMovePct": 1.691,
  "riskBudget": {
    "plannedRiskUsd": 122.94,
    "realizedRiskUsd": 142.69,
    "riskSlippageUsd": 19.75,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.691,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-04T11:47:20.636Z",
    "exitTimestampUtc": "2026-03-04T12:06:32.594Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-04T11:47:20.636Z",
    "exitTimestampUtc": "2026-03-04T12:06:32.594Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 122.94,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "lane_coverage_gap"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "unclear"
}
```
