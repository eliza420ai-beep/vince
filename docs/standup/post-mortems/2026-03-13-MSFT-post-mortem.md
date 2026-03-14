# Post-mortem: MSFT long (max_age)

**Date:** 2026-03-13

## Trade Snapshot

- MSFT long closed max_age: entry $403.63 -> exit $400.46, P&L $-50.44 (6036.940799999999 USD, 5x).
- Entry time (UTC): 2026-03-13T01:31:00.903Z
- Hold window target: intraday
- Max loss budget: $90.55 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.786%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter/exit (dates/times)? What was CT sentiment on MSFT/tech at entry vs. exit? Was there a macro catalyst (Fed speak, earnings, rate expectations) that shifted the vibe?

Without the timing, I can't tell you if CT saw this move coming or if sentiment lagged price — which is the only angle I can actually add here. Your entry/exit mechanics are Solus's lane; the sentiment *miss* is mine.

**Confidence: 0.3** (can't assess without temporal context on CT chatter around those dates).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the entry/exit timestamps and whether this was a perps trade or options (strike, expiry, IV environment). That said, the $3.17 move on MSFT over what timeframe suggests a volatility regime shift—if this was intraday, you likely got caught in a liquidity pocket or news-driven reversion; if multi-day, the broader macro (rates, tech rotation) probably turned against the setup. The 5x leverage amplified a directional miss into a 50-basis-point loss, which is brutal but recoverable if your edge on entry was solid and the thesis just got invalidated by regime. **Confidence: 0.4** (need timestamps and instrument type to diagnose signal quality vs. execution/timing).

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold time, IV regime at entry vs exit, and whether this was a hedge or standalone directional bet. On mechanics alone: 6x leverage on a $403 stock (notional ~$24K) with a 0.79% stop is tight—typical for scalp, but if hold was >1h, you ate slippage and funding. The loss itself ($50) is noise at that scale, but the **leverage-to-conviction ratio** matters: were you 6x confident or did sizing exceed thesis? For paper, the real feedback is whether the structure (entry signal, stop placement, hold duration) repeats or was one-off. 

**Confidence: 0.4** — need hold time, entry signal, and whether this fits a repeatable pattern to give real feedback.

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
- Risk budget: planned=$90.55, realized=$50.44, slippage=$-40.11, breach=false
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
- PM_RISK_SLIPPAGE_USD: -40.11
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
  "adverseMovePct": 0.786,
  "riskBudget": {
    "plannedRiskUsd": 90.55,
    "realizedRiskUsd": 50.44,
    "riskSlippageUsd": -40.11,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.786,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T01:31:00.903Z",
    "exitTimestampUtc": "2026-03-13T13:31:07.836Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T01:31:00.903Z",
    "exitTimestampUtc": "2026-03-13T13:31:07.836Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 90.55,
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
