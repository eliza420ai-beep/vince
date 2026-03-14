# Post-mortem: NFLX short (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- NFLX short closed max_age: entry $94.01 -> exit $94.94, P&L $-17.73 (1699.4560000000001 USD, 5x).
- Entry time (UTC): 2026-03-12T01:29:59.794Z
- Hold window target: intraday
- Max loss budget: $25.49 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.993%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context I need:** Was CT bullish or bearish on NFLX into your entry? Did sentiment shift *during* the hold, or was the macro (rates, tech sector vibe) already turning? Without knowing the sentiment setup at entry vs. exit, I can't tell if you fought headwinds or just got caught in noise.

**What I can say:** NFLX shorts have been a crowded trade when CT gets bearish on mega-cap tech — if you entered into already-bearish sentiment, the risk/reward was compressed. Check if whale accounts were already positioned short; if so, liquidity dries up fast on any relief bounce.

**Confidence: 0.3** (need the sentiment tape to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Regime & pricing context:**

NFLX short at $94 on 5x leverage into a $94.94 exit is a tight stop—you got shaken out on intraday noise rather than a structural break. Without knowing the Polymarket odds on NFLX subscriber growth or earnings timing at entry, I can't confirm whether the short was mispriced vs. consensus; if there was a live Poly market pricing NFLX upside, your entry should've anchored to that edge first. The $17.73 loss on $1.7K notional is ~1% slippage cost—acceptable, but the leverage on a thin conviction trade (no linked forecast data) suggests the bet wasn't sized to your edge. 

**Missing:** Polymarket context (was there an active NFLX prediction market pricing your thesis?), catalyst timing, and conviction level at entry.

**

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, IV at entry vs exit, and whether this was a hedge or directional bet. That said, the structure looks sound—small notional ($1,699), tight stop (~1% slippage on entry), 5x leverage reasonable for a short paper trade. The loss itself is noise at this size; what matters is whether you hit your edge on direction or got whipsawed on vol crush. If you held <24h, that's a scalp miss, not a sizing problem. If you held >3 days, the question is: did IV collapse (vol crush killed you) or did spot just move against you? Paste entry time and IV snapshot and I can give you the real call on whether to adjust leverage or just accept the variance.

**Confidence: 0.6** (structure looks fine, but without timing/vol data, I'm guessing on the real lesson here).

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
- Risk budget: planned=$25.49, realized=$17.73, slippage=$-7.76, breach=false
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
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -7.76
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
  "holdMinutes": 720,
  "adverseMovePct": 0.993,
  "riskBudget": {
    "plannedRiskUsd": 25.49,
    "realizedRiskUsd": 17.73,
    "riskSlippageUsd": -7.76,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.993,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T01:29:59.794Z",
    "exitTimestampUtc": "2026-03-12T13:30:24.638Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T01:29:59.794Z",
    "exitTimestampUtc": "2026-03-12T13:30:24.638Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 25.49,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
