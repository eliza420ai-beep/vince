# Post-mortem: AAPL short (max_age)

**Date:** 2026-03-20

## Trade Snapshot

- AAPL short closed max_age: entry $247.82 -> exit $249.85, P&L $-18.69 (2150.4 USD, 5x).
- Entry time (UTC): 2026-03-20T11:01:28.100Z
- Hold window target: intraday
- Max loss budget: $80.64 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.819%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

Missing key context: **When did you enter/exit?** (timing vs. CT sentiment shift matters) and **what was the macro/CT vibe at entry vs. exit?** (did you short into bullish sentiment, or did sentiment flip against you post-entry?). AAPL on HIP-3 usually moves on macro/Fed talk, not crypto CT — so I'd need to know if there was a macro catalyst you missed or if your thesis just got crowded. Without the timestamp and sentiment backdrop, I can't tell if this was a sentiment misjudgment or bad timing. **Confidence: 0.2** (not enough data to assess your sentiment read).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the entry date, exit date, and the corresponding Polymarket odds for AAPL price moves during that window—was the market pricing a breakout higher, and did you underestimate tail risk? A $2 move against a short at 5x leverage suggests either a regime shift (earnings, macro surprise) or a mismatch between your edge and market consensus. Without the Polymarket pricing context (what was the market assigning to AAPL >$250 at entry vs. exit?), I can't isolate whether this was bad timing, bad sizing, or a legitimate edge that got stopped out. **Next time:** Cross-check your perps thesis against Polymarket's AAPL price-move markets before entry—they're a real-time consensus check on tail probability.

**Confidence: 0.3** (too many unknowns on timing and market state).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, exit date, IV environment at entry/exit, and whether this was a hedge or directional short. That said: **5x leverage on a $2,150 notional short is aggressive for a paper trade** — if this was meant to test edge, the sizing masks signal (you can't tell if the trade idea was bad or just overleveraged). On AAPL specifically, short bias into earnings or vol spike is high-friction without a defined catalyst window. **Feedback:** Size down to 2x or unlevered for the next 3 paper trades so you can isolate whether the directional call was wrong or just the structure was. Confidence: 0.65 (missing entry/exit dates and IV context).

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$80.64, realized=$18.69, slippage=$-61.95, breach=false
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

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -61.95
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.819,
  "riskBudget": {
    "plannedRiskUsd": 80.64,
    "realizedRiskUsd": 18.69,
    "riskSlippageUsd": -61.95,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.819,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T11:01:28.100Z",
    "exitTimestampUtc": "2026-03-20T23:01:46.099Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:01:28.100Z",
    "exitTimestampUtc": "2026-03-20T23:01:46.099Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 80.64,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
