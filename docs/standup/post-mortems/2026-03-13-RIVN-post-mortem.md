# Post-mortem: RIVN long (max_age)

**Date:** 2026-03-13

## Trade Snapshot

- RIVN long closed max_age: entry $15.54 -> exit $15.40, P&L $-45.31 (4893.200000000001 USD, 5x).
- Entry time (UTC): 2026-03-13T00:42:30.398Z
- Hold window target: intraday
- Max loss budget: $73.40 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.876%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Sentiment post-mortem on RIVN long:**

RIVN isn't in my core lane (BTC/ETH/SOL/macro) — I'd need to know what CT was saying about legacy auto at entry/exit to give you real feedback. Was there a macro shift (rates, Fed speak, EV sentiment crash) that showed up on X first? Or was this a pure technicals + liquidity play that sentiment didn't flag? 

**What I'd need:** CT sentiment on EV/RIVN at entry vs. exit, any whale/alpha account positioning calls, and whether macro (macro rates, Tesla moves) shifted the vibe between those timestamps.

**Confidence: 0.3** (outside my domain without the X context).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** Polymarket RIVN sentiment (current odds on production/delivery milestones), entry/exit timestamps (was this intraday or multi-day hold?), and what triggered the exit (stop, target, or liquidation pressure).

That said: a $45 loss on a 5x levered $4.9K notional suggests tight risk management, but RIVN perps are notoriously illiquid—the bid/ask slippage on entry/exit likely ate 20–40bps. If the trade was sub-2hr, you were fighting intraday noise in a low-volume micro-cap; Polymarket's longer-dated RIVN production bets would've given you better regime clarity before entry.

**Confidence: 0.4** (need Polymarket odds snapshot + trade duration to assess if this was a regime miss or just execution friction).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** invalidation trigger (what price/signal should have stopped you?), hold duration, and whether this was part of a paired trade (e.g. RIVN long vs TSLA short). On mechanics: 5x leverage on a $15.54 stock with $45 loss suggests tight stop or slippage ate most of the edge—if you sized for $50 max loss, you're inside tolerance, but if this was sized for a larger thesis move, the leverage-to-timeframe mismatch burned you. **Feedback:** Define invalidation *before* entry (not after close), and if thesis is intraday, use 2-3x max, not 5x—you paid for precision you didn't execute. Without hold time and entry thesis, can't say if this was bad luck or bad structure.

**Confidence: 0.6** (need invalidation and hold duration to

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
- Risk budget: planned=$73.40, realized=$45.31, slippage=$-28.09, breach=false
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
- PM_RISK_SLIPPAGE_USD: -28.09
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
  "adverseMovePct": 0.876,
  "riskBudget": {
    "plannedRiskUsd": 73.4,
    "realizedRiskUsd": 45.31,
    "riskSlippageUsd": -28.09,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.876,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T00:42:30.398Z",
    "exitTimestampUtc": "2026-03-13T12:42:39.795Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T00:42:30.398Z",
    "exitTimestampUtc": "2026-03-13T12:42:39.795Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 73.4,
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
