# Post-mortem: US500 short (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- US500 short closed max_age: entry $671.86 -> exit $672.70, P&L $-2.48 (1411.1999999999998 USD, 5x).
- Entry time (UTC): 2026-03-11T23:12:51.172Z
- Hold window target: intraday
- Max loss budget: $21.17 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.126%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Sentiment read on the trade:**

The macro sentiment backdrop matters here — was CT bearish on equities/risk-off when you entered, or had the vibe shifted bullish by exit? US500 shorts typically work when crypto Twitter is in capitulation mode (macro fear dominating), but if sentiment flipped to risk-on (Fed pivot talk, BTC strength) between entry and exit, that's your headwind. Without knowing the CT macro pulse at entry vs. exit, I can't tell if you fought sentiment or got caught in a reversal. **Missing context:** What was the macro/equity sentiment on X when you entered vs. when you closed? Was there a news catalyst (Fed speak, jobs data, BTC move)?

**Confidence: 0.4** (incomplete macro picture)

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** entry/exit timestamps, Polymarket odds on US500 direction at those points, and whether this was a reversion or trend trade. That said—a 84¢ adverse move on a $671 short with 5x leverage is tight risk management, and the loss ($1.4K on $14.2K notional) suggests the trade was sized right for a scalp. **The real question:** was this fighting a macro bid (Fed/macro Polymarkets showing risk-on), or did you get caught in intraday chop? If Poly odds on "S&P 500 ends month higher" were >65% at entry, you were shorting into consensus—that's regime work, not edge. Pull the Polymarket odds snapshot at your entry time and I can tell you if you were fighting the market's own forecast.

**Confidence: 0.4** (

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry time, exit time, duration held, IV/vol regime at entry vs exit, and reason for exit (stop hit, thesis break, time decay?). On mechanics alone: 5x leverage on a $2.48 loss across ~$672 notional is tight risk management (0.37% loss), but US500 is **not our core edge** — our edge is BTC/ETH/SOL options on Hypersurface and HIP-3 spot once liquidity improves. Paper perps on equities should be thesis-driven (AI bottleneck, sector rotation) with clear invalidation; this trade lacks both in your brief. **Call:** Post the full trade thesis, entry/exit times, and vol context so I can assess whether it's a clean micro-loss or a signal to tighten entry criteria.

Confidence: 0.4

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$21.17, realized=$2.48, slippage=$-18.69, breach=false
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

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -18.69
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.126,
  "riskBudget": {
    "plannedRiskUsd": 21.17,
    "realizedRiskUsd": 2.48,
    "riskSlippageUsd": -18.69,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.126,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T23:12:51.172Z",
    "exitTimestampUtc": "2026-03-12T11:12:58.081Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T23:12:51.172Z",
    "exitTimestampUtc": "2026-03-12T11:12:58.081Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 21.17,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
