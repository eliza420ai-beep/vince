# Post-mortem: GOOGL short (max_age)

**Date:** 2026-03-06

## Trade Snapshot

- GOOGL short closed max_age: entry $300.76 -> exit $301.62, P&L $-6.47 (1924.6265741851362 USD, 5x).
- Entry time (UTC): 2026-03-05T15:05:10.704Z
- Hold window target: intraday
- Max loss budget: $28.87 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.286%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit? Did CT sentiment shift during the hold, or was this a pre-existing bearish thesis that didn't pan out? Was there macro news (Fed, jobs, rate expectations) that moved the needle?

**On the trade itself:** GOOGL shorts are inherently contrarian to CT's AI/mega-cap bullishness — that's a structural headwind. If you entered when CT was already deep in "Magnificent Seven" territory, you were fighting sentiment gravity. Next time, flag the sentiment backdrop upfront so we can calibrate risk or wait for a sentiment flip.

**Confidence: 0.6** — I need entry/exit timestamps and what CT was saying in that window to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing context: entry/exit timestamps, market regime (trend/mean-revert), and whether this was tied to a Polymarket GOOGL event (earnings, antitrust ruling, etc.). The $0.86 move against a 5x short is a typical whipsaw in low-conviction chop—did your edge signal flip, or did price just mean-revert into resistance? If there's a live Poly market on GOOGL fundamentals, I can check whether the market repriced between your entry and exit; that would tell us if you got caught in a vol spike vs. a regime shift. **Confidence: 0.3** (need timestamps and what triggered the short).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** Entry date, exit date, IV environment, and whether this was part of a planned hedge or standalone directional bet. That said: **5x leverage on a $300 stock for a $6.86 move (2.3%) is tight-margin execution—you needed either tighter stops or a longer hold window.** The sizing was aggressive relative to the move; on paper, that's fine for learning, but live you'd want either (1) half the leverage + same conviction, or (2) same leverage + thesis with multi-day runway. **For next time: paste entry/exit timestamps and what triggered the close—was it a stop, or did conviction shift?** That tells me if it's a mechanics issue (sizing) or a signal issue (entry timing).

**Confidence: 0.65** (missing dates and trigger make this provisional feedback).

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
- Risk budget: planned=$28.87, realized=$6.47, slippage=$-22.40, breach=false
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
- PM_RISK_SLIPPAGE_USD: -22.4
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
  "adverseMovePct": 0.286,
  "riskBudget": {
    "plannedRiskUsd": 28.87,
    "realizedRiskUsd": 6.47,
    "riskSlippageUsd": -22.4,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.286,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T15:05:10.704Z",
    "exitTimestampUtc": "2026-03-06T03:05:32.230Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T15:05:10.704Z",
    "exitTimestampUtc": "2026-03-06T03:05:32.230Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 28.87,
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
