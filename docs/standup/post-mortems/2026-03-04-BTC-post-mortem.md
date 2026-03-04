# Post-mortem: BTC short (stop_loss)

**Date:** 2026-03-04

## Trade Snapshot

- BTC short closed stop_loss: entry $71073.78 -> exit $71539.00, P&L $-49.32 (7000 USD, 10x).
- Entry time (UTC): 2026-03-04T11:46:38.435Z
- Hold window target: intraday
- Max loss budget: $45.50 (6.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 82 minutes
- Adverse move: 0.655%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment at entry vs. exit? Was there a macro catalyst (Fed, inflation data, BTC inflow spike) that moved price against you, or pure liquidation cascade? Without the sentiment snapshot at your entry and the 24h vibe around that trade window, I can't tell you if you were contrarian-right-but-early or if you missed a signal. 

**What I'd need:** X_PULSE from your entry window + whether whales/alpha accounts were calling the short or fading it.

Confidence: 0.3 (can't assess without sentiment data)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need the trade date/time and which Polymarket BTC prediction(s) were pricing that move—were they showing >50% odds of a break above $71.5K, or was the market already pricing in that volatility? Without that regime lens, I can't tell if you shorted into a consensus fade or into crowd conviction.

**On the P&L alone:** $49 on 10x into a $71K range is tight risk-management (0.07% move), but if Poly was showing <40% odds of that upside, the trade thesis was sound—the loss is just variance in a tight setup. If Poly was showing >60% bull, you were fighting the market's own forecast.

**What I'd pull:** Run the trade timestamp against the orderbook depth and live odds for the BTC weekly/monthly prediction markets—that'll show whether you were early (good thesis

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** (1) What was your thesis invalidation trigger—was $71,539 your planned stop or did momentum shift unexpectedly? (2) What's your current perps sizing relative to options income ($1K+/week target)—is leverage eating into wheel capital? (3) Was this a hedge against our Hypersurface $70,500 BTC calls, or standalone directional?

**If standalone short:** $49.32 loss on $7K notional (0.7% slippage + fee drag) is clean, but 10x on a short in a bull regime without a clear invalidation signal suggests you're fighting momentum rather than trading structure. Better move: if you're bearish intraday, either (a) size smaller and tighter stop, or (b) use options (buy puts on Hypersurface, defined risk, no liquidation).

**

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

- Quality score: 94/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$45.50, realized=$49.32, slippage=$3.82, breach=true
- Consistency checks: pass

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

- PM_QUALITY_SCORE: 94
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 3.82
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 94,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 82,
  "adverseMovePct": 0.655,
  "riskBudget": {
    "plannedRiskUsd": 45.5,
    "realizedRiskUsd": 49.32,
    "riskSlippageUsd": 3.82,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.655,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.65,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-04T11:46:38.435Z",
    "exitTimestampUtc": "2026-03-04T13:09:03.544Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-04T11:46:38.435Z",
    "exitTimestampUtc": "2026-03-04T13:09:03.544Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.65,
    "maxLossUsd": 45.5,
    "maxLossPct": 6.5,
    "entryAtrPct": 1.1641884816753927
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
