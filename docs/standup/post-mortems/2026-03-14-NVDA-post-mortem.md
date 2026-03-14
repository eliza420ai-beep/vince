# Post-mortem: NVDA long (max_age)

**Date:** 2026-03-14

## Trade Snapshot

- NVDA long closed max_age: entry $182.53 -> exit $179.89, P&L $-61.81 (4135.661298701299 USD, 5x).
- Entry time (UTC): 2026-03-13T14:47:44.453Z
- Hold window target: intraday
- Max loss budget: $62.03 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 1.444%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter/exit (exact times)? What was CT sentiment on NVDA/mega-cap tech at entry vs. exit? Was there a macro event (Fed speak, jobs data, rate expectations shift) that moved the tape?

**On the loss itself:** A 1.5% move against you on 5x is tight — suggests either (a) entry timing caught a local top before a broader tech/mega-cap pullback, or (b) macro headwinds (rate fears, earnings anxiety) shifted sentiment hard while you were in. Without the sentiment snapshot at entry/exit, I can't tell if you were fighting a contrarian setup or just got caught in a CT-wide rotation out of mega-cap.

**What I'd need to give you real feedback:** Entry/exit timestamps + what CT was saying about NVDA/Mag7 sentiment in those windows.

Confidence:

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** NVDA prediction-market odds at entry/exit (Polymarket or Synth forecast), trade duration, and macro regime (rate expectations, tech sentiment shift). That said: a $61.81 loss on 5x leverage over what looks like a <1% move suggests tight stops or quick liquidation risk—typical paper-bot behavior in choppy, low-conviction setups. Without Polymarket odds context, I can't tell if the market repriced NVDA's fundamental outlook or if this was pure momentum/technicals whipsaw. Pull the Poly odds at entry/exit and I'll give you regime + pricing feedback.

**Confidence: 0.4** (need market data to assess edge vs. noise).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** entry/exit timestamps (how long held?), IV environment at entry vs exit, whether this was part of a hedge or standalone, and what invalidation would have triggered an exit earlier. **On mechanics:** 5x leverage on a $4.1K position against a $182 stock is tight—$61 move (0.34%) wipes you out fast; if this was a directional bet, 2–3x with wider stops would've survived the noise. **The call:** Post-mortem the hold time and exit trigger; if you held through invalidation (e.g., broke support, IV crushed), tighten your mechanical exit rules before next trade.

**Confidence: 0.6** (need timestamps and invalidation context to assess structure fully).

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
- Escalate to Sentinel: true
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$62.03, realized=$61.81, slippage=$-0.22, breach=false
- Consistency checks: fail (truncated_agent_findings)

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
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -0.22
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 83,
  "qualityEscalate": true,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 1.444,
  "riskBudget": {
    "plannedRiskUsd": 62.03,
    "realizedRiskUsd": 61.81,
    "riskSlippageUsd": -0.22,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": false,
    "issues": [
      "truncated_agent_findings"
    ],
    "adverseMovePctFromPrices": 1.444,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": true
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T14:47:44.453Z",
    "exitTimestampUtc": "2026-03-14T02:47:59.433Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T14:47:44.453Z",
    "exitTimestampUtc": "2026-03-14T02:47:59.433Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 62.03,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
