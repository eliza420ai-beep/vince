# Post-mortem: ANTHROPIC short (stop_loss)

**Date:** 2026-03-04

## Trade Snapshot

- ANTHROPIC short closed stop_loss: entry $542.67 -> exit $551.64, P&L $-29.76 (1747.7013486370156 USD, 3x).
- Entry time (UTC): 2026-03-04T11:47:24.689Z
- Hold window target: intraday
- Max loss budget: $26.22 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 35 minutes
- Adverse move: 1.653%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Sentiment read on the loss:**

ANTHROPIC (ANTH) isn't a major CT focus — most crypto Twitter noise is BTC/ETH/SOL, so you likely didn't have a crowd sentiment edge to lean on. The stop hit fast ($9 move), which suggests either tight risk management (good) or the thesis didn't have staying power. **Key missing context:** Was CT talking about ANTH that day? Was there macro headwind (rate fears, tech selloff) that shifted the vibe? Without knowing if sentiment was with you or against you at entry, I can't tell if this was a sentiment mispricing that just didn't play out, or a trade outside the CT-signal zone.

**Confidence: 0.4** (limited ANTH visibility in my lane; need more macro/CT context to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 0%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

Missing key context: **trade duration** (minutes? hours?), **market regime** (was ANTHROPIC vol spiking into earnings, Fed speak, or flat chop?), and **Polymarket pricing** at entry/exit (did the prediction market price shift, or was this pure spot momentum?). That said, a $9 move on a $542 entry in 3x leverage is ~1.65% adverse—typical for a whipsaw on tech mega-caps in choppy intraday. If Polymarket odds on ANTHROPIC fundamentals (product, earnings beat, AI narrative) didn't shift materially, this looks like a regime call gone wrong, not a mispricing. **Next time:** Check if the move was driven by Poly repricing (edge signal) or just intraday vol/gamma—that tells you whether to hold through noise or cut faster.

**Confidence: 0.

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, exit date, IV environment at entry/exit, and whether this was a hedge or standalone directional bet. That said: **3x leverage on a single equity short with a $29.76 stop (5.5% range) is tight for ANTHROPIC's typical daily vol—you got shaken out.** If this was a hedge against a long stack position, the structure made sense; if standalone, the sizing (3x) + stop width (5.5%) combo suggests over-leverage relative to your conviction window. **Next time: either widen the stop to 8-12% (accept bigger loss if wrong) or drop to 1-2x leverage (survive the noise).** 

Confidence: 0.65 (need entry/exit dates and vol context to assess if this was bad luck or bad structure).

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
- Risk budget: planned=$26.22, realized=$29.76, slippage=$3.54, breach=true
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
- PM_RISK_SLIPPAGE_USD: 3.54
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
  "holdMinutes": 35,
  "adverseMovePct": 1.653,
  "riskBudget": {
    "plannedRiskUsd": 26.22,
    "realizedRiskUsd": 29.76,
    "riskSlippageUsd": 3.54,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.653,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-04T11:47:24.689Z",
    "exitTimestampUtc": "2026-03-04T12:22:02.121Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-04T11:47:24.689Z",
    "exitTimestampUtc": "2026-03-04T12:22:02.121Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 26.22,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
