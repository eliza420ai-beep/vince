# Post-mortem: SNDK long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- SNDK long closed stop_loss: entry $632.86 -> exit $622.83, P&L $-30.98 (1895.712 USD, 5x).
- Entry time (UTC): 2026-03-12T13:47:54.453Z
- Hold window target: intraday
- Max loss budget: $28.44 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 55 minutes
- Adverse move: 1.584%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter vs. exit (dates/times)? Did CT sentiment on SNDK shift during your hold, or was bearish sentiment already priced in at entry? Without the timeline and pre-trade CT vibe, I can't tell if this was a sentiment-timing miss or a macro headwind you didn't catch. 

**What I'd need to give you real feedback:** A quick X_PULSE on SNDK sentiment 24h before entry + during your hold — then I can tell you if whale/alpha accounts were already rotating out, or if this was a surprise dump.

Confidence: 0.3 (incomplete data)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the entry/exit *dates* and what Polymarket was pricing for SNDK (or the broader semiconductor thesis) during that window—was the market repricing risk, or did you get caught in intraday chop? The 1.5% stop-loss on a 5x leveraged perp is tight for regime volatility; if Poly showed >60% conviction on a bearish semiconductor outcome, the stop was rational, but if it was sub-50%, that's a regime mismatch (you were short-term directional, market was uncertain). 

**Direct take:** Without the Polymarket overlay and timing, I can't isolate whether this was bad risk management or bad luck in a choppy market. Pull the date range and I'll cross it against any SNDK-related markets we have live, or the broader chip/earnings sentiment at the time.

**Confidence:

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation? Why 5x on a semiconductor name in this regime? And what % of your paper stack was this?

**On structure:** $632→$623 is a tight stop (1.6%)—reasonable for a scalp, brutal for a swing. If SNDK was a thesis trade (not a scalp), 5x leverage + 1.6% stop = you got shaken out by noise; you sized the leverage to the volatility, not the conviction. If it was a scalp, the mechanics are fine but the entry timing matters—did you enter on a setup or just on "SNDK is undervalued"?

**The call:** Tighten your position sizing on paper until you can articulate the exact price level that invalidates the thesis *before* entry. Right now it looks like you're using the stop as a guess, not a boundary.

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

- Quality score: 87/100
- Escalate to Sentinel: true
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$28.44, realized=$30.98, slippage=$2.54, breach=true
- Consistency checks: fail (truncated_agent_findings)

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

- PM_QUALITY_SCORE: 87
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 2.54
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 87,
  "qualityEscalate": true,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 55,
  "adverseMovePct": 1.584,
  "riskBudget": {
    "plannedRiskUsd": 28.44,
    "realizedRiskUsd": 30.98,
    "riskSlippageUsd": 2.54,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": false,
    "issues": [
      "truncated_agent_findings"
    ],
    "adverseMovePctFromPrices": 1.584,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": true
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T13:47:54.453Z",
    "exitTimestampUtc": "2026-03-12T14:42:52.151Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T13:47:54.453Z",
    "exitTimestampUtc": "2026-03-12T14:42:52.151Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 28.44,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
