# Post-mortem: GOLD short (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- GOLD short closed max_age: entry $5152.67 -> exit $5170.00, P&L $-3.11 (804.8100226415092 USD, 5x).
- Entry time (UTC): 2026-03-12T01:29:26.983Z
- Hold window target: intraday
- Max loss budget: $12.07 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.336%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

Missing key context: **When did you enter vs. exit?** (date/time). Sentiment analysis only matters if I can cross-reference CT vibe at entry and exit — was macro fear/greed aligned with your thesis, or did sentiment flip against you mid-trade?

That said: GOLD shorts have been contrarian to crypto CT for weeks (risk-off macro dominates gold, not crypto sentiment). If you entered into bullish CT and exited into the same, the loss tracks — sentiment didn't give you a tailwind. If sentiment *flipped* bearish between entry/exit, that's a miss on macro timing, not sentiment reading.

**What I need:** Entry/exit timestamps so I can pull CT vibe snapshots and tell you if the sentiment environment actually supported the trade.

Confidence: 0.3 (incomplete data).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the entry/exit timestamps and the Polymarket GOLD prediction at both points to assess whether Poly was pricing in the move you got stopped on. Without that, I can't tell if the market mispriced the rally or if your thesis was just early.

**What I can say:** A $17.33 move (0.34%) on 5x is tight—suggests low vol regime or tight stops. If Poly had GOLD >$5170 priced in at entry, you fought the consensus; if it didn't, the market repriced fast and you got shaken. Pull the Poly odds snapshot and I'll give you the real post-mortem.

**Confidence: 0.3** (need timestamps + Poly price data to land this).

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, exit date, duration held, and what triggered the exit (time stop, price stop, or discretionary). That said—**5x leverage on a $5.15K spot ($25.75K notional) is aggressive for a commodity with daily ranges of $100+**; at that size, a 0.3% move ($15.33) eats most of a thin premium. If this was a 1–2 day hold, you're fighting theta and slippage on a low-vol asset. **Mechanics call:** size down to 2–3x on GOLD shorts unless IV/vol context justified the 5x, or extend hold to 5+ days to let theta work. Missing entry/exit dates kills the full picture.

**Confidence: 0.4**

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

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$12.07, realized=$3.11, slippage=$-8.96, breach=false
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

- PM_QUALITY_SCORE: 79
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -8.96
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 79,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.336,
  "riskBudget": {
    "plannedRiskUsd": 12.07,
    "realizedRiskUsd": 3.11,
    "riskSlippageUsd": -8.96,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.336,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T01:29:26.983Z",
    "exitTimestampUtc": "2026-03-12T13:29:48.599Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T01:29:26.983Z",
    "exitTimestampUtc": "2026-03-12T13:29:48.599Z"
  },
  "solusContext": {
    "assetClass": "commodity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 12.07,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
