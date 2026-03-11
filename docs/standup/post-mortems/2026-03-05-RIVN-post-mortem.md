# Post-mortem: RIVN short (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- RIVN short closed stop_loss: entry $14.90 -> exit $15.14, P&L $-16.29 (961.3335789473684 USD, 5x).
- Entry time (UTC): 2026-03-05T17:31:41.680Z
- Hold window target: intraday
- Max loss budget: $14.42 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 187 minutes
- Adverse move: 1.644%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter (exact time/date)? What was CT sentiment on RIVN at entry vs. exit? Was there a macro/sector catalyst between entry and stop? Without the sentiment snapshot at your entry point and any shifts during the hold, I can't tell if you were fighting a headwind or if CT simply shifted bearish on EV/legacy auto. **What I'd need:** X pulse on RIVN sentiment 24h before entry, and a note on any macro moves (rates, EV news, Musk tweets, etc.) during your hold.

Confidence: 0.2

### Oracle

- Lane: prediction market regime
- Confidence: 35%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket pricing on RIVN at entry/exit, IV regime (was vol contracting into the stop?), and what macro/sentiment shift triggered the move against you. That said—$15.14 is still well below RIVN's recent highs, so the stop suggests tight risk management rather than a regime miss. If Polymarket had RIVN bankruptcy/delisting priced <5% at your entry, the short was fighting consensus; if it was >20%, you were ahead of the market and got shaken out on noise. **Confidence: 0.35** (need live odds at entry time to calibrate whether this was a vol crush or a genuine thesis break).

### Solus

- Lane: options mechanics and sizing
- Confidence: 62%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold time, IV environment, and what triggered the stop (market move vs thesis break). On mechanics alone: $961 loss on 5x leverage across a $14.90 entry suggests tight stops relative to intraday noise—RIVN's typical daily range could easily clip a 1.6% stop. If this was a short-term tactical trade, the sizing (5x on a $961 risk) is reasonable; if thesis-based, the stop placement cost you before the trade could prove out. Next time, separate "noise stops" (tighter, tactical) from "thesis stops" (wider, structural) and state which one you're running.

**Confidence: 0.62** (mechanics clear, but missing hold-time and thesis intent).

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

- Quality score: 85/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$14.42, realized=$16.29, slippage=$1.87, breach=true
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

- PM_QUALITY_SCORE: 85
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 1.87
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 85,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 187,
  "adverseMovePct": 1.644,
  "riskBudget": {
    "plannedRiskUsd": 14.42,
    "realizedRiskUsd": 16.29,
    "riskSlippageUsd": 1.87,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.644,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T17:31:41.680Z",
    "exitTimestampUtc": "2026-03-05T20:38:30.120Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T17:31:41.680Z",
    "exitTimestampUtc": "2026-03-05T20:38:30.120Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 14.42,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
