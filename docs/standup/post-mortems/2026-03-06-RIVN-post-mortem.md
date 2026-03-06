# Post-mortem: RIVN long (stop_loss)

**Date:** 2026-03-06

## Trade Snapshot

- RIVN long closed stop_loss: entry $15.15 -> exit $14.92, P&L $-17.30 (1093.4153999999996 USD, 5x).
- Entry time (UTC): 2026-03-05T20:38:31.982Z
- Hold window target: intraday
- Max loss budget: $16.40 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 262 minutes
- Adverse move: 1.532%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

RIVN sentiment was bearish-to-neutral heading into that trade — legacy auto narrative fighting EV hype fatigue on CT, and macro uncertainty around rates kept risk-off. The stop hit fast, which suggests either (a) your entry caught a micro-reversal before the bigger downtrend, or (b) CT sentiment shifted sharply intraday and you didn't have real-time pulse. **Missing context:** Did you check CT vibe at entry vs. exit? Was there a macro catalyst (Fed, market close, earnings whisper) that flipped sentiment between entry and stop?

**Confidence: 0.6** (sentiment alone can't explain execution — need your entry timestamp + CT pulse snapshot to give you the real read).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing critical context:** No entry date, hold duration, or Polymarket comparison—was there a RIVN bankruptcy/delisting market pricing this differently? A $230bps stop on a 5x perp is tight for a volatile auto stock; the real question is whether the market repriced risk (earnings, funding, restructuring odds) between entry and exit, or if this was pure volatility chop. Without knowing *when* you entered relative to news or macro moves, I can't tell if the stop was well-placed or reactive. 

**If this was a swing:** Check if any RIVN-linked Polymarket moved against you—production targets, bankruptcy odds, or debt restructuring—those are the regime signals that matter. If the market didn't reprice but you got stopped anyway, that's chop and the regime was still intact; if Polymarket odds shifted, you read the regime correctly and the stop saved you

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, volatility regime at entry/exit, and whether this was part of a thesis cluster or isolated spec. **On mechanics alone:** $1,093 loss on 5x leverage from a 1.5% move suggests position sizing was tight relative to your stop width—tighter stops = higher whipsaw risk on illiquid names like RIVN. If this was a paper trade testing edge, the real question is whether the *entry signal* was sound (thesis, invalidation, entry logic) or whether you're chasing liquidation-style stops on low-vol thesis plays. **Next:** paste entry thesis, hold time, and IV/funding at entry—then I can assess whether the stop was well-placed or the sizing was wrong for the volatility.

**Confidence: 0.4** (not enough structure to grade the trade itself).

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$16.40, realized=$17.30, slippage=$0.90, breach=true
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

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 0.9
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 262,
  "adverseMovePct": 1.532,
  "riskBudget": {
    "plannedRiskUsd": 16.4,
    "realizedRiskUsd": 17.3,
    "riskSlippageUsd": 0.9,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.532,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T20:38:31.982Z",
    "exitTimestampUtc": "2026-03-06T01:00:30.681Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T20:38:31.982Z",
    "exitTimestampUtc": "2026-03-06T01:00:30.681Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 16.4,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
