# Post-mortem: MSTR long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- MSTR long closed stop_loss: entry $135.94 -> exit $133.78, P&L $-79.22 (4839.466666666666 USD, 5x).
- Entry time (UTC): 2026-03-12T13:48:35.614Z
- Hold window target: intraday
- Max loss budget: $72.59 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 64 minutes
- Adverse move: 1.587%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on MSTR at entry vs. exit? Was there a macro event (rate decision, Fed speak, tech earnings) that shifted the vibe between entry and stop? Without the sentiment backdrop and timing, I can't tell if this was a CT mispricing that resolved or a macro whipsaw you couldn't have seen coming.

**What I'd need to give you real feedback:** Run X_PULSE on MSTR + macro for the entry window, then we can see if CT was sleeping on the move or if the trade just got caught in broader liquidation noise.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: entry timestamp, hold duration, and whether this correlated with macro vol or MSTR-specific news. That said—a 1.6% stop hit on a 5x levered perp position suggests tight risk management, which is sound, but the real lesson depends on *why* MSTR sold off (BTC weakness, equity rotation, or noise). Check if Polymarket had a concurrent BTC or macro prediction market active at entry—if so, did the odds shift *before* price moved? That tells you whether you got caught in a repricing or a regime break. Without that, this looks like disciplined execution on a micro loss, not a strategic miss.

**Confidence: 0.4** (need trade timestamp + macro context to assess edge quality).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold duration, market regime (was BTC rallying or consolidating?), and whether this was part of a larger MSTR thesis or a tactical trade. That said, the mechanics: 1.6% loss on spot ($135.94→$133.78) became 8% loss on 5x leverage—textbook leverage amplification, which is fine if it was a defined-risk trade with a plan. The stop at $133.78 is tight (~1.6% from entry); if MSTR was ranging or consolidating, that's whipsaw territory. **Call:** Tighter stops work on volatile assets only if you're trading intraday; on swing thesis, widen to 3–5% or use a time-stop instead. Paper bot is learning—this is a good data point for tuning stop placement.

**Confidence: 0.65** (mechanics

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
- Risk budget: planned=$72.59, realized=$79.22, slippage=$6.63, breach=true
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
- PM_RISK_SLIPPAGE_USD: 6.63
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
  "holdMinutes": 64,
  "adverseMovePct": 1.587,
  "riskBudget": {
    "plannedRiskUsd": 72.59,
    "realizedRiskUsd": 79.22,
    "riskSlippageUsd": 6.63,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.587,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T13:48:35.614Z",
    "exitTimestampUtc": "2026-03-12T14:52:31.247Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T13:48:35.614Z",
    "exitTimestampUtc": "2026-03-12T14:52:31.247Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 72.59,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
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
