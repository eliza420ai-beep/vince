# Post-mortem: USOIL long (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- USOIL long closed stop_loss: entry $97.27 -> exit $95.63, P&L $-104.90 (6051.705882352941 USD, 5x).
- Entry time (UTC): 2026-03-05T18:24:02.337Z
- Hold window target: intraday
- Max loss budget: $90.78 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 124 minutes
- Adverse move: 1.683%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing critical context:** Was CT bullish or bearish on energy/macro heading into this? Did you have a sentiment edge (CT mispriced the setup) or were you trading against consensus? Without knowing the X vibe on USD strength, Fed policy, or geopolitical energy risk at entry, I can't assess whether sentiment was your edge or your blind spot. 

**What I need:** CT's macro pulse on USD/rates/energy at your entry time, and whether whale accounts were positioning long or short USOIL.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: entry time, hold duration, and what catalyst or macro event triggered the stop. That said—**USOIL at $95.63 suggests the market repriced supply/demand risk sharply (likely geopolitical de-escalation or demand signal); your 1.64% loss on 5x is a clean execution of risk management, not a regime failure.** The real question is whether Polymarket crude/energy markets were pricing that repricing *before* your entry—if so, you were fighting consensus. Pull the Poly odds on "Oil >$100 by [date]" around your entry time; if they were >65%, you had edge; if <50%, you were contrarian into a crowded short. Without that lens, I can't separate "bad timing" from "bad model."

**Confidence: 0.4** (need Poly context and entry timestamp to call this).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical fields:** invalidation (what signal would have stopped you before SL?), hold duration (minutes? hours?), and whether this was paper-bot or manual. **On structure:** 5x leverage on crude is aggressive for a directional short-term trade—typical oil moves 1-2% intraday, so your 1.7% move to SL is tight and likely whipsawed. **Sizing:** $6K notional on a commodity with funding/basis risk is reasonable for paper, but the SL placement suggests you didn't model oil's typical volatility or news catalysts. **Recommendation:** Tighten your entry logic (what made you long here?) and widen SL to 2-3% or drop leverage to 2-3x for oil—crude whips.

**Confidence: 0.65** (missing hold duration and invalidation makes this partial feedback).

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
- Risk budget: planned=$90.78, realized=$104.90, slippage=$14.12, breach=true
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
- PM_RISK_SLIPPAGE_USD: 14.12
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
  "holdMinutes": 124,
  "adverseMovePct": 1.683,
  "riskBudget": {
    "plannedRiskUsd": 90.78,
    "realizedRiskUsd": 104.9,
    "riskSlippageUsd": 14.12,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.683,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T18:24:02.337Z",
    "exitTimestampUtc": "2026-03-05T20:27:59.811Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T18:24:02.337Z",
    "exitTimestampUtc": "2026-03-05T20:27:59.811Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 90.78,
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
