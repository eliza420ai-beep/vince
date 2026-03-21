# Post-mortem: COIN long (max_age)

**Date:** 2026-03-20

## Trade Snapshot

- COIN long closed max_age: entry $202.00 -> exit $199.71, P&L $-59.10 (4992 USD, 5x).
- Entry time (UTC): 2026-03-20T11:00:56.220Z
- Hold window target: intraday
- Max loss budget: $187.20 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 1.134%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** What was CT saying about COIN at entry vs. exit? Did sentiment shift before price broke, or did price move first? Was there a macro event (Fed, BTC dump, sector rotation) that CT flagged but the trade thesis missed?

Without the sentiment timeline, I can't tell if this was a "CT got it wrong" or a "trade ignored what CT was signaling." Run me the dates/times and I'll pull the X vibe for both moments — that'll show if sentiment was a leading or lagging indicator here.

**Confidence: 0.3** (can't assess sentiment impact without the data).

### Oracle

- Lane: prediction market regime
- Confidence: 0%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need the trade date/timeframe and your entry thesis (macro catalyst, technicals, or Polymarket-derived signal?) to isolate regime vs. execution. That said: a $200 range on COIN typically tracks BTC momentum + spot ETF flows—if this was a multi-day hold, you likely caught a micro-reversion into resistance or got caught on a Fed-speak reversal. **Polymarket lens:** Check if any crypto-policy or SEC-action markets moved against you during your hold; those often front-run spot moves 4–12h. The 5x leverage on a $200 stock amplifies intraday chop—if entry was thesis-driven (not mean-reversion), the loss suggests either thesis invalidation or bad timing into a crowded trade. Post this with entry date and I can cross it against Poly events/volume.

**Confidence: 0

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** Entry date, exit date, reason for close (stop hit, thesis break, time decay?), and what IV/funding looked like at entry vs exit. On structure: 5x leverage on a $202 entry on COIN is aggressive for a perps trade—that's $1M notional on a ~$5M daily volume asset, meaningful slippage risk. The $59 loss on $4,992 risk (1.2% loss) suggests either tight stops or early exit; if it was a thesis trade, you closed too fast; if it was a scalp, sizing was too large for the venue. Without entry/exit timestamps and the trigger, I can't assess whether this was a mechanics failure (bad entry, poor risk/reward) or execution (wrong product for size).

**Confidence: 0.4** (too many unknowns to be direct).

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
- Risk budget: planned=$187.20, realized=$59.10, slippage=$-128.10, breach=false
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
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -128.1
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
  "holdMinutes": 720,
  "adverseMovePct": 1.134,
  "riskBudget": {
    "plannedRiskUsd": 187.2,
    "realizedRiskUsd": 59.1,
    "riskSlippageUsd": -128.1,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.134,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T11:00:56.220Z",
    "exitTimestampUtc": "2026-03-20T23:01:13.393Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:00:56.220Z",
    "exitTimestampUtc": "2026-03-20T23:01:13.393Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 187.2,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "entry_datetime"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
