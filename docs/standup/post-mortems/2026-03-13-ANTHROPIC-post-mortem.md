# Post-mortem: ANTHROPIC long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- ANTHROPIC long closed stop_loss: entry $660.03 -> exit $645.46, P&L $-75.77 (3356.0640000000003 USD, 3x).
- Entry time (UTC): 2026-03-13T13:31:24.452Z
- Hold window target: intraday
- Max loss budget: $50.34 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 539 minutes
- Adverse move: 2.208%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** Did CT have a bearish or bullish lean on ANTHROPIC going into this trade? Was there a macro headwind (rates, tech selloff, AI narrative shift) that shifted sentiment mid-trade? Without knowing what the sentiment setup was vs. what actually happened, I can't give you real feedback—I'd just be guessing at post-hoc narrative.

**What I need:** The entry thesis (what CT was saying then), the exit trigger (what changed in sentiment/macro), and whether you were trading *with* or *against* the crowd. Then I can tell you if this was a sentiment mispricing that played out as expected or a sentiment whipsaw you should've caught.

**Confidence: 0.3** (can't assess without the sentiment angle).

### Oracle

- Lane: prediction market regime
- Confidence: 65%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** trade date, duration held, and what drove the stop (volatility spike vs. directional move). That said: if ANTHROPIC was trading near fair value when you entered, a $14.57 drawdown on a $660 entry (2.2%) suggests the market repriced sentiment faster than your thesis developed—typical in low-liquidity perp pairs where retail positioning can swing hard. The 3x leverage amplified that friction into a full stop. Check whether Polymarket's ANTHROPIC prediction markets (if live) showed any overnight shift in edge that would've signaled the move; if they stayed flat while perps dumped, you had a regime mismatch between synthetic and spot demand.

**Confidence: 0.65** (no trade timestamp or orderbook context limits precision).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** position duration (hold time), IV environment at entry/exit, why 3x leverage on a stock name (outside our HIP-3 onchain focus), and whether this was a hedge or directional bet. On mechanics: 3x on $660 entry with a $14.57 stop (2.2% width) is tight—suggest wider stops (4-6%) or lower leverage for equity volatility. The loss itself ($75.77 notional) is small; the real question is whether the leverage/stop ratio matches your edge. If this was a test trade, tighten the thesis first, then size.

**Confidence: 0.6** (missing trade intent and hold duration).

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
- Risk budget: planned=$50.34, realized=$75.77, slippage=$25.43, breach=true
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
- PM_RISK_SLIPPAGE_USD: 25.43
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
  "holdMinutes": 539,
  "adverseMovePct": 2.208,
  "riskBudget": {
    "plannedRiskUsd": 50.34,
    "realizedRiskUsd": 75.77,
    "riskSlippageUsd": 25.43,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 2.208,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T13:31:24.452Z",
    "exitTimestampUtc": "2026-03-13T22:30:08.620Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T13:31:24.452Z",
    "exitTimestampUtc": "2026-03-13T22:30:08.620Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 50.34,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
