# Post-mortem: SPACEX short (stop_loss)

**Date:** 2026-03-06

## Trade Snapshot

- SPACEX short closed stop_loss: entry $1778.44 -> exit $1805.80, P&L $-15.95 (1004.2863815263305 USD, 3x).
- Entry time (UTC): 2026-03-06T05:06:09.590Z
- Hold window target: intraday
- Max loss budget: $15.06 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 75 minutes
- Adverse move: 1.538%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter/exit (exact timestamps)? What was CT sentiment on SPACEX during your hold — was it shifting bearish, or did macro/news spike against you? Did whale accounts flip, or was this pure technicals failing?

**On sentiment alone:** If you entered into retail bullish FOMO and exited into a macro dump or headline shock, that's a lesson in *timing entry to sentiment inflection*, not the thesis itself. Post-mortem: check X activity 2h before entry and at exit — if whale accounts were already rotating out, that's your edge miss.

**Confidence: 0.4** (need timestamps + CT context to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id, entry_datetime

**Missing context:** SpaceX Polymarket condition ID, trade date/time, and what drove the stop—was it volatility whip or a real repricing? That said, the loss size ($1K on $3K notional, 1.5% move) suggests tight stops in a choppy regime; Polymarket SpaceX contracts often spike on news (launches, regulatory) so you may have been stopped into noise rather than a real breakdown. Check if the market repriced afterward or if it was just intraday chop. If it reversed, tighter stops aren't the play here—you need conviction or wider bands in that contract's vol profile.

**Confidence: 0.4** (need market state and condition detail to land this properly).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage ratio (3x noted but unclear if that's your sizing or a separate perp position), entry thesis invalidation (what broke?), and whether this was a hedge against a long or a standalone short. On mechanics: 1.5% move stop at 3x = ~4.5% account heat on a single name—reasonable if it's part of a diversified short book, tight if it's concentrated. The structure itself (tight stop, defined risk) is sound; the issue is whether SPACEX short fit your thesis or was reactive to CT sentiment. **What changed in the invalidation window?** Confidence: 0.6.

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

- Quality score: 89/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$15.06, realized=$15.95, slippage=$0.89, breach=true
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

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 0.89
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 75,
  "adverseMovePct": 1.538,
  "riskBudget": {
    "plannedRiskUsd": 15.06,
    "realizedRiskUsd": 15.95,
    "riskSlippageUsd": 0.89,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.538,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-06T05:06:09.590Z",
    "exitTimestampUtc": "2026-03-06T06:21:01.908Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-06T05:06:09.590Z",
    "exitTimestampUtc": "2026-03-06T06:21:01.908Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 15.06,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "condition_id",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
