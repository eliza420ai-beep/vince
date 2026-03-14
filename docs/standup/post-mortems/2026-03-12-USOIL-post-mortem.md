# Post-mortem: USOIL long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- USOIL long closed stop_loss: entry $120.37 -> exit $118.08, P&L $-81.47 (4165.737931034483 USD, 5x).
- Entry time (UTC): 2026-03-12T22:20:28.907Z
- Hold window target: intraday
- Max loss budget: $62.49 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 13 minutes
- Adverse move: 1.906%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on energy/macro at entry vs. exit? Was there a geopolitical shock or Fed move that shifted the macro vibe? 

**Without that:** I can't tell if you fought against CT consensus (bearish energy) or if sentiment flipped mid-trade. USOIL is macro-driven — if CT was already pricing in a demand slowdown, the stop was tight for the regime.

**What I need:** Entry timestamp + what CT was saying about inflation/Fed/recession at that moment. Then I can tell you if sentiment was your headwind or if execution/sizing was the issue.

Confidence: 0.3 (not enough data to assess sentiment's role in the loss)

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need the trade date/time, the Polymarket odds for USOIL price direction at entry, and whether you were hedging a specific options position or running pure directional momentum. That said: crude's been range-bound with geopolitical vol spikes—a 2.3% stop on 5x is tight for that regime, and if Poly was pricing >55% for down-moves, the risk/reward was already skewed against you. The real question is whether this was a paper-bot execution miss (entry timing) or a regime call that missed the signal. 

**Confidence: 0.3** (need trade timestamp + Poly context to isolate the miss).

### Solus

- Lane: options mechanics and sizing
- Confidence: 35%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, IV/vol regime at entry vs exit, and whether this was a directional bet or hedge against another position. On mechanics alone: 5x leverage on USOIL (commodity futures proxy, high beta) with a $81.47 stop (1.9% from entry) is tight for intraday noise—if you held <4h, you likely got shaken out by normal volatility before the move resolved. If this was a longer hold (24h+), the stop was reasonable but the leverage/notional ($4.1K on $100K stack) suggests you were sizing for a high-conviction call that didn't pan out—that's fine, but confirm the thesis was actually invalidated (not just time decay or noise). **Confidence: 0.35** (need trade duration, conviction level, and whether USOIL was correlated to a macro event you

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
- Risk budget: planned=$62.49, realized=$81.47, slippage=$18.98, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 18.98
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
  "holdMinutes": 13,
  "adverseMovePct": 1.906,
  "riskBudget": {
    "plannedRiskUsd": 62.49,
    "realizedRiskUsd": 81.47,
    "riskSlippageUsd": 18.98,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.906,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T22:20:28.907Z",
    "exitTimestampUtc": "2026-03-12T22:33:54.094Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T22:20:28.907Z",
    "exitTimestampUtc": "2026-03-12T22:33:54.094Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 62.49,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
