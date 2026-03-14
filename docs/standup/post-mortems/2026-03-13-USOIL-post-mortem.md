# Post-mortem: USOIL long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- USOIL long closed stop_loss: entry $117.06 -> exit $115.26, P&L $-57.47 (3612.96 USD, 5x).
- Entry time (UTC): 2026-03-13T09:01:12.380Z
- Hold window target: intraday
- Max loss budget: $54.19 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 110 minutes
- Adverse move: 1.541%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter? What was CT saying about energy/macro at entry vs. exit? Did you trade against sentiment or with it? 

Without the timestamp and sentiment backdrop, I can't tell you if this was a "fought the crowd" miss or a "macro shifted and nobody called it" situation — both are different lessons. Oil sentiment moves on Fed speak, geopolitical risk, and USD strength; if you entered into bearish macro chatter (dollar rally, recession fears), that's a structural headwind I'd flag in hindsight.

**Confidence: 0.2** — need the trade date and what CT/macro was pricing to give real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the trade date, duration held, and what drove the stop—was it volatility whipsaw or a regime break? USOIL pricing on Polymarket (if available) would show what the prediction market was pricing for geopolitical/supply risk at entry/exit, which is the real lens for oil directional calls.

**On the loss itself:** A $57.47 loss on a 5x levered position is tight risk management, but without knowing if you were fighting a broader macro shift (Fed pivot, demand data, Middle East headlines) or just caught a wick, I can't tell if the stop was well-placed or reactive. Oil is regime-sensitive—if the market repriced supply/demand expectations between entry and exit, that's information, not a mistake.

**What I'd pull:** Polymarket oil price action and open interest around your trade window. If the prediction market was pricing

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry thesis (macro oil view, invalidation signal), hold duration (hours? days?), and whether $57.47 loss was acceptable given position size relative to weekly premium target. **Mechanics read:** 5x leverage on $3,612 notional is aggressive for a commodity that moves 1-2% daily—you're fighting slippage and funding on a thin edge. **Structure call:** If USOIL was a hedge or short-duration trade, the stop at -1.5% is tight; if it was directional conviction, you need a clearer thesis and wider invalidation before re-entry. **Next:** Paste the entry thesis and I'll assess whether this was a bad structure or just bad timing.

**Confidence: 0.4** (mechanics clear, thesis missing).

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
- Risk budget: planned=$54.19, realized=$57.47, slippage=$3.28, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 3.28
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
  "holdMinutes": 110,
  "adverseMovePct": 1.541,
  "riskBudget": {
    "plannedRiskUsd": 54.19,
    "realizedRiskUsd": 57.47,
    "riskSlippageUsd": 3.28,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.541,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T09:01:12.380Z",
    "exitTimestampUtc": "2026-03-13T10:51:39.014Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T09:01:12.380Z",
    "exitTimestampUtc": "2026-03-13T10:51:39.014Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 54.19,
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
