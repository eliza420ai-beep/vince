# Post-mortem: SNDK long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- SNDK long closed stop_loss: entry $653.00 -> exit $643.17, P&L $-81.88 (5264.256292906178 USD, 5x).
- Entry time (UTC): 2026-03-11T19:48:20.962Z
- Hold window target: intraday
- Max loss budget: $78.96 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 274 minutes
- Adverse move: 1.505%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on SNDK at entry vs. exit? Was there a macro catalyst or earnings surprise that shifted the vibe? Without the timeline and what X was saying about the trade, I can't tell if you got caught in a sentiment reversal or if CT missed a signal entirely.

**What I'd need to give you real feedback:** A 24h X_PULSE on SNDK around your entry, and whether whale/alpha accounts were long or short. Then I can flag if sentiment diverged from price action.

Confidence: 0.2 (not my lane without sentiment data; defer to Solus for execution feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 35%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context blocks the full read:** I'd need the entry/exit timestamps, what regime shift (vol spike, macro catalyst, earnings?) triggered the stop, and whether any Polymarket prediction markets on semiconductors or SNDK specifically showed deteriorating odds into your exit. A $81.88 loss on 5x leverage is modest—the real question is whether the market repriced risk *before* your stop hit (suggesting slow signal) or *after* (suggesting the stop was well-placed). Without the market-pricing context from my lane, I can't tell if this was a regime miss or just bad luck on timing. **What I'd pull:** Grab any semiconductor or SNDK sentiment from trending Polymarket markets around your entry/exit window—if prediction odds were already shifting bearish, your entry was fighting consensus. If odds held firm, the stop was probably noise, not signal.

**Confidence: 0.35**

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing key context:** entry date, hold duration, invalidation thesis, and what triggered the stop (market move vs. thesis break). On mechanics alone: $5.2K loss on a $653 entry with 5x leverage is tight risk management (0.8% stop), but at that leverage you're fighting slippage and whipsaw—SNDK semis are volatile intraday. If this was a thesis trade (e.g., "SNDK breaks $655 on earnings"), the stop placement matters; if it was directional scalp, the 5x sizing is reasonable for a $5K loss bucket. **Call:** Post the entry thesis and hold duration—without that, I can't tell if the stop was well-placed or if you got shaken out of a valid setup.

**Confidence: 0.4** (structure is sound, but thesis unknown).

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
- Risk budget: planned=$78.96, realized=$81.88, slippage=$2.92, breach=true
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
- PM_RISK_SLIPPAGE_USD: 2.92
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
  "holdMinutes": 274,
  "adverseMovePct": 1.505,
  "riskBudget": {
    "plannedRiskUsd": 78.96,
    "realizedRiskUsd": 81.88,
    "riskSlippageUsd": 2.92,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.505,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T19:48:20.962Z",
    "exitTimestampUtc": "2026-03-12T00:22:50.930Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T19:48:20.962Z",
    "exitTimestampUtc": "2026-03-12T00:22:50.930Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 78.96,
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
