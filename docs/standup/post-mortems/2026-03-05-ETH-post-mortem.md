# Post-mortem: ETH short (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- ETH short closed stop_loss: entry $2123.88 -> exit $2148.70, P&L $-96.29 (7900.19831136922 USD, 10x).
- Entry time (UTC): 2026-03-05T09:05:47.693Z
- Hold window target: intraday
- Max loss budget: $61.36 (7.77%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 95 minutes
- Adverse move: 1.169%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

Missing key context: **When did you enter?** (yesterday, last week?) and **what was CT sentiment at entry vs. exit?** If you shorted ETH into a macro rally or when whale accounts were calling a bounce, that's a sentiment miss, not a sizing issue. Without the timestamp, I can't tell if this was fighting the vibe or just bad timing. Run me the dates and I'll pull the X pulse from entry/exit and give you the real feedback.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket ETH price at entry/exit, the specific prediction market(s) you were hedging against, and whether this was a directional bet or a basis play. Without those, I can't compare your entry to what the market was pricing—that's the lens that matters.

**What I can say:** A 1.2% stop hit on 10x leverage is tight; if you were short into rising macro risk (geopolitical, Fed pivot, etc.), Polymarket would've already priced that in, and the market likely signaled upside before your stop. Check: did Poly's ETH-related markets (e.g., "ETH above $X by date") shift bullish *before* your stop? That's the early warning.

**Confidence: 0.3** — need live Polymarket context to isolate whether this was bad timing or bad regime read.

### Solus

- Lane: options mechanics and sizing
- Confidence: 72%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry time/duration, IV regime at entry, funding rate, and whether this was part of a larger hedge or standalone directional bet. On mechanics: 10x leverage on a $2,124 entry with a $25.82 stop (1.2% range) is tight for ETH volatility—you're getting stopped by noise, not invalidation. If this was a perp short meant to hedge long options or spot, the sizing was too aggressive relative to your hedge ratio. If it was a directional trade, the stop should've been wider (2–3% minimum) or you should've sized down. **Recommendation:** Post next one with entry rationale + intended hold duration; that'll tell us if the structure was right and the stop was just unlucky or if the bet itself was underspecced.

**Confidence: 0.72**

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
- Risk budget: planned=$61.36, realized=$96.29, slippage=$34.93, breach=true
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
- PM_RISK_SLIPPAGE_USD: 34.93
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
  "holdMinutes": 95,
  "adverseMovePct": 1.169,
  "riskBudget": {
    "plannedRiskUsd": 61.36,
    "realizedRiskUsd": 96.29,
    "riskSlippageUsd": 34.93,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.169,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.777,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T09:05:47.693Z",
    "exitTimestampUtc": "2026-03-05T10:41:11.948Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T09:05:47.693Z",
    "exitTimestampUtc": "2026-03-05T10:41:11.948Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.777,
    "maxLossUsd": 61.36,
    "maxLossPct": 7.77,
    "entryAtrPct": 1.5532984293193717
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
