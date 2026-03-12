# Post-mortem: AMD long (stop_loss)

**Date:** 2026-03-11

## Trade Snapshot

- AMD long closed stop_loss: entry $205.37 -> exit $202.25, P&L $-50.65 (3226.8108108108113 USD, 5x).
- Entry time (UTC): 2026-03-11T13:29:31.004Z
- Hold window target: intraday
- Max loss budget: $48.40 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 605 minutes
- Adverse move: 1.52%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on AMD at entry vs. exit? Was there a macro event (Fed, earnings, sector rotation) that shifted the vibe between those two points?

**On the loss itself:** A 1.5% stop on a 5x is tight—totally reasonable risk management. But without knowing *what CT was saying about semiconductors/AMD during your hold*, I can't tell you if sentiment shifted against you or if this was just noise. Sentiment doesn't predict intraday wiggles, but it *does* flag when macro/sector conviction changes.

**What I need to help:** Pull the exact entry/exit timestamps, and I'll run an X_PULSE on AMD/semis for that window to see if CT turned on the trade.

Confidence: 0.3 (can't assess without timing + sentiment data)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** entry timestamp, exit timestamp, what regime shift (macro, earnings, sector rotation) triggered the stop, and whether AMD options (weeklies especially) were pricing a move below $202 at entry. 

**On the trade itself:** A $3.25 stop on a $205 entry (1.6% risk) with 5x leverage is tight for a perps swing—you're fighting intraday noise. If Polymarket prediction markets or options IV were pricing AMD weakness into that window, the stop made sense; if not, you may have been stopped into a regime the market didn't expect. 

**To improve post-mortems:** Pull the live Polymarket odds for AMD price ranges at entry/exit (if they exist) and check what weeklies were implying for realized vol—that'll tell you if the market saw the downside risk you didn't price in.

**Confidence

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** What was your invalidation for the AMD long, and did price break it cleanly or did you get shaken out before the signal? 5x leverage on a $205 entry with a $3.12 stop (1.5% risk) is tight—typical for a scalp, but if you're holding >5min, that's overlevered for noise. The $50 loss on $3.2K notional isn't the issue; the structure is: **did the thesis break, or did you get stopped in chop?** If thesis broke, the trade was right (take the loss, move on). If you got shaken, tighten your conviction or widen the stop. Can't assess without knowing what invalidated the long.

**Confidence: 0.3** (structure question, not outcome judgment).

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
- Risk budget: planned=$48.40, realized=$50.65, slippage=$2.25, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 2.25
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
  "holdMinutes": 605,
  "adverseMovePct": 1.52,
  "riskBudget": {
    "plannedRiskUsd": 48.4,
    "realizedRiskUsd": 50.65,
    "riskSlippageUsd": 2.25,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.52,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T13:29:31.004Z",
    "exitTimestampUtc": "2026-03-11T23:34:50.481Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T13:29:31.004Z",
    "exitTimestampUtc": "2026-03-11T23:34:50.481Z"
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
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
