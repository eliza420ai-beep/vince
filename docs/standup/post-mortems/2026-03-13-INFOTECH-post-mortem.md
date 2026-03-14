# Post-mortem: INFOTECH long (max_age)

**Date:** 2026-03-13

## Trade Snapshot

- INFOTECH long closed max_age: entry $138.31 -> exit $138.37, P&L $-0.29 (5981.102899199999 USD, 5x).
- Entry time (UTC): 2026-03-13T01:30:36.012Z
- Hold window target: intraday
- Max loss budget: $89.72 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.045%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter/exit (dates/times)? What was CT sentiment *at entry* vs. *at exit*? Was this a thesis-driven trade or a quick scalp? Without the sentiment backdrop and timing, I can't tell you if you were fighting macro headwinds or just got stopped out on noise.

**What I'd need to give you real feedback:** Run an X_PULSE for the INFOTECH entry window + exit window, and I'll tell you if CT was pricing in the move or if you were ahead of sentiment (which matters for sizing and conviction).

Confidence: 0.3 (can't assess sentiment lane without the data).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id, market_name

**Missing critical context:** I need the condition_id or market name to pull live Polymarket odds on INFOTECH and see what the prediction market priced that move at—that's the regime signal. Was the paper entry *ahead* of or *behind* Polymarket consensus? A $0.06 move on 5x leverage is tight; if Polymarket showed <5% edge to long at $138.31, the regime was already pricing it fairly and the trade was fighting consensus. If Polymarket was short-biased and you went long, you had regime headwind. 

**What I need:** Market name/condition_id, and what timeframe you were holding (minutes? hours?). Then I can tell you whether this was a consensus fade that didn't work or a missed edge signal.

**Confidence: 0.3** (regime assessment requires live odds data I don't have).

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** Entry/exit date, IV regime at entry/exit, what triggered the exit signal, and whether this was a hedge or directional core position in the $100K stack. On mechanics alone: $138.31→$138.37 is a +0.04% move; at 5x leverage, that's a -0.2% realized loss, which is tight and suggests either slippage on entry, a micro-move exit, or a stop hit. If this was a paper bot trade on HIP-3 (low liquidity), slippage on entry/exit is the likely culprit—tighten entry limits or skip when spreads widen. If it was a directional bet, the move is too small to conclude much; need to know hold time and whether you hit a stop or took profit early. **Confidence: 0.3** (need entry/exit timestamps, signal, and

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
- Risk budget: planned=$89.72, realized=$0.29, slippage=$-89.43, breach=false
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
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -89.43
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
  "holdMinutes": 720,
  "adverseMovePct": 0.045,
  "riskBudget": {
    "plannedRiskUsd": 89.72,
    "realizedRiskUsd": 0.29,
    "riskSlippageUsd": -89.43,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.045,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T01:30:36.012Z",
    "exitTimestampUtc": "2026-03-13T13:30:37.115Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T01:30:36.012Z",
    "exitTimestampUtc": "2026-03-13T13:30:37.115Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 89.72,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "condition_id",
      "market_name"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
