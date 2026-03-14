# Post-mortem: PLTR long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- PLTR long closed stop_loss: entry $153.05 -> exit $150.69, P&L $-63.98 (4017.866666666667 USD, 5x).
- Entry time (UTC): 2026-03-13T11:00:13.240Z
- Hold window target: intraday
- Max loss budget: $60.27 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 231 minutes
- Adverse move: 1.542%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on PLTR at entry vs. exit? Was there a macro/earnings catalyst between those two prices?

That said: A 2.36pt stop on a $153 entry is tight—suggests you were hedging headline risk, not riding conviction. If CT was mixed-to-bearish on PLTR during your hold, the stop was justified; if bullish, you might've been early into noise. Need the sentiment timeline to say whether this was good risk management or a whipsaw.

**Confidence: 0.4** (not enough data on timing + CT vibe during hold).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the entry date, close date, and what Polymarket was pricing PLTR at those moments—specifically the "PLTR close above/below X by [date]" condition odds. Without that, I can't tell you whether the market repriced against you or if you took regime risk that wasn't in the odds.

**What I can say:** A 1.56% loss on 5x is tight stop discipline—that's good. But if Polymarket had PLTR staying above $150 at >75% when you entered, the market disagreed with the downside risk you took. If it was <60%, you had edge and just got unlucky. Pull the odds snapshot and I'll give you the real feedback.

**Confidence: 0.3** (need Poly pricing to assess regime vs. execution).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** position date, hold duration, market regime (was PLTR rallying or consolidating into entry?), and whether this was part of a larger portfolio hedge or standalone directional bet.

**On mechanics:** 5x leverage on a $4K notional is aggressive for a single-name equity play—that's sizing for a correlation hedge or vol spike, not a core conviction trade. The stop at $150.69 (1.5% below entry) is tight for a paper bot learning regime; you're getting shaken out by noise. If PLTR was your thesis, either size down and widen the stop to 3–5%, or use options (collars, ratio spreads) to define risk without the liquidation cliff.

**Call:** Tighten the position size on single-name paper trades until you have 10+ trades of data on your entry/stop discipline. Right now the leverage is mas

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
- Risk budget: planned=$60.27, realized=$63.98, slippage=$3.71, breach=true
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
- PM_RISK_SLIPPAGE_USD: 3.71
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
  "holdMinutes": 231,
  "adverseMovePct": 1.542,
  "riskBudget": {
    "plannedRiskUsd": 60.27,
    "realizedRiskUsd": 63.98,
    "riskSlippageUsd": 3.71,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.542,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T11:00:13.240Z",
    "exitTimestampUtc": "2026-03-13T14:51:11.372Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T11:00:13.240Z",
    "exitTimestampUtc": "2026-03-13T14:51:11.372Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 60.27,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
