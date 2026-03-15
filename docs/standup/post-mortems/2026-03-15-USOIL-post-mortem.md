# Post-mortem: USOIL long (stop_loss)

**Date:** 2026-03-15

## Trade Snapshot

- USOIL long closed stop_loss: entry $124.03 -> exit $122.12, P&L $-156.11 (9795.25947295423 USD, 10x).
- Entry time (UTC): 2026-03-15T01:18:35.593Z
- Hold window target: intraday
- Max loss budget: $146.93 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 25 minutes
- Adverse move: 1.544%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter/exit (time window)? What was CT sentiment on macro/energy at entry vs. exit? Were there geopolitical shifts or Fed moves that shifted the vibe?

**On the loss itself:** USOIL is macro-driven (geopolitics, dollar strength, supply shocks) — not a crypto sentiment play, so I can't give you alpha here. That's Solus's lane (execution/sizing) and Vince's (macro data). What I *can* flag: if CT was euphoric on energy/inflation hedges at your entry, that's a contrarian warning signal for reversals.

**Confidence: 0.3** — I need the timestamp and what macro narrative was dominating CT when you traded.

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id, entry_datetime

**Missing context:** I need the trade date/timeframe and whether you had a Polymarket oil-price signal active (e.g., "Will crude close above $125 by EOW?"). Without that, I can't tie the stop-loss hit to regime shifts or mispricing in the prediction market.

**What I can say:** A $1.91 move (1.5%) on 10x leverage is tight—suggests you entered near support and got shaken out, likely on noise or a brief liquidation cascade rather than a structural break. If Polymarket was pricing oil *higher* at entry, the stop-loss kill was a liquidity event, not a regime call.

**Action:** Pull the condition_id for the oil market active that day and your entry time; I'll check if Poly odds diverged from spot at exit and flag whether the market was mispricing the move.

**Confidence:

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry signal (what triggered the long?), hold time, and whether this was sized within the paper bot's risk envelope. On mechanics alone: $156 loss on $9.8K notional (1.6% drawdown) with 10x leverage is tight risk management—the stop was only ~1.5% below entry, which is aggressive for crude oil's typical intraday range. If this is the bot's standard structure, it's sound; if it's ad-hoc, you're risking whipsaws. Next trade: log the signal quality (was the setup high-conviction or noise?) so we can tune bot entry rules.

**Confidence: 0.6** (mechanics clean, but signal quality unknown).

## Root-Cause Tags

- Primary: sizing_too_aggressive
- Secondary: none

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
   - action: A/B test defined-risk structure recommendation vs spot leverage entries.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 81/100
- Escalate to Sentinel: true
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$146.93, realized=$156.11, slippage=$9.18, breach=true
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

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 9.18
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 81,
  "qualityEscalate": true,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 25,
  "adverseMovePct": 1.544,
  "riskBudget": {
    "plannedRiskUsd": 146.93,
    "realizedRiskUsd": 156.11,
    "riskSlippageUsd": 9.18,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": false,
    "issues": [
      "truncated_agent_findings"
    ],
    "adverseMovePctFromPrices": 1.544,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": true
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-15T01:18:35.593Z",
    "exitTimestampUtc": "2026-03-15T01:43:25.145Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-15T01:18:35.593Z",
    "exitTimestampUtc": "2026-03-15T01:43:25.145Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 1.5,
    "maxLossUsd": 146.93,
    "maxLossPct": 15,
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
  "regimeVsExecution": "execution_miss"
}
```
