# Post-mortem: ROBOT long (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- ROBOT long closed stop_loss: entry $37.49 -> exit $36.90, P&L $-60.86 (3738.5855999999994 USD, 5x).
- Entry time (UTC): 2026-03-05T00:55:43.524Z
- Hold window target: intraday
- Max loss budget: $56.08 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 399 minutes
- Adverse move: 1.578%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need to know *when* you entered and exited (date/time) and *what CT was saying* about ROBOT during that window — was sentiment bullish, bearish, or mixed? Also: did you enter on a contrarian setup (extreme sentiment) or with the crowd?

Without the timing and sentiment backdrop, I can't tell you if the trade was mis-timed against macro pulse or if it was just bad luck on a sound thesis. Send me the entry/exit timestamps and I'll pull the X vibe from that period.

**Confidence: 0.2** (not enough signal to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

Missing context: What was your entry thesis (Polymarket odds vs. your model at $37.49)? And the timeframe—was this intraday or multi-day? That said, a $0.59 stop on 5x leverage is tight for ROBOT's typical vol; if you got shaken out on noise rather than thesis break, that's regime-dependent (low liquidity window, news spike). Pull the Polymarket odds snapshot at entry and exit—if the market repriced against you materially, that's signal; if price moved but odds stayed flat, you got vol'd on leverage. **Confidence: 0.4** (need the odds context to separate thesis failure from execution friction).

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Which timeframe (1h/4h/1d), what was your invalidation signal, and was this part of a planned pair/hedge or standalone? 

**On mechanics:** $3.7K notional at 5x ($18.5K gross) for a $60 loss is reasonable risk/reward structurally—the issue is *entry timing* relative to invalidation. If ROBOT broke support on your signal, stop hit correctly; if you entered into resistance and got shaken, that's execution, not sizing. Sizing itself (5x on $3.7K) is fine for a paper bot test.

**Call:** Post the chart setup + your invalidation thesis and I'll assess whether this was a good structure with bad timing or a bad structure period.

**Confidence: 0.4** (missing trade thesis and timeframe).

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$56.08, realized=$60.86, slippage=$4.78, breach=true
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

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.78
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 399,
  "adverseMovePct": 1.578,
  "riskBudget": {
    "plannedRiskUsd": 56.08,
    "realizedRiskUsd": 60.86,
    "riskSlippageUsd": 4.78,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.578,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T00:55:43.524Z",
    "exitTimestampUtc": "2026-03-05T07:34:43.550Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T00:55:43.524Z",
    "exitTimestampUtc": "2026-03-05T07:34:43.550Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 56.08,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
