# Post-mortem: MAG7 short (max_age)

**Date:** 2026-03-06

## Trade Snapshot

- MAG7 short closed max_age: entry $61.98 -> exit $62.14, P&L $-5.82 (1924.6265741851362 USD, 5x).
- Entry time (UTC): 2026-03-05T15:22:40.775Z
- Hold window target: intraday
- Max loss budget: $28.87 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.252%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter/exit (date/time)? What was CT sentiment on MAG7 at entry vs. exit? Was there a macro catalyst or news event that shifted the vibe?

**From sentiment lane:** A $5.82 loss on a 5x short into a $62 level is tight risk management, but without knowing the CT pulse at entry (was everyone shorting or contrarian?) and what shifted sentiment at exit, I can't tell if you got shaken out by noise or if the trade thesis broke. The 16-cent move is marginal — check if a headline, whale move, or sentiment reversal actually invalidated the setup or if it was just volatility friction.

**Confidence: 0.3** (need trade timestamp + CT sentiment snapshot at entry/exit to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 35%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id

**Missing context:** Polymarket condition_id for the MAG7 short (which specific contract/timeframe), entry/exit timestamps, and what regime signal (macro, tech earnings, Fed pivot) triggered the trade. That said: a $5.82 loss on a $1.9K position (5x) is tight—sub-1% slippage on a short that moved 26 bps against you suggests the market repriced faster than your edge window. If this was a mean-reversion play on overbought tech, the regime may have shifted to sustained strength (earnings beats, AI hype) rather than pullback. Without the Polymarket odds at entry vs. exit, I can't say if the market's probability shift justified the move or if you got caught in vol expansion.

**Confidence: 0.35** (need condition_id, timestamps, and macro context).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold time, and what triggered the exit (stop hit, time decay, rebalance signal?). On mechanics: 5x leverage on a $1,924 notional short in a ranging/bullish regime is aggressive sizing for a $100K stack—that's ~1.9% risk on a single micro-move ($0.16 = 0.26% price swing). The loss is small in absolute terms, but if this is pattern (tight stops + leverage + no directional conviction), you're paying friction costs faster than premium income can cover. **Missing:** Was this a hedge against long BTC, or directional bet? That changes the sizing call entirely.

**Confidence: 0.65** (structure unclear without entry context and thesis).

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

- Quality score: 77/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$28.87, realized=$5.82, slippage=$-23.05, breach=false
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

- PM_QUALITY_SCORE: 77
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -23.05
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 77,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.252,
  "riskBudget": {
    "plannedRiskUsd": 28.87,
    "realizedRiskUsd": 5.82,
    "riskSlippageUsd": -23.05,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.252,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T15:22:40.775Z",
    "exitTimestampUtc": "2026-03-06T03:23:01.925Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T15:22:40.775Z",
    "exitTimestampUtc": "2026-03-06T03:23:01.925Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 28.87,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp",
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
