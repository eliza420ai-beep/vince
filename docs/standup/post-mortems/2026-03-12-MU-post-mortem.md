# Post-mortem: MU long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- MU long closed stop_loss: entry $415.96 -> exit $409.53, P&L $-25.04 (1568.5487999999998 USD, 5x).
- Entry time (UTC): 2026-03-12T11:13:50.098Z
- Hold window target: intraday
- Max loss budget: $23.53 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 138 minutes
- Adverse move: 1.547%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on semis/MU at entry vs. exit? Was there a macro event (Fed speak, earnings surprise, sector rotation) that shifted the vibe? Without the timestamp and sentiment snapshot, I can't tell if you got caught in a genuine shift or just noise. 

**What I need to give you real feedback:** Run X_PULSE filtered to semiconductor/chip sector sentiment for the entry–exit window, and I'll tell you if CT saw the move coming or if it was a surprise macro whip.

Confidence: 0.3 (can't assess sentiment impact without timing + pulse data)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket MU prediction (yes/no, earnings date, current odds) and trade duration—was this intraday noise or a thesis break? That said, a $1.5K loss on a $415 entry with 5x leverage suggests tight stops in a choppy regime; if MU's prediction market showed <55% conviction either direction at entry, you were fighting the consensus. Check whether the stop was hit on a wick or a breakdown—if wick, the regime was range-bound and 5x was over-leveraged for that vol; if breakdown, the thesis (bullish MU) lost the market's confidence and you exited right. **Confidence: 0.6** (need the Polymarket snapshot and trade duration to upgrade this).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your thesis invalidation trigger (funding spike, macro shift, technicals)? Did the stop hit on volume or slippage, and was position size (5x on ~$1.6K notional) sized to your edge/timeframe?

**On mechanics:** $25 loss on a $1.6K position is tight risk management (1.5% of notional), which is good; 5x leverage on a stock position demands either sub-hour holding or a very high-conviction setup. If MU was a multi-day thesis and funding/macro broke it, the stop was right. If it was a scalp that got shaken out, consider whether 3x or unlevered would let you hold through noise.

**Next:** Post your entry thesis + what actually broke it, and I'll assess whether the stop was well-placed or if position structure (size/leverage/timeframe m

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
- Risk budget: planned=$23.53, realized=$25.04, slippage=$1.51, breach=true
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
- PM_RISK_SLIPPAGE_USD: 1.51
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
  "adverseMovePct": 1.547,
  "riskBudget": {
    "plannedRiskUsd": 23.53,
    "realizedRiskUsd": 25.04,
    "riskSlippageUsd": 1.51,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.547,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T11:13:50.098Z",
    "exitTimestampUtc": "2026-03-12T13:31:57.291Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T11:13:50.098Z",
    "exitTimestampUtc": "2026-03-12T13:31:57.291Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 23.53,
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
