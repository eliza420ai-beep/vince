# Post-mortem: SOL long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- SOL long closed stop_loss: entry $86.17 -> exit $85.81, P&L $-17.90 (3872.172972972973 USD, 3x).
- Entry time (UTC): 2026-03-11T13:29:02.026Z
- Hold window target: intraday
- Max loss budget: $154.89 (12.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 1508 minutes
- Adverse move: 0.412%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Sentiment read on the SOL stop-loss:**

SOL's been riding retail FOMO (especially post-Solana mobile hype), but whale accumulation has been quiet — that's a yellow flag when retail's loud. A $0.36 wick down hitting your stop suggests thin liquidity at that level, not a macro rejection. **What I need to give you real feedback:** Did CT sentiment flip hard into bearish in the hours before the stop, or was this a pure liquidity event? Was macro (BTC, Fed news, geopolitics) the culprit, or SOL-specific?

Without that context, I can't tell if you got shaken out of a contrarian setup or dodged a real reversal.

**Confidence: 0.4** (missing trade-window sentiment data)

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was the thesis (macro, technicals, vol regime)? Was this a hedge against a Polymarket position, or standalone? Did SOL prediction markets signal weakness before the stop?

**On the close itself:** A $17.90 loss on a 3x leveraged position ($3.9K notional) is tight risk management—you caught the move before real damage. The entry ($86.17) vs. current Polymarket-implied fair value would tell us if this was a crowded consensus trade (high probability of mean reversion) or a genuine miss.

**What I'd check:** Pull the SOL weekly options chain from VINCE—if IV was elevated into your entry, the market was pricing volatility; if you got stopped on noise while macro was still constructive, that's a regime call, not a model failure.

**Confidence: 0.4** (need thesis +

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, exit date, IV/vol regime at entry, intended hold duration, and whether this was a perps position or spot hedge. On mechanics alone: 3x leverage on a $36 move (0.04%) is tight—you got stopped at noise. If this was a weekly theta play (short vol), the structure worked (took the loss, preserved capital); if it was a directional long, sizing 3x on SOL's typical daily range ($1–2) means your stop was too close to entry. For a $100K stack, a $3.8K loss on a single micro-move suggests either (a) position size too large for your conviction, or (b) stop placement didn't account for intraday chop. **Confidence: 0.65** (need dates and intent to assess if this was bad luck or bad structure).

## Root-Cause Tags

- Primary: stop_too_tight_for_vol
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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 87/100
- Escalate to Sentinel: true
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$154.89, realized=$17.90, slippage=$-136.99, breach=false
- Consistency checks: fail (stop_distance_mismatch)

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
- PM_PRIMARY_CAUSE: stop_too_tight_for_vol
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -136.99
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 87,
  "qualityEscalate": true,
  "primaryCause": "stop_too_tight_for_vol",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 1508,
  "adverseMovePct": 0.412,
  "riskBudget": {
    "plannedRiskUsd": 154.89,
    "realizedRiskUsd": 17.9,
    "riskSlippageUsd": -136.99,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": false,
    "issues": [
      "stop_distance_mismatch"
    ],
    "adverseMovePctFromPrices": 0.412,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.169,
    "stopDistancePctDelta": 3.831,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T13:29:02.026Z",
    "exitTimestampUtc": "2026-03-12T14:37:22.461Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T13:29:02.026Z",
    "exitTimestampUtc": "2026-03-12T14:37:22.461Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 4,
    "maxLossUsd": 154.89,
    "maxLossPct": 12,
    "entryAtrPct": 5
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
