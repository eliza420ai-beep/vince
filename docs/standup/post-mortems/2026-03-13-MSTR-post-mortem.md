# Post-mortem: MSTR long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- MSTR long closed stop_loss: entry $142.19 -> exit $139.86, P&L $-91.91 (5446.144324667089 USD, 5x).
- Entry time (UTC): 2026-03-13T15:53:47.535Z
- Hold window target: intraday
- Max loss budget: $81.69 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 32 minutes
- Adverse move: 1.638%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** Did CT sentiment shift before your stop hit? Was there a macro catalyst (Fed speak, BTC dump, risk-off) that preceded the move, or was MSTR just bleeding in isolation? 

**My lane:** If macro/CT vibe was still bullish when you got stopped, that's a timing miss—sentiment hadn't turned yet. If CT was already rotating out of mega-cap tech into crypto/commodities, your entry timing was against the flow. Run X_PULSE on "MSTR sentiment" + macro vibe from yesterday/today and I can give you the real post-mortem on whether CT saw this coming.

**Confidence: 0.3** (need sentiment data to assess).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the Polymarket odds for MSTR (or the specific prediction you were trading against)—what was the market pricing MSTR at entry vs. exit, and what timeframe? Without that, I can't tell you whether the stop-loss was premature (market repriced against you) or the trade itself was misaligned with consensus. 

**What I can say:** A 5x leveraged stop at ~2.6% below entry is tight for a stock with MSTR's vol profile, especially if you were trading a multi-day thesis. If Polymarket had MSTR significantly higher at entry and the price dip was noise, that's a regime miss—you got shaken out of a good conviction trade. If Polymarket had repriced lower *before* your stop, that's a signal your edge wasn't there.

**Next move:** Pull the Polymarket MSTR

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Position date, hold duration, and whether this was part of a larger MSTR thesis or standalone trade. That said: **5x leverage on a $142 entry into a mega-cap stock is aggressive sizing for a paper bot learning phase—tighter stops or smaller multiplier would have let you survive normal intraday chop.** The $2.33 drawdown (1.6%) shouldn't trigger a stop on 5x unless you're testing execution speed; if this was a directional bet, consider 2-3x and wider stops to separate signal from noise. **Missing:** Did the trade hit your target, or was the stop arbitrary?

**Confidence: 0.65** (good mechanics question, but need trade intent and duration to assess structure properly).

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

- Quality score: 95/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$81.69, realized=$91.91, slippage=$10.22, breach=true
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

- PM_QUALITY_SCORE: 95
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 10.22
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 95,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 32,
  "adverseMovePct": 1.638,
  "riskBudget": {
    "plannedRiskUsd": 81.69,
    "realizedRiskUsd": 91.91,
    "riskSlippageUsd": 10.22,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.638,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T15:53:47.535Z",
    "exitTimestampUtc": "2026-03-13T16:26:15.434Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T15:53:47.535Z",
    "exitTimestampUtc": "2026-03-13T16:26:15.434Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 81.69,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
