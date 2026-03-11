# Post-mortem: SNDK long (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- SNDK long closed stop_loss: entry $598.39 -> exit $589.28, P&L $-42.85 (2725.2870324324317 USD, 5x).
- Entry time (UTC): 2026-03-05T08:57:40.061Z
- Hold window target: intraday
- Max loss budget: $40.88 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 387 minutes
- Adverse move: 1.522%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing critical context:** Was this trade thesis built on CT sentiment divergence (WTT), macro setup, or your own TA? I need to know if the *sentiment edge* broke down or if it was a macro/execution miss — those tell different stories.

**If sentiment-driven:** CT likely rotated out of SNDK or the narrative flipped (check if there was a negative earnings whisper, sector rotation, or whale exit). **If macro-driven:** That's Vince's lane — I'd need to know if broad risk-off killed the thesis before SNDK-specific sentiment even mattered.

Run me an X_PULSE on SNDK sentiment from entry to exit and I can give you the real post-mortem.

**Confidence: 0.3** (can't assess sentiment edge without knowing the original thesis and current CT vibe on the stock).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the trade date, duration held, and whether you had a corresponding Polymarket position or hedge (e.g., SNDK stock price prediction market). Without that, I can't tie the loss to regime shift or mispricing.

**What I can say:** A $42.85 loss on a 5x levered $598 entry suggests tight risk management—you caught the stop cleanly. The real question is whether the move was *predictable* from prediction-market odds at entry (did Poly imply SNDK downside that you missed?) or a pure volatility whip. If you had a paper long but the market was pricing in earnings risk or sector rotation, that's a regime miss; if it was just slippage/gap, that's execution luck.

**Recommendation:** Pull the Polymarket SNDK prediction (if one exists) for that date range and compare the odds

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, exit date, reason for stop (momentum broke, support failed, thesis invalidated?), and whether this was part of a pair or standalone. On mechanics alone: 1.5% loss on 5x is tight—good discipline—but SNDK's vol and liquidity matter for sizing. If this was a momentum fade and you got stopped on noise, tighter stops (1%) waste edge; if thesis broke, the stop worked. Confidence: 0.3 (need trade thesis + timeframe to assess structure).

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
- Risk budget: planned=$40.88, realized=$42.85, slippage=$1.97, breach=true
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
- PM_RISK_SLIPPAGE_USD: 1.97
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
  "holdMinutes": 387,
  "adverseMovePct": 1.522,
  "riskBudget": {
    "plannedRiskUsd": 40.88,
    "realizedRiskUsd": 42.85,
    "riskSlippageUsd": 1.97,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.522,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T08:57:40.061Z",
    "exitTimestampUtc": "2026-03-05T15:24:54.301Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T08:57:40.061Z",
    "exitTimestampUtc": "2026-03-05T15:24:54.301Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 40.88,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
