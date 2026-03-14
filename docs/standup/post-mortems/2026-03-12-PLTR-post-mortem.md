# Post-mortem: PLTR long (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- PLTR long closed max_age: entry $152.88 -> exit $152.38, P&L $-11.88 (3148.5506493506496 USD, 5x).
- Entry time (UTC): 2026-03-12T10:59:54.911Z
- Hold window target: intraday
- Max loss budget: $47.23 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.327%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

Missing key context: **When did you enter/exit?** (timeframe matters for sentiment correlation) and **What was CT sentiment on PLTR at entry vs. exit?** (was it a crowded trade, retail FOMO, or contrarian setup?). 

That said — $152.88→$152.38 is a tight range with 5x leverage, so you got whipsawed on noise rather than a macro move. If CT was euphoric on PLTR at entry, you were fighting sentiment headwinds; if it was quiet/bearish, you picked a bottom but got shaken out before the bounce. The real lesson is whether sentiment alignment justified the leverage given the tight stop.

**Confidence: 0.4** (need trade timestamps + CT vibe at entry/exit to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the Polymarket prediction for PLTR over your hold period (days? weeks?) and the odds at entry/exit to assess whether price action violated market expectations or if you were fighting consensus. Without that lens, I can't tell if this was a regime miss (market repriced fundamentals) or just noise in a tight range.

**What I can say:** A $0.50 move on 5x leverage is tight—you were fighting bid/ask friction and slippage on a small directional bet. If Polymarket had PLTR >$155 at >60% odds and it closed $152.38, the market repriced downward; if it stayed flat at 45–50%, you were fighting mean reversion in a choppy regime.

Pull the Polymarket odds snapshot from your entry time and I'll give you the edge breakdown.

**Confidence: 0.3**

### Solus

- Lane: options mechanics and sizing
- Confidence: 72%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Feedback:**

5x leverage on a $152 stock with a $11.88 stop (7.8% range) is tight — you got clipped by normal intraday noise, not a directional miss. Missing: entry thesis (support/resistance invalidation?), hold duration (seconds? minutes?), and whether this was a scalp or swing setup. If this was meant to be a swing, the leverage and stop are mismatched; if a scalp, the slippage/friction on a $3K position at 5x eats the edge. **Call:** Post the entry invalidation and intended hold time — that tells us if the structure was sound or if sizing/leverage was wrong for the timeframe.

**Confidence: 0.72**

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
- Risk budget: planned=$47.23, realized=$11.88, slippage=$-35.35, breach=false
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
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -35.35
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
  "holdMinutes": 720,
  "adverseMovePct": 0.327,
  "riskBudget": {
    "plannedRiskUsd": 47.23,
    "realizedRiskUsd": 11.88,
    "riskSlippageUsd": -35.35,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.327,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T10:59:54.911Z",
    "exitTimestampUtc": "2026-03-12T22:59:56.371Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T10:59:54.911Z",
    "exitTimestampUtc": "2026-03-12T22:59:56.371Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 47.23,
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
