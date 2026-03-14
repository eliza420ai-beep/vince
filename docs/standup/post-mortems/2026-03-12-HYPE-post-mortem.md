# Post-mortem: HYPE short (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- HYPE short closed stop_loss: entry $36.33 -> exit $37.63, P&L $-154.34 (4233.6 USD, 10x).
- Entry time (UTC): 2026-03-11T23:12:42.436Z
- Hold window target: intraday
- Max loss budget: $148.18 (35.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 631 minutes
- Adverse move: 3.596%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing critical context:** Did CT sentiment on HYPE shift *before* your stop hit, or did price move first? That tells us if this was a sentiment miss (we called the vibe wrong) or execution/timing (sentiment was right, but leverage/size didn't match volatility).

**What I'd need to give you real feedback:** (1) What was CT saying about HYPE at entry vs. exit? (2) Was there a catalyst (news, whale move, macro shift) that flipped sentiment? (3) Did your thesis assume sustained bearish sentiment, or were you hedging a contrarian setup?

Right now I can only say: **If HYPE sentiment stayed negative but price ripped, that's a liquidity/leverage story, not a sentiment failure.** If sentiment flipped bullish before your stop, that's on us for missing the shift.

**Confidence: 0.3** —

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Was this a directional bet on HYPE's fundamentals, or a reversion trade off Polymarket mispricing? Without knowing your entry thesis (macro, sentiment shift, orderbook imbalance), I can only say the move—$36.33 → $37.63 in your direction—suggests either a failed mean-reversion setup or a regime shift you didn't anticipate. **If this was a Poly-informed edge play,** pull the market's current odds on HYPE's next catalyst; if Polymarket repriced *after* your entry, that's regime confirmation and a clean stop. **If it was pure momentum/chart,** that's VINCE's lane—ask him whether paper bot saw the reversal signal early.

**Confidence: 0.3** (need thesis and Poly context to diagnose).

### Solus

- Lane: options mechanics and sizing
- Confidence: 72%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry signal (what triggered the short?), stop placement rationale (why $37.63?), and current HYPE spot/IV. That said, the mechanics show a tight stop (3.6% from entry) on a 10x leveraged perp—that's aggressive for HYPE's typical daily range and volatility. At $36.33 entry, a 3.6% move is ~$1.30, which is well within HYPE's intraday noise; you got shaken out. For perps on HYPE, consider: (1) wider stop (5–7% OTM invalidation), (2) smaller leverage (5x), or (3) skip entirely if IV/funding don't support the thesis. The loss is contained, but structure-wise, stop was too tight for the asset's behavior.

**Confidence: 0.72** (mechanics

## Root-Cause Tags

- Primary: regime_conflict
- Secondary: sizing_too_aggressive

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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 90/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$148.18, realized=$154.34, slippage=$6.16, breach=true
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

- PM_QUALITY_SCORE: 90
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: sizing_too_aggressive
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 6.16
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 90,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [
    "sizing_too_aggressive"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 631,
  "adverseMovePct": 3.596,
  "riskBudget": {
    "plannedRiskUsd": 148.18,
    "realizedRiskUsd": 154.34,
    "riskSlippageUsd": 6.16,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 3.596,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T23:12:42.436Z",
    "exitTimestampUtc": "2026-03-12T09:43:54.383Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T23:12:42.436Z",
    "exitTimestampUtc": "2026-03-12T09:43:54.383Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 3.5,
    "maxLossUsd": 148.18,
    "maxLossPct": 35,
    "entryAtrPct": 7
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
