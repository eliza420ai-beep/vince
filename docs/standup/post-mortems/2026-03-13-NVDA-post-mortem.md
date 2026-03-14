# Post-mortem: NVDA long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- NVDA long closed stop_loss: entry $185.41 -> exit $182.49, P&L $-75.67 (4661.2 USD, 5x).
- Entry time (UTC): 2026-03-13T13:31:13.544Z
- Hold window target: intraday
- Max loss budget: $69.92 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 76 minutes
- Adverse move: 1.573%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

I'd need to know **when** this trade closed and **what CT sentiment was at entry/exit** — was NVDA/tech sentiment shifting bearish into your entry, or did macro flip during the hold? That context tells me if you fought the vibe or got caught in a sentiment reversal. Also: did you check whale positioning on NVDA before entry, or was this pure technicals? Without the timing and sentiment backdrop, I can't tell if this was a "fought the crowd" miss or a "macro rug pulled" scenario.

**Confidence: 0.3** (missing core context — ask me to run X_PULSE on NVDA sentiment around your entry/exit timestamp and I can give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing critical context:** I need the trade date/time, the NVDA options chain IV at entry/exit, and whether this was hedged against Polymarket tech sentiment or earnings flow. That said: a $2.92 stop (1.6% loss on 5x) suggests tight risk management, but NVDA's recent vol regime and the fact that tech prediction markets (e.g., "NVDA beats earnings by X%") often front-run spot moves means your entry may have been late in a consensus-pricing cycle—the market had already priced the move. Pull the live NVDA earnings or tech sector Polymarket odds around your entry time; if they showed >70% conviction one way, your stop was right but your entry timing was off, not your thesis. 

**Confidence: 0.4** (without trade timestamp and IV data, I'm pattern-matching, not analyzing your specific regime

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, exit date, IV environment, and whether this was part of a broader hedge or standalone directional bet—hard to assess mechanics without the timeline and thesis invalidation signal.

**On what you gave me:** $185.41 entry with 5x leverage on a $4.6K notional is aggressive for a stock (especially semi-cap volatility); the $2.92 stop loss is tight (~1.6% from entry), which suggests either a scalp setup or undersized conviction. If NVDA was rallying into earnings or a known catalyst, tighter stops make sense; if it was a swing entry in a consolidation, that stop is too hair-trigger and will bleed you on noise.

**Call:** Post the entry thesis (date, catalyst, timeframe, why 5x?) and I'll tell you if the stop placement was the mistake or if the position sizing was wrong from

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
- Risk budget: planned=$69.92, realized=$75.67, slippage=$5.75, breach=true
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
- PM_RISK_SLIPPAGE_USD: 5.75
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
  "holdMinutes": 76,
  "adverseMovePct": 1.573,
  "riskBudget": {
    "plannedRiskUsd": 69.92,
    "realizedRiskUsd": 75.67,
    "riskSlippageUsd": 5.75,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.573,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T13:31:13.544Z",
    "exitTimestampUtc": "2026-03-13T14:47:41.074Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T13:31:13.544Z",
    "exitTimestampUtc": "2026-03-13T14:47:41.074Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 69.92,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
