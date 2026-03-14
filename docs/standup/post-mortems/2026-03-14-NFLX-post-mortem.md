# Post-mortem: NFLX long (max_age)

**Date:** 2026-03-14

## Trade Snapshot

- NFLX long closed max_age: entry $95.28 -> exit $94.96, P&L $-16.12 (4154.989090909091 USD, 5x).
- Entry time (UTC): 2026-03-13T14:05:47.524Z
- Hold window target: intraday
- Max loss budget: $62.32 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.338%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context:** I need to know the trade window (when you entered/exited) and what CT sentiment was saying about NFLX during that period — was the market pricing in earnings risk, macro headwinds, or a specific catalyst? Without the timestamp, I can't tie the loss to a sentiment miss or a macro shift that CT saw coming.

**What I'd check:** Did whale accounts flag NFLX weakness before your entry, or was CT bullish/neutral at entry and sentiment turned after? A 4-point stop-out on 5x suggests tight risk — if CT was already bearish on mega-cap tech into that trade, that's a contrarian signal you might've missed.

**Confidence: 0.3** (not enough data to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the entry/exit timestamps and which Polymarket(s) informed the thesis—was this a hedge against a specific earnings or macro prediction, or a standalone perps play? That said, the $16 loss on a $4.1K position (0.4% drawdown) at 5x suggests tight risk management; the real question is whether NFLX prediction markets signaled mean reversion that didn't materialize, or if this was a directional miss. **If you shorted into a bull regime** (e.g., tech strength in Poly), the loss is regime tax, not edge failure. **If you were long a Poly edge and got stopped**, that's execution timing—ask whether the market repriced your thesis (IV crush, vol crush) or just gapped through your stop. Confidence: 0.4 (need trade thesis and Poly context to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing critical context:** entry/exit timestamps (how long held?), IV regime at entry vs exit, and whether this was a hedge or standalone long. That said: **5x leverage on a $95 stock for a $16 loss suggests tight stop or rapid reversal—if held <1h, you caught a wick; if held longer, position sizing was aggressive relative to realized vol.** For paper bot refinement: log hold duration and compare realized move vs expected move (IV-implied) to separate "bad entry" from "unlucky timing." **Confidence: 0.65** (mechanics sound, but without timestamps I'm pattern-matching, not diagnosing).

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

- Quality score: 89/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$62.32, realized=$16.12, slippage=$-46.20, breach=false
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

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -46.2
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.338,
  "riskBudget": {
    "plannedRiskUsd": 62.32,
    "realizedRiskUsd": 16.12,
    "riskSlippageUsd": -46.2,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.338,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T14:05:47.524Z",
    "exitTimestampUtc": "2026-03-14T02:05:59.304Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T14:05:47.524Z",
    "exitTimestampUtc": "2026-03-14T02:05:59.304Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 62.32,
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
