# Post-mortem: ANTHROPIC short (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- ANTHROPIC short closed stop_loss: entry $612.56 -> exit $624.84, P&L $-45.31 (2204.498283413038 USD, 3x).
- Entry time (UTC): 2026-03-05T18:25:40.149Z
- Hold window target: intraday
- Max loss budget: $33.07 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 60 minutes
- Adverse move: 2.005%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** Was CT bearish on ANTHROPIC going into this trade, or did sentiment flip *after* entry? Did macro (rates, risk-off) turn against you mid-trade, or was this a pure mispricing that didn't pan out?

**If sentiment was with you at entry:** This looks like a timing miss rather than a thesis break — 2% move into a stop on 3x is tight. Check if whale/alpha accounts were still long or if conviction dropped before your exit.

**If sentiment turned:** That's the real lesson — CT's conviction on ANTHROPIC may have shifted (check @crediblecrypto, @CryptoQuant_com for macro reversals). A losing trade on correct sentiment is just unlucky; a losing trade on *reversed* sentiment is a signal to tighten your pulse-to-entry window.

**Confidence: 0.6** (need the

### Oracle

- Lane: prediction market regime
- Confidence: 65%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing: entry timestamp, exit timestamp, and what triggered the stop (market move vs. time decay). That said—a $612–$625 range on ANTHROPIC suggests the market was pricing in near-term upside (bullish regime), and shorting into that without a clear catalyst or volatility edge is fighting consensus. The 3x leverage amplified the drawdown; if you had Polymarket odds or IV data for ANTHROPIC at entry, that would've signaled whether the short had edge or was just noise. Next time: cross-check Polymarket sentiment (if there's an ANTHROPIC-related market) or Hyperliquid IV before entry to confirm the short thesis.

Confidence: 0.65

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry time, exit time, funding rate at entry/exit, liquidation price vs stop loss, and what thesis drove the short (was it perp-specific or macro?). On mechanics alone: 3x leverage on a $612 short with a $12.28 stop (2% buffer) is tight for a volatile asset like ANTHROPIC—you're fighting funding and slippage in a narrow band. If funding was positive at entry, you're paying to hold; if you got stopped at market chop, tighter stops on leverage often cost more than they save. **Next time:** post the full context (funding, thesis, time-in-trade) and I'll give you the real feedback on whether the structure was sound or the sizing was the problem.

**Confidence: 0.4** (mechanics only, thesis/timing unknown).

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
- Risk budget: planned=$33.07, realized=$45.31, slippage=$12.24, breach=true
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

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 12.24
- PM_ADAPTATION_ELIGIBLE: false
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
  "holdMinutes": 60,
  "adverseMovePct": 2.005,
  "riskBudget": {
    "plannedRiskUsd": 33.07,
    "realizedRiskUsd": 45.31,
    "riskSlippageUsd": 12.24,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 2.005,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T18:25:40.149Z",
    "exitTimestampUtc": "2026-03-05T19:25:59.965Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T18:25:40.149Z",
    "exitTimestampUtc": "2026-03-05T19:25:59.965Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 33.07,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
