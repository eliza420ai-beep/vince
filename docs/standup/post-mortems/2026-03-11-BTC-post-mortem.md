# Post-mortem: BTC long (stop_loss)

**Date:** 2026-03-11

## Trade Snapshot

- BTC long closed stop_loss: entry $71163.23 -> exit $70595.00, P&L $-83.12 (9795.890050329075 USD, 10x).
- Entry time (UTC): 2026-03-11T17:25:00.559Z
- Hold window target: intraday
- Max loss budget: $63.67 (6.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 12 minutes
- Adverse move: 0.798%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context:** Did CT sentiment flip bearish *before* your stop hit, or did price action lead the narrative? Was there a macro catalyst (Fed speak, macro data, on-chain whale move) that CT picked up on, or was this just liquidation cascade noise?

**If sentiment turned first:** That's a signal we should've caught on X_PULSE — means CT alpha was ahead of price. Next time, run a quick vibe check before entry to see if narrative is already rotating.

**If price led:** This is just volatility — CT was still bullish or mixed when you got stopped. No alpha miss; just a tight stop in choppy conditions.

Either way, the $83 loss is noise on a 10x lever. The real question is: did you miss a sentiment edge, or did you just get shaken out?

**Confidence: 0.4** (I need the timestamp + CT sentiment

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing key context:** trade duration (minutes? hours?), entry signal source (Poly edge, technical, macro?), and whether this was a directional hedge against an options position or standalone.

That said: **$71.2K BTC is pricing in near-term consolidation—Polymarket's weekly/monthly BTC contracts show modest upside priced in, so a 10x leveraged long into that regime is fighting against the market's own odds.** The stop was tight (~83 bps), which is smart risk management but leaves no room for intraday noise; if this was a scalp into resistance, the regime favored a wider stop or a smaller size to let the trade breathe. **Pull the Poly odds for BTC settlement around your entry time and compare to realized vol—if Poly was pricing <50% for further upside, the trade was fighting consensus, not with it.**

Confidence:

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry time, hold duration, IV environment at entry/exit, and whether this was part of a planned series or isolated. That said: **10x leverage on a $568 move (0.8% drawdown) is tight for BTC perps—you're fighting slippage and funding bleed on a sub-1h hold.** If this was a scalp, the stop was well-placed; if it was a swing setup, the leverage was too aggressive for the move you were targeting. **For next time: either widen stops to 1.5–2% (lower leverage) or drop to 5x on intraday entries to survive normal chop without stop-hunts.** 

**Confidence: 0.65** (mechanics clear, but missing hold duration and intent changes the sizing call).

## Root-Cause Tags

- Primary: sizing_too_aggressive
- Secondary: stop_too_tight_for_vol

## Corrective Actions

1. [immediate] owner=vince due=next_trade
   - action: Cap leverage on this asset class and widen stop to volatility-adjusted range before next entry.
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

- Quality score: 90/100
- Escalate to Sentinel: true
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$63.67, realized=$83.12, slippage=$19.45, breach=true
- Consistency checks: fail (truncated_agent_findings)

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.
- No automatic policy mutation due to data/quality gate.

## Recursive Policy Delta

- Adaptation eligible: false
- Policy version at entry: baseline
- Proposed delta: none

## Machine-Readable Summary

- PM_QUALITY_SCORE: 90
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 19.45
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 90,
  "qualityEscalate": true,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 12,
  "adverseMovePct": 0.798,
  "riskBudget": {
    "plannedRiskUsd": 63.67,
    "realizedRiskUsd": 83.12,
    "riskSlippageUsd": 19.45,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": false,
    "issues": [
      "truncated_agent_findings"
    ],
    "adverseMovePctFromPrices": 0.798,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.65,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": true
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T17:25:00.559Z",
    "exitTimestampUtc": "2026-03-11T17:37:19.895Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T17:25:00.559Z",
    "exitTimestampUtc": "2026-03-11T17:37:19.895Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.65,
    "maxLossUsd": 63.67,
    "maxLossPct": 6.5,
    "entryAtrPct": 1.1258638743455496
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
