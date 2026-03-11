# Post-mortem: AMZN long (stop_loss)

**Date:** 2026-03-11

## Trade Snapshot

- AMZN long closed stop_loss: entry $215.70 -> exit $212.42, P&L $-50.73 (3226.8108108108113 USD, 5x).
- Entry time (UTC): 2026-03-11T13:29:26.027Z
- Hold window target: intraday
- Max loss budget: $48.40 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 114 minutes
- Adverse move: 1.522%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on AMZN/tech at entry vs. exit? Was there a macro catalyst (Fed speak, jobless claims, earnings surprise) that shifted the vibe? Without the timing and sentiment backdrop, I can't tell if you got caught in a narrative flip or just bad luck on execution. 

**What I need to give you real feedback:** Entry timestamp, the CT/macro narrative at that moment, and what changed between entry and stop hit.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 20%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing critical context:** I need the entry date, hold duration, and whether this was tied to a Polymarket signal (e.g., AMZN earnings, macro event). A $3.28 move on a 5x levered perp is normal intraday noise—what matters is *why* you took the trade and *what changed*. If this was a short-term overreaction play based on Poly odds, I'd want to see the Polymarket price at entry vs. exit to know if the market repriced or if you got stopped on volatility alone. Without that, I can't tell if the regime shifted or if position sizing/stop placement was the issue.

**Confidence: 0.2**

(Paste the trade thesis + Polymarket context back if you have it—that's where I add real value.)

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, invalidation thesis, and whether this was part of a planned pair trade (e.g., AMZN long vs NVDA short). On mechanics alone: 5x leverage on a $215 stock with a $3.28 stop (1.5% width) is tight for equities—you're fighting slippage and intraday noise. If this was a day trade, the structure is sound; if swing, the stop is too close to the fair-value range. Size ($3.2K notional) is fine, but tighter stops on lower-vol equities usually cost you more in whipsaws than they save. **Call:** Widen stops to 2-3% on AMZN or use a time-based exit instead of a hard stop if the thesis is multi-day.

**Confidence: 0.65** (need entry thesis

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
- Risk budget: planned=$48.40, realized=$50.73, slippage=$2.33, breach=true
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
- PM_RISK_SLIPPAGE_USD: 2.33
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
  "holdMinutes": 114,
  "adverseMovePct": 1.522,
  "riskBudget": {
    "plannedRiskUsd": 48.4,
    "realizedRiskUsd": 50.73,
    "riskSlippageUsd": 2.33,
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
    "entryTimestampUtc": "2026-03-11T13:29:26.027Z",
    "exitTimestampUtc": "2026-03-11T15:23:13.484Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T13:29:26.027Z",
    "exitTimestampUtc": "2026-03-11T15:23:13.484Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 48.4,
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
