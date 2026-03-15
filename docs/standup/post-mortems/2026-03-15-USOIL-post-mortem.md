# Post-mortem: USOIL short (stop_loss)

**Date:** 2026-03-15

## Trade Snapshot

- USOIL short closed stop_loss: entry $123.91 -> exit $125.82, P&L $-71.55 (4484.741831569259 USD, 10x).
- Entry time (UTC): 2026-03-15T12:09:22.754Z
- Hold window target: intraday
- Max loss budget: $67.27 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 144 minutes
- Adverse move: 1.545%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter vs. exit (date/time)? Was there a macro event (Fed speak, supply shock, geopolitical flare) that spiked oil during your hold? Did CT/energy traders call the move beforehand, or was it a surprise?

**On sentiment alone:** Oil shorts typically get crushed on supply disruption narratives or hawkish Fed signals — if either hit while you were in, that's a CT miss, not a trade miss. Check if energy/macro Twitter was warning about inventory data, Middle East escalation, or Fed speakers that day; if the signal was there and you didn't catch it, that's your edge gap.

**Confidence: 0.4** — Can't assess sentiment's role without timing and macro catalyst. Ping me the entry/exit window and I'll pull CT vibe for that period.

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the entry date, hold duration, and whether there was a corresponding Polymarket position on oil (e.g., "Will crude oil close above $125 by [date]?"). Without that, I can't assess whether the stop was hit due to market regime shift or if Polymarket pricing diverged from spot—which would tell us if the edge was real or if execution timing was off.

**What I can say:** A 4-handle move on a 10x levered short is tight risk management (1.5% stop), which is sound. But on USOIL, a $71 loss on a $4.5K notional position suggests either a fast-moving intraday spike (reversible) or a genuine regime break. If Polymarket crude markets were pricing higher through that window, the stop was justified; if they stayed flat, we may have caught a wick.

**

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** position duration (hours? days?), stop placement rationale (% from entry?), and whether this was part of a hedged pair or standalone. That said: **10x on a commodity short into a rally is structural risk**—USOIL has strong upside momentum in risk-on regimes, and leverage amplifies whipsaws. Your stop at +191 bps is reasonable for a day trade but tight for a swing; if this was meant to be multi-day, the sizing (10x notional) is too aggressive relative to intraday noise. **Next:** post your entry logic (catalyst, technicals, funding?) and I'll assess whether the stop was right or the position size was wrong.

**Confidence: 0.6** (mechanics clear, context gaps prevent full assessment).

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$67.27, realized=$71.55, slippage=$4.28, breach=true
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

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.28
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 144,
  "adverseMovePct": 1.545,
  "riskBudget": {
    "plannedRiskUsd": 67.27,
    "realizedRiskUsd": 71.55,
    "riskSlippageUsd": 4.28,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.545,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-15T12:09:22.754Z",
    "exitTimestampUtc": "2026-03-15T14:33:16.715Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-15T12:09:22.754Z",
    "exitTimestampUtc": "2026-03-15T14:33:16.715Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 1.5,
    "maxLossUsd": 67.27,
    "maxLossPct": 15,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
