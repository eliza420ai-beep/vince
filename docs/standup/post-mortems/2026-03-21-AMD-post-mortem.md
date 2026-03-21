# Post-mortem: AMD long (max_age)

**Date:** 2026-03-21

## Trade Snapshot

- AMD long closed max_age: entry $203.14 -> exit $201.95, P&L $-14.00 (2201.4719999999998 USD, 5x).
- Entry time (UTC): 2026-03-20T13:56:13.739Z
- Hold window target: intraday
- Max loss budget: $82.56 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.586%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter/exit (dates/times)? What was CT sentiment on AMD at entry vs. exit? Was there a macro event (Fed, earnings, sector rotation) that shifted the vibe?

**Sentiment take:** AMD is a HIP-3 play, so macro/rates dominate the narrative over fundamentals on X. If you entered into bullish sentiment and exited into bearish (or neutral flip), that's a classic sentiment fade — not necessarily a bad trade, just timing. Without knowing the CT pulse at your entry/exit, I can't tell if you fought the sentiment or rode it.

**What I'd need to assess:** Exact entry/exit timestamps + a quick X pulse from those windows. Then I can tell you if CT was pricing in the move or if you got caught in a sentiment whipsaw.

Confidence: 0.3 (too much missing data).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing context:** AMD condition_id on Polymarket (if one exists) and your probability estimate at entry vs. the market price then—without that, I can't surface whether you were fighting consensus or if the market repriced against you. **What I can say:** A 65-bps loss on a 5x levered perp over what looks like a short holding period suggests either tight stops (good risk discipline) or quick reversal; Polymarket's AMD derivatives (if liquid) would show whether institutional conviction shifted or if this was just intraday chop. **Next time:** Grab the Poly odds snapshot at entry—if you were betting against >55% consensus, that's a structural headwind worth knowing before scaling leverage. **Confidence: 0.4** (need market regime + your thesis to diagnose).

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** entry timestamp, exit timestamp, funding rate at entry/exit, and what triggered the exit (stop hit, manual close, time-based). On mechanics alone: 5x leverage on a $203 stock with $14 loss = ~$2.2K notional, which is reasonable sizing for a paper trade, but the 0.6% move against you suggests either (1) tight stop placement in a ranging market, or (2) entry timing into consolidation rather than breakout. For future: log entry reason (support bounce, breakout, catalyst) and exit reason (invalidation hit, time decay, better setup elsewhere) so we can pattern-match wins vs losses. **Confidence: 0.4** (too little context to assess if this was bad mechanics or just unlucky execution).

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
- Risk budget: planned=$82.56, realized=$14.00, slippage=$-68.56, breach=false
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
- PM_RISK_SLIPPAGE_USD: -68.56
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
  "holdMinutes": 720,
  "adverseMovePct": 0.586,
  "riskBudget": {
    "plannedRiskUsd": 82.56,
    "realizedRiskUsd": 14,
    "riskSlippageUsd": -68.56,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.586,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T13:56:13.739Z",
    "exitTimestampUtc": "2026-03-21T01:56:17.412Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T13:56:13.739Z",
    "exitTimestampUtc": "2026-03-21T01:56:17.412Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 82.56,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "condition_id"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
