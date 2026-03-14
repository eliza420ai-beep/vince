# Post-mortem: ANTHROPIC long (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- ANTHROPIC long closed max_age: entry $630.17 -> exit $627.04, P&L $-12.69 (2323.303783783784 USD, 3x).
- Entry time (UTC): 2026-03-11T13:29:33.101Z
- Hold window target: intraday
- Max loss budget: $34.85 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.496%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter/exit relative to earnings, macro news, or CT sentiment shifts? Was this a momentum trade (riding bullish CT) or contrarian (betting against extreme sentiment)? Without the timestamp and your thesis, I can't tie the loss to sentiment divergence or a missed signal.

**What I'd need to assess:** Did CT flip bearish on ANTHROPIC while you held? Did whale accounts or alpha accounts exit before retail noticed? Was there a macro headwind (rates, tech sector rotation) that sentiment missed?

**Quick take:** If this was a long on bullish CT and sentiment stayed positive through exit, that's execution/timing — not a sentiment call failure. If CT turned and you held, that's a miss on the pivot.

Confidence: 0.3 (need timestamps + your entry thesis to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

Missing key context: entry/exit timestamps, what triggered the exit (stop, target, time-based?), and whether Anthropic had live Polymarket odds movement that day. That said: a $12.69 loss on a 3x levered perp position suggests tight risk management, but the real question is whether the market repriced Anthropic's probability post-entry—if Polymarket showed no meaningful shift in AI sentiment or ANTHROPIC contract odds, the loss was likely noise/liquidation hunting rather than regime break. Without the timestamps, I can't cross-check whether Poly volume or spreads signaled the move ahead of time. 

**Confidence: 0.4** (need trade time + Poly context to give you actionable feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, thesis invalidation trigger, and whether this was a discretionary pick or systematic signal. On mechanics alone: 3x leverage on a $630 entry with a $3.27 stop (0.5% move) is tight—you got stopped on noise, not thesis break. If ANTHROPIC was a conviction play, that sizing + stop width suggests you're fighting slippage and gamma on a micro move rather than letting thesis play out. For paper trades, tighter stops teach discipline; for live, this structure bleeds on entries that are directionally right but tactically early. **Confidence: 0.6** (need hold time and invalidation to assess if stop was correct or premature).

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$34.85, realized=$12.69, slippage=$-22.16, breach=false
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

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -22.16
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.496,
  "riskBudget": {
    "plannedRiskUsd": 34.85,
    "realizedRiskUsd": 12.69,
    "riskSlippageUsd": -22.16,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.496,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T13:29:33.101Z",
    "exitTimestampUtc": "2026-03-12T01:29:46.467Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T13:29:33.101Z",
    "exitTimestampUtc": "2026-03-12T01:29:46.467Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 34.85,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
