# Post-mortem: RIVN long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- RIVN long closed stop_loss: entry $16.68 -> exit $16.40, P&L $-26.45 (1507.3968 USD, 5x).
- Entry time (UTC): 2026-03-12T11:13:52.762Z
- Hold window target: intraday
- Max loss budget: $22.61 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 138 minutes
- Adverse move: 1.705%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit? Was this during a broader EV/macro selloff or isolated RIVN weakness? Did CT sentiment on RIVN shift before/after your entry—was there a whale capitulation or news catalyst I should know about?

**What I can say now:** RIVN sentiment has been structurally weak (legacy auto skepticism + cash burn concerns dominate), so a stop at -1.7% isn't unreasonable risk management. But without the timestamp, I can't tell if you got caught in a CT rotation (macro → flight to safety) or RIVN-specific FUD that was already priced in before your entry. 

**Next time, flag the entry time + any X chatter around it**—I can run a sentiment pulse to see if you were fighting upstream macro or just unlucky timing.

Confidence: 0.4

### Oracle

- Lane: prediction market regime
- Confidence: 35%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** RIVN's Polymarket sentiment (if any active markets exist), entry/exit timestamp, and macro regime at entry—was this a mean-reversion play into support or a breakout that reversed? From pure price action: $16.68→$16.40 is a 1.7% move that stopped you out on 5x leverage, which is tight for an intraday hold on a volatile name. The loss itself ($26.45 notional) is small and discipline-driven, which is the right call—but without knowing *why* you entered (technical, vol crush, Poly signal?) I can't assess if the setup was sound or regime-misaligned. If this was a hedge or synthetic short against a Polymarket long, that context changes the read entirely. **Confidence: 0.35** — need trade thesis and macro backdrop to give you real feedback.

### Solus

- Lane: options mechanics and sizing
- Confidence: 68%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Mechanics feedback:**

5x leverage on a $16.68 entry is aggressive for a stock with RIVN's volatility profile—you're risking ~1.7% account hit on a $26 loss, which is acceptable, but the stop at $16.40 (1.7% below entry) is too tight for intraday noise on that timeframe. Missing context: **hold duration, time-of-day entry, and whether this was a scalp or swing setup.** If it was a 15-min scalp, the stop placement is reasonable; if swing, you got shaken out by noise and should've widened to $15.80–$16.00 (support/structure). Sizing is fine; structure needs tightening or longer conviction horizon.

**Confidence: 0.68** (good data on entry/exit/size; missing trade context and market regime that day

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$22.61, realized=$26.45, slippage=$3.84, breach=true
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

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 3.84
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 138,
  "adverseMovePct": 1.705,
  "riskBudget": {
    "plannedRiskUsd": 22.61,
    "realizedRiskUsd": 26.45,
    "riskSlippageUsd": 3.84,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.705,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T11:13:52.762Z",
    "exitTimestampUtc": "2026-03-12T13:31:57.301Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T11:13:52.762Z",
    "exitTimestampUtc": "2026-03-12T13:31:57.301Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 22.61,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
