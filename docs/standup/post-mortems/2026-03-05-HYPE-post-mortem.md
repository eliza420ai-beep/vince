# Post-mortem: HYPE long (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- HYPE long closed stop_loss: entry $31.76 -> exit $30.49, P&L $-83.67 (2056.7256776715976 USD, 3x).
- Entry time (UTC): 2026-03-05T07:05:16.471Z
- Hold window target: intraday
- Max loss budget: $82.27 (12.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 641 minutes
- Adverse move: 4.018%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing critical context:** I need to know *when* you entered (exact date/time) and *what CT sentiment was at entry vs. exit* — was HYPE rallying into your long, or was it already showing cracks? Also: did macro shift (BTC/ETH dump, Fed news, etc.) or was it pure HYPE-specific selling? Without the sentiment backdrop and macro timing, I can't tell you if this was a "sentiment mispriced you" or a "macro headwind you didn't account for" situation. Run me the entry/exit timestamps and I'll pull the X vibe from those windows.

**Confidence: 0.3** (can't assess without sentiment + macro context)

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, condition_id

I'd need the condition_id and close timestamp to pull live Polymarket odds for HYPE at your exit—that'd show whether the market repriced against you or if you caught a local dip the desk didn't. Missing: what was the Poly probability at entry vs exit, and was volume/spread widening into your stop? If HYPE was pricing >65% and you entered long on a short-term overreaction dip, a 4% stop is tight for mean-reversion plays; if Poly had already shifted to <50% before your exit, the market moved the regime and your stop was right. Post the market detail and I can give you the odds context.

Confidence: 0.3

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your thesis entry (support level, technical, narrative)? What triggered the stop—market structure break or volatility whipsaw? At 3x leverage on a $2,056 notional position, you're sizing for perps volatility; HYPE's recent chop ($28–$32 range) makes tight stops bleed. **Mechanics call:** If the stop was invalidated by structure (e.g., support held but you got stopped at noise), widen it next time or size down 50% to absorb chop without capitulation. If the thesis broke (support failed), the stop was right—accept the loss and move to next setup. **Missing:** entry thesis, stop trigger (market or time-based?), and whether this fits a larger sequence (win rate, avg loss size).

Confidence: 0.6

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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 77/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$82.27, realized=$83.67, slippage=$1.40, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 1.4
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
  "holdMinutes": 641,
  "adverseMovePct": 4.018,
  "riskBudget": {
    "plannedRiskUsd": 82.27,
    "realizedRiskUsd": 83.67,
    "riskSlippageUsd": 1.4,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 4.018,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 4,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T07:05:16.471Z",
    "exitTimestampUtc": "2026-03-05T17:45:56.635Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T07:05:16.471Z",
    "exitTimestampUtc": "2026-03-05T17:45:56.635Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 4,
    "maxLossUsd": 82.27,
    "maxLossPct": 12,
    "entryAtrPct": 7
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
