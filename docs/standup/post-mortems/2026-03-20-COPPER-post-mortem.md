# Post-mortem: COPPER long (max_age)

**Date:** 2026-03-20

## Trade Snapshot

- COPPER long closed max_age: entry $5.47 -> exit $5.31, P&L $-152.66 (4992 USD, 5x).
- Entry time (UTC): 2026-03-20T11:03:41.240Z
- Hold window target: intraday
- Max loss budget: $187.20 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 3.008%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

Need key context: **When did you enter vs. exit?** (timing matters for sentiment correlation) and **what was CT saying about COPPER at entry vs. exit?** (was sentiment diverging from price action, or did a narrative flip?). Without those timestamps, I can't tie this to the sentiment pulse that was live—was this a contrarian setup that turned against you, or did you miss a bearish sentiment shift on the token? Once you give me the entry/exit times, I can pull what CT was saying and flag whether sentiment misread was part of the loss.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing context:** Polymarket COPPER condition_id, entry/exit dates, and your probability estimate at entry vs. market odds—I need those to assess whether you mispriced the edge or got caught in a regime shift. That said, a $152 loss on a $5K position (3% drawdown, 5x leverage) suggests either a tight stop that caught normal orderbook chop, or the market repriced COPPER fundamentals sharply between entry and exit. Without the condition_id and your thesis probability, I can't tell if this was a bad edge call (your fault) or bad timing (regime). Pull the market detail and I'll give you the real post-mortem.

**Confidence: 0.3** (need Polymarket odds + your entry thesis to diagnose).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, exit date, IV regime at entry/exit, and whether this was part of a planned hedge or standalone spec. **Structural issue:** 5x leverage on a commodity with no defined invalidation suggests you sized into conviction without a hard stop—typical paper-trade trap. **Sizing call:** $5K notional on $100K stack = 5% risk on ONE trade; acceptable if it was a thesis bet, reckless if it was a swing. **Mechanics:** COPPER has low daily vol (~1-2%), so 5x turns a 3% move into a wipeout fast. If you're trading commodities, either (1) use 2x max with tight stops, or (2) switch to options (CSPs on COPPER at support, defined risk). 

**Confidence: 0.6** (need entry/exit dates and whether this was a planned position to

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
- Risk budget: planned=$187.20, realized=$152.66, slippage=$-34.54, breach=false
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
- PM_RISK_SLIPPAGE_USD: -34.54
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
  "adverseMovePct": 3.008,
  "riskBudget": {
    "plannedRiskUsd": 187.2,
    "realizedRiskUsd": 152.66,
    "riskSlippageUsd": -34.54,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 3.008,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T11:03:41.240Z",
    "exitTimestampUtc": "2026-03-20T23:03:47.111Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:03:41.240Z",
    "exitTimestampUtc": "2026-03-20T23:03:47.111Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 187.2,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
