# Post-mortem: SEMIS short (max_age)

**Date:** 2026-03-13

## Trade Snapshot

- SEMIS short closed max_age: entry $391.26 -> exit $392.46, P&L $-9.18 (2576.47509504 USD, 5x).
- Entry time (UTC): 2026-03-13T01:30:35.276Z
- Hold window target: intraday
- Max loss budget: $38.65 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.306%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 72%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Feedback (sentiment/macro lane):**

The trade timing suggests you shorted into a macro tailwind — semis have been riding AI/compute euphoria on CT for weeks, and shorting that without a sentiment breakdown (fear spike, whale capitulation, or macro pivot) is fighting the crowd. I'd need to know: *What was the CT sentiment on semis/AI at entry? Was there a specific bearish catalyst you were trading, or was it pure TA?* If it was TA-only, that's a tell — sentiment was likely still constructively bullish, which means the setup was contrarian without a thesis to back it. Next time, run a quick X_PULSE on the sector before entry to flag if you're shorting into retail FOMO or whale accumulation.

**Confidence: 0.72** (I'm working without the sentiment context at entry, so this is directional, not surgical

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the Polymarket odds for SEMIS at entry and exit—was the market pricing a rally? If so, your short into consensus strength is the real lesson, not the $9.18 slip. The 5x leverage on a $391 entry suggests tight stops; what was your thesis vs. what the prediction market was saying at that moment? Without the Poly pricing snapshot, I'm flying blind on whether this was a regime miss or just bad timing into a consensus move.

**Confidence: 0.3** (can't assess market-pricing context without Polymarket data—ask me to pull live SEMIS odds if you want to backtest the thesis).

### Solus

- Lane: options mechanics and sizing
- Confidence: 78%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Solus feedback:**

Entry at $391.26 short with 5x leverage on SEMIS is aggressive sizing for a sector trade—you're risking ~$12.9K notional on a $2,576 position, which means a 50bp move kills you. The exit at $392.46 (12bp loss) suggests the trade was underwater fast; that's a mechanics problem, not a timing one. **Missing context:** What was your stop loss? Did you hit it, or did you close manually? If manual, why not let the stop work? If no stop, that's the real issue—leverage without a defined exit plan. For paper trades, tighter stops (5-10bp on 5x) or smaller size (1-2x) would let you test thesis without blowing up the learning signal.

**Confidence: 0.78**

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
- Risk budget: planned=$38.65, realized=$9.18, slippage=$-29.47, breach=false
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

- PM_QUALITY_SCORE: 95
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -29.47
- PM_ADAPTATION_ELIGIBLE: true
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
  "adverseMovePct": 0.306,
  "riskBudget": {
    "plannedRiskUsd": 38.65,
    "realizedRiskUsd": 9.18,
    "riskSlippageUsd": -29.47,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.306,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T01:30:35.276Z",
    "exitTimestampUtc": "2026-03-13T13:30:37.109Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T01:30:35.276Z",
    "exitTimestampUtc": "2026-03-13T13:30:37.109Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 38.65,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
