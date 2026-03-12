# Post-mortem: BTC long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- BTC long closed stop_loss: entry $70432.08 -> exit $69973.00, P&L $-48.35 (6888.959999999999 USD, 10x).
- Entry time (UTC): 2026-03-11T23:12:31.555Z
- Hold window target: intraday
- Max loss budget: $44.78 (6.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 112 minutes
- Adverse move: 0.652%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment at entry vs. exit? Was there a macro event (Fed speak, inflation data, geopolitical) that shifted the vibe between entry and stop?

Without the sentiment backdrop and timeline, I can't tell if this was a crowded long (everyone bullish = rug risk) or a solo contrarian bet that got shaken out by a real macro shift. The 10x leverage + tight stop ($460 range) suggests you were playing intraday momentum — if CT was euphoric at entry and that flipped to fear at exit, that's a *timing* lesson, not a thesis break.

**Confidence: 0.3** (need the date, entry sentiment, and macro context to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 35%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket BTC price at entry/exit, the specific weekly/monthly strike you were hedging against, and whether this was a directional bet or volatility play tied to an onchain options position.

That said: A $48 stop on a $70K entry (68 bips) is tight for 10x leverage in a regime where BTC is range-bound—you likely got shaken out by noise rather than a structural breakdown. If Polymarket odds on "BTC >$71K by [date]" were still >60% at your exit, the paper trade was fighting the consensus and deserved to stop. If they'd already collapsed below 40%, you exited early and left edge on the table.

**Confidence: 0.35** (need Polymarket snapshot + strike context to calibrate the actual regime call).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage ratio (10x noted, but what's your account size?), stop placement logic (why $70,432 entry + $459 buffer?), and position duration (how long held?). **On mechanics:** $459 stop on a $70K entry is 0.65% — tight for BTC spot noise; 10x leverage means a 10% move wipes you. If this is paper perps, the structure is sound (defined risk), but the sizing (10x on what % of stack?) and stop placement (technical level vs. fixed %) need clarity. **Next:** Post your account size and whether that stop was support-based or arbitrary — that determines if the loss was bad execution or expected variance.

Confidence: 0.6

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

- Quality score: 88/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$44.78, realized=$48.35, slippage=$3.57, breach=true
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

- PM_QUALITY_SCORE: 88
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 3.57
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 88,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 112,
  "adverseMovePct": 0.652,
  "riskBudget": {
    "plannedRiskUsd": 44.78,
    "realizedRiskUsd": 48.35,
    "riskSlippageUsd": 3.57,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.652,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.65,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T23:12:31.555Z",
    "exitTimestampUtc": "2026-03-12T01:04:56.196Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T23:12:31.555Z",
    "exitTimestampUtc": "2026-03-12T01:04:56.196Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.65,
    "maxLossUsd": 44.78,
    "maxLossPct": 6.5,
    "entryAtrPct": 1.126282722513089
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
