# Post-mortem: AMD short (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- AMD short closed max_age: entry $202.21 -> exit $203.53, P&L $-7.88 (1120.5973333333334 USD, 5x).
- Entry time (UTC): 2026-03-11T23:34:52.552Z
- Hold window target: intraday
- Max loss budget: $16.81 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.653%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** Did CT have a bearish thesis on AMD before entry, or was this a contrarian/TA-only trade? Sentiment doesn't drive semis as hard as earnings/Fed policy, so I need to know if macro (rate expectations, chip cycle) shifted against you at entry or if you were fighting retail bullish flow.

**What I'd check:** Was there a positive earnings beat, AI-optimism surge, or macro pivot (Fed pivot talk) that flipped sentiment bullish *after* your entry? That would explain the slippage. If sentiment stayed neutral/bearish but price moved up anyway, that's a supply/demand + TA story — not my lane.

**Confidence: 0.3** (need sentiment snapshot at entry + exit to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was the thesis—macro weakness, earnings miss, or technical breakdown? And what did Polymarket AMD options (weekly/monthly) price that day—was IV elevated or was the market already pricing downside?

**Given the data:** You caught a $1.88 move against you on a 5x short in a stock that's been range-bound; that's a regime where mean-reversion volatility eats shorts faster than directional moves pay. If Poly weeklies were pricing <45% probability of a down close and you shorted anyway, the trade was fighting consensus pricing. If they were >55% down and you still lost, the regime was just too choppy for leverage—that's a skip, not a bad call.

**Frame for next time:** Before entry, pull the Polymarket odds for AMD (weekly or event-specific) and compare to your edge. If Poly is already pricing

### Solus

- Lane: options mechanics and sizing
- Confidence: 35%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing critical context:** Entry date, exit date, and what triggered the close (time decay, stop hit, thesis break?). On mechanics alone: $1.1K loss on a $202 short at 5x is tight risk management (0.55% of notional), but the leverage amplified a small directional miss into a visible loss. Without knowing hold duration or IV regime, I can't assess whether the structure was sound—if this was a 1-day hold, the loss is noise; if multi-day, you ate theta without vol expansion to compensate. **Next call:** paste entry/exit timestamps and the close trigger, then I can assess position design vs execution.

**Confidence: 0.35** (mechanics only; sentiment/thesis is Vince's lane).

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$16.81, realized=$7.88, slippage=$-8.93, breach=false
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

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -8.93
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.653,
  "riskBudget": {
    "plannedRiskUsd": 16.81,
    "realizedRiskUsd": 7.88,
    "riskSlippageUsd": -8.93,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.653,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T23:34:52.552Z",
    "exitTimestampUtc": "2026-03-12T11:35:21.300Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T23:34:52.552Z",
    "exitTimestampUtc": "2026-03-12T11:35:21.300Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 16.81,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
