# Post-mortem: META long (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- META long closed stop_loss: entry $664.17 -> exit $653.94, P&L $-82.21 (5168.297142857143 USD, 5x).
- Entry time (UTC): 2026-03-05T11:33:12.986Z
- Hold window target: intraday
- Max loss budget: $77.52 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 360 minutes
- Adverse move: 1.541%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on META at entry vs. exit? Was this a macro fade (rates/tech rotation) or a specific META narrative collapse?

**On the trade itself:** A 1.5% stop on a 5x is tight for paper—if CT was mixed-to-bearish on META going in, that's a headwind you were fighting. Without the sentiment snapshot at entry, I can't tell if you got caught in a broader tech dump or if META-specific bearish chatter (earnings, antitrust, ad spend concerns) killed the thesis.

**What I need:** Entry timestamp + what CT was saying about META/tech at that moment. Then I can tell you if sentiment was a tailwind or a red flag you missed.

Confidence: 0.3 (can't assess without timing and CT vibe at entry).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

Missing context: META's Polymarket odds at entry and exit (did the market price the risk you took?), and what macro/event drove the stop—was it a broader tech sell or META-specific? That said: a $5.2K loss on a $664 entry with 5x leverage is a sharp drawdown, suggesting either tight stops in choppy price action or a regime shift you didn't anticipate. Without the Poly odds snapshot, I can't say if you were fighting market consensus or if the market repriced against you post-entry. Pull the condition_id for META prediction markets around your entry time and I can check if the market was pricing in downside risk you missed.

**Confidence: 0.4** (need Polymarket context to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, IV/vol regime at entry vs exit, and whether this was a hedge or directional core. On mechanics alone: 1.6% stop loss on a 5x levered equity trade is tight—typical for scalps, risky for thesis trades. If this was a multi-day hold, the stop should've been wider (2-3%) or you should've sized down (2-3x instead of 5x). **Call:** Post the hold duration and original thesis; that tells us if the structure was wrong or just unlucky execution.

**Confidence: 0.4** (need thesis + duration to assess structure vs luck).

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
- Risk budget: planned=$77.52, realized=$82.21, slippage=$4.69, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.69
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
  "holdMinutes": 360,
  "adverseMovePct": 1.541,
  "riskBudget": {
    "plannedRiskUsd": 77.52,
    "realizedRiskUsd": 82.21,
    "riskSlippageUsd": 4.69,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.541,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T11:33:12.986Z",
    "exitTimestampUtc": "2026-03-05T17:33:28.651Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T11:33:12.986Z",
    "exitTimestampUtc": "2026-03-05T17:33:28.651Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 77.52,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
