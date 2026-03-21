# Post-mortem: NFLX short (max_age)

**Date:** 2026-03-20

## Trade Snapshot

- NFLX short closed max_age: entry $91.38 -> exit $92.37, P&L $-24.31 (2150.4 USD, 5x).
- Entry time (UTC): 2026-03-20T11:01:34.542Z
- Hold window target: intraday
- Max loss budget: $80.64 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 1.08%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: lane_coverage_gap

**Missing key context:** Did CT have a bullish or bearish lean on NFLX going into this trade? Was there macro headwind (Fed, rates, tech rotation) that reversed during your hold? The $1 move against you feels like a momentum flip rather than a setup failure — I'd need X sentiment on NFLX + tech sector vibe at entry/exit to tell you if this was a "CT got it wrong" vs. a "macro regime shift caught you." 

Without that, I can't give you real feedback — just guesses. 

**Confidence: 0.2** (I'm outside my lane without the sentiment snapshot.)

---

**What I'd need to give you solid post-mortem:**
- CT sentiment on NFLX at entry (bullish/bearish %)
- Macro pulse at entry vs. exit (tech sector, rates, macro news)
-

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was your entry thesis (earnings surprise, subscriber miss, macro pivot)? Did Polymarket pricing on NFLX fundamentals (earnings beat/miss, sub growth) shift during your hold, and if so, by how much? Without the original conviction driver and how market consensus moved, I can't isolate whether this was a regime miss (you were right on direction but timing was off) or a probability repricing you didn't anticipate.

**What I can say:** A 1% move against you on 5x leverage ($24.31 loss on ~$2150) is tight—suggests you got shaken by noise or the market had conviction you didn't. If Polymarket odds on the underlying catalyst (e.g., "NFLX beats earnings by >15%") stayed flat while spot moved, that's a regime signal: micro vol spike with no macro repricing = get out. If odds

### Solus

- Lane: options mechanics and sizing
- Confidence: 70%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, exit date, IV at entry/exit, and reason for close (stop hit, time decay, thesis change?). That said, structurally: **5x leverage on a $91 short with a $0.99 stop (1.08% risk) is tight for NFLX's typical daily move**—you got shaken out. If this was a 1-2 day hold, the leverage-to-timeframe mismatch killed you; if longer, the stop was too close to noise. Going forward: either widen the stop (accept larger notional loss, lower leverage), or drop leverage to 2-3x for intraday/swing on high-beta names like NFLX. **Confidence: 0.7** (structure issue is clear, but without dates/IV I can't assess if it was a volatility trap or execution timing problem).

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
- Risk budget: planned=$80.64, realized=$24.31, slippage=$-56.33, breach=false
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
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -56.33
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
  "holdMinutes": 720,
  "adverseMovePct": 1.08,
  "riskBudget": {
    "plannedRiskUsd": 80.64,
    "realizedRiskUsd": 24.31,
    "riskSlippageUsd": -56.33,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.08,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T11:01:34.542Z",
    "exitTimestampUtc": "2026-03-20T23:01:46.132Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:01:34.542Z",
    "exitTimestampUtc": "2026-03-20T23:01:46.132Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 80.64,
    "maxLossPct": 18.75,
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
