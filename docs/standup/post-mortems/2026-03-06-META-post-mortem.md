# Post-mortem: META short (max_age)

**Date:** 2026-03-06

## Trade Snapshot

- META short closed max_age: entry $653.81 -> exit $663.11, P&L $-26.19 (1778.6071578947367 USD, 5x).
- Entry time (UTC): 2026-03-05T17:33:32.371Z
- Hold window target: intraday
- Max loss budget: $26.68 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 1.423%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on META at entry vs. exit? Was there a macro catalyst (Fed news, earnings, rate shift) that moved the trade against you?

**On the trade itself:** If you shorted META into a bullish tech/AI rally without a contrarian CT signal backing the thesis, that's a sentiment mismatch — retail and whales were likely long. A 1.4% move against a 5x short is brutal but typical when you're fighting the macro vibe.

**What I need to give you real feedback:** Run me the dates, and I'll pull CT sentiment for those hours. Was the short thesis based on a contrarian edge (CT was overbought, whales were rotating out) or just a TA setup? That's the difference between "you ignored the vibe" and "sentiment was neutral and you got unlucky."

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket META prediction at entry/exit, volume/spread at close, macro regime (risk-on/off), and whether this was a hedge vs directional bet. Without the prediction-market odds comparison, I can't isolate whether this was a model miss, timing miss, or just regime shift.

**What I see:** $10 move against you on 5x is brutal but tells me either (1) the perp was overpriced vs Polymarket consensus at entry and you got shaken out before mean reversion, or (2) macro shifted hard and the market repriced. If Poly showed META >70% at your entry and <50% at exit, that's a regime call gone wrong—not a bad trade, just bad timing. If Poly stayed flat, the perp was the misprice and you exited too early.

**Ask VINCE:** What was Polymarket pricing

### Solus

- Lane: options mechanics and sizing
- Confidence: 72%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Solus feedback:**

5x leverage on a $1,779 notional short is tight sizing for META — at 5x you're risking $355 on a $10 move, which is exactly what happened. The entry/exit spread ($9.30, ~1.4%) is reasonable slippage for paper, but the real issue: **no stop or position management rule visible**. Missing context: What was your thesis invalidation? Did you hold through a catalyst, or was this a timing miss? For paper trades, the mechanic that matters most is *"when do I exit?"* — entry is secondary.

**Confidence: 0.72**

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$26.68, realized=$26.19, slippage=$-0.49, breach=false
- Consistency checks: pass

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.
- Promote bounded policy delta candidate and evaluate over a rolling window.

## Recursive Policy Delta

- Adaptation eligible: true
- Policy version at entry: baseline
- Proposed delta: none

## Machine-Readable Summary

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -0.49
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 1.423,
  "riskBudget": {
    "plannedRiskUsd": 26.68,
    "realizedRiskUsd": 26.19,
    "riskSlippageUsd": -0.49,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.423,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T17:33:32.371Z",
    "exitTimestampUtc": "2026-03-06T05:34:01.558Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T17:33:32.371Z",
    "exitTimestampUtc": "2026-03-06T05:34:01.558Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 26.68,
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
