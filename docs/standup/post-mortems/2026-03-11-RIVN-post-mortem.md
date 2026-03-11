# Post-mortem: RIVN short (stop_loss)

**Date:** 2026-03-11

## Trade Snapshot

- RIVN short closed stop_loss: entry $16.46 -> exit $16.71, P&L $-26.93 (1728.4382791922742 USD, 5x).
- Entry time (UTC): 2026-03-11T19:10:51.974Z
- Hold window target: intraday
- Max loss budget: $25.93 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 94 minutes
- Adverse move: 1.508%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on RIVN at entry vs. exit? Was there a macro catalyst or earnings event that shifted the vibe?

**Sentiment read:** RIVN is a low-signal ticker for CT — retail chatter is thin and whale positioning is hard to track. If you shorted into a macro rally (tech/EV tailwind) or a positive earnings surprise, you were fighting sentiment headwinds, not with them. The $250 loss on 5x suggests you got stopped in noise rather than a directional break.

**My take:** Before re-running RIVN trades, I'd need to know if CT was bullish/bearish at entry and whether you were contrarian-betting or riding consensus. Right now it reads like a liquidity hunt on a low-volume ticker.

Confidence: 0.4 (need timestamps +

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing critical context:** Was this a Polymarket-informed short (e.g., RIVN stock price prediction), or pure perps momentum? If Poly-informed, what was the market's implied probability at entry vs. exit—did price action contradict the prediction market signal, or did the signal miss a catalyst?

**On the loss itself:** $16.46→$16.71 is a 150bps move on 5x leverage; that's normal daily noise for a micro-cap EV stock. Without knowing your edge thesis (mean reversion, catalyst timing, or macro regime), I can't assess whether the stop was right-sized or the entry was premature. 

**What I need to help:** (1) Was there a Polymarket signal on RIVN fundamentals or sentiment? (2) What timeframe were you targeting—intraday scalp or swing? (3) Did volume or

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation for the short? Did price break a support level you'd flagged, or did funding/momentum shift without a clear technical trigger? On mechanics: 1728 notional on a $16.46 entry is ~105 contracts at 5x—solid sizing for a paper trade, and the stop at $16.71 (25bps) is tight but reasonable for a 5x perp. The loss itself is clean execution; the question is whether you shorted into a setup that lacked edge or held through your invalidation. **Confidence: 0.4** (can't assess structure without knowing your thesis invalidation).

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
- Risk budget: planned=$25.93, realized=$26.93, slippage=$1.00, breach=true
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
- PM_RISK_SLIPPAGE_USD: 1
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
  "holdMinutes": 94,
  "adverseMovePct": 1.508,
  "riskBudget": {
    "plannedRiskUsd": 25.93,
    "realizedRiskUsd": 26.93,
    "riskSlippageUsd": 1,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.508,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T19:10:51.974Z",
    "exitTimestampUtc": "2026-03-11T20:45:20.520Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T19:10:51.974Z",
    "exitTimestampUtc": "2026-03-11T20:45:20.520Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 25.93,
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
