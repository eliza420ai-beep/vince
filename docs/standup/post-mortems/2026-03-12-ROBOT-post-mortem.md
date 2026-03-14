# Post-mortem: ROBOT long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- ROBOT long closed stop_loss: entry $36.05 -> exit $35.50, P&L $-29.81 (1891.1797609215384 USD, 5x).
- Entry time (UTC): 2026-03-12T13:30:01.458Z
- Hold window target: intraday
- Max loss budget: $28.37 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 103 minutes
- Adverse move: 1.526%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on ROBOT at entry vs. exit? Was there a macro catalyst (BTC dump, Fed news, liquidation cascade)? 

Without the sentiment backdrop, I can't tell if you got caught in a crowded trade that CT abandoned, or if macro shifted under you. **Confidence: 0.2** — I need the timing and CT vibe at entry/exit to give you real post-mortem feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

I'd need the market condition (which Polymarket ROBOT contract, timeframe, macro backdrop) and your edge thesis at entry to give you regime feedback—was this a mean-reversion overreaction play or a directional bet that got stopped? The loss size ($29.81 on ~$1.9K notional) suggests tight risk management, which is solid, but without knowing if Polymarket was pricing ROBOT higher/lower at your entry, I can't tell you whether the market was right to reject the long or if you got shaken out of a valid edge. **Missing:** market odds at entry/exit, your thesis, and the macro/sentiment context that day. Confidence: 0.3.

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage ratio (5x on what notional?), position duration (hours/days?), and stop placement rationale (% from entry, support level, or arbitrary?). That said: **$1,891 notional at 5x on a $35 stock is tight—$29 loss on a 1.5% move suggests stop was <1% from entry, which is mechanical whipsaw territory.** For paper bot tuning, widen stops to 2–3% or reduce leverage to 3x; tighter stops on low-float/high-spread names like ROBOT burn premium faster than they catch reversals. **Confidence: 0.6** (need entry logic and market conditions to assess if this was structure failure or just bad luck).

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
- Risk budget: planned=$28.37, realized=$29.81, slippage=$1.44, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 1.44
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
  "holdMinutes": 103,
  "adverseMovePct": 1.526,
  "riskBudget": {
    "plannedRiskUsd": 28.37,
    "realizedRiskUsd": 29.81,
    "riskSlippageUsd": 1.44,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.526,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T13:30:01.458Z",
    "exitTimestampUtc": "2026-03-12T15:12:53.934Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T13:30:01.458Z",
    "exitTimestampUtc": "2026-03-12T15:12:53.934Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 28.37,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
