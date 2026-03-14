# Post-mortem: OPENAI short (max_age)

**Date:** 2026-03-13

## Trade Snapshot

- OPENAI short closed max_age: entry $936.21 -> exit $938.01, P&L $-1.54 (635.5103999999999 USD, 3x).
- Entry time (UTC): 2026-03-13T08:01:40.776Z
- Hold window target: intraday
- Max loss budget: $9.53 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.192%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter/exit (dates/times)? What was CT sentiment on OPENAI at entry vs. exit? Was there a macro event (Fed, tech earnings, AI news spike) between those timestamps?

**On the trade itself:** A $1.80 move on a $936 entry is tight — you got stopped in noise. **Sentiment-wise,** if CT was neutral-to-bullish on AI/OPENAI at entry and stayed that way at exit, a short into bullish macro is fighting the crowd. If sentiment *flipped* bearish between entry and exit, that's the real miss — you didn't catch the sentiment shift early enough.

**What I need to give you a real read:** Entry/exit timestamps + what CT was saying about AI/OPENAI those specific hours.

Confidence: 0.4 (incomplete data).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing critical context:** I need the entry/exit timestamps and the Polymarket odds for OPENAI stock price at those moments to assess whether you were fighting the market's consensus or if the move was a regime shift the market repriced faster than your model. A $1.80 move on a 3x short is tight execution, but without knowing if Poly had priced in that direction already, I can't tell you if this was bad timing vs. a model miss. Pull the OPENAI condition odds at entry and exit—I can then compare to your thesis and tell you if the market telegraphed the move or if you got caught in a whipsaw the desk should've sized differently.

**Confidence: 0.3** (need market data to be useful here).

### Solus

- Lane: options mechanics and sizing
- Confidence: 62%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, exit date, IV at entry/exit, and whether this was a hedge or directional bet. That said, the structure shows 3x leverage on a $635 notional (tiny relative to stack) with a 21-bps loss—the sizing was sound (sub-1% drawdown). The real question: was this a short vol play (sell premium expecting crush) or directional bearish (sell expecting drop)? If vol-based, the loss suggests either IV expanded against you or you held through a volatility spike. If directional, $2 moves on OPENAI are noise—position sizing was right, but the thesis needs clarity. **Confidence: 0.62** (good mechanics, unclear intent).

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
- Risk budget: planned=$9.53, realized=$1.54, slippage=$-7.99, breach=false
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
- PM_RISK_SLIPPAGE_USD: -7.99
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
  "adverseMovePct": 0.192,
  "riskBudget": {
    "plannedRiskUsd": 9.53,
    "realizedRiskUsd": 1.54,
    "riskSlippageUsd": -7.99,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.192,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T08:01:40.776Z",
    "exitTimestampUtc": "2026-03-13T20:02:04.781Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T08:01:40.776Z",
    "exitTimestampUtc": "2026-03-13T20:02:04.781Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 9.53,
    "maxLossPct": 4.5,
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
