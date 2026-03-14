# Post-mortem: COIN short (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- COIN short closed stop_loss: entry $193.66 -> exit $196.72, P&L $-30.92 (1897.4548094373868 USD, 5x).
- Entry time (UTC): 2026-03-12T14:33:04.236Z
- Hold window target: intraday
- Max loss budget: $28.46 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 66 minutes
- Adverse move: 1.579%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** What was CT saying about COIN when you entered? Was sentiment bullish/bearish, and did the trade thesis rely on a sentiment reversal that didn't materialize? Also—did macro shift (Fed news, BTC dump, etc.) kill the setup, or was it pure technicals? Without the sentiment backdrop and timing, I can't tell if you fought the crowd or if the crowd turned on you mid-trade.

**General take:** A 3-point stop on a 5x is tight; if sentiment was already mixed/bearish on COIN, you were fighting headwinds from entry. That's a tough spot.

Confidence: 0.4 (need the sentiment context to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

I'd need two things to give you solid regime feedback: (1) **the Polymarket odds for COIN at entry and exit** — was the market pricing a breakout or consolidation? and (2) **what triggered the short** — overreaction signal, model fair value, or sentiment shift? Right now I see the mechanics (5x, $193.66 entry, stopped at $196.72) but not the prediction-market context that would tell us if the regime shifted against you or if it was just slippage on a valid thesis. If you pulled this from the paper bot's VINCE signals, paste his entry rationale and I can cross it against what Polymarket was pricing at that moment.

**Confidence: 0.3** (missing the market-pricing lens entirely).

### Solus

- Lane: options mechanics and sizing
- Confidence: 72%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Stop hit on a 1.6% move with 5x leverage** — that's tight for a $193 entry on COIN; you're sizing for sub-1% swings, which means you're fighting slippage and noise. Missing: (1) what was your thesis invalidation trigger (news, chart, funding)?  (2) was the stop *planned* or reactive? If planned, the structure worked — you took the loss cleanly. If reactive, tighten your entry logic before next trade. On mechanics: 5x on a $193 ticker with that volatility profile needs wider stops or smaller size; you're paying friction you don't need to. **Next:** clarify invalidation upfront, then size/stop accordingly.

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

- Quality score: 95/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$28.46, realized=$30.92, slippage=$2.46, breach=true
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
- PM_RISK_SLIPPAGE_USD: 2.46
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
  "holdMinutes": 66,
  "adverseMovePct": 1.579,
  "riskBudget": {
    "plannedRiskUsd": 28.46,
    "realizedRiskUsd": 30.92,
    "riskSlippageUsd": 2.46,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.579,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T14:33:04.236Z",
    "exitTimestampUtc": "2026-03-12T15:39:32.235Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T14:33:04.236Z",
    "exitTimestampUtc": "2026-03-12T15:39:32.235Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 28.46,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
