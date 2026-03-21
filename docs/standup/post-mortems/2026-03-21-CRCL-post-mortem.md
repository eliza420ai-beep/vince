# Post-mortem: CRCL long (max_age)

**Date:** 2026-03-21

## Trade Snapshot

- CRCL long closed max_age: entry $126.71 -> exit $126.60, P&L $-2.34 (1761.1775999999998 USD, 5x).
- Entry time (UTC): 2026-03-20T14:13:16.104Z
- Hold window target: intraday
- Max loss budget: $66.04 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 721 minutes
- Adverse move: 0.083%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit (exact timestamps)? What was CT sentiment on CRCL during that window — was it a breakout narrative or consolidation chop? Did macro (BTC, rates, Fed) shift between entry and exit?

**On the trade itself:** A $2.34 loss on a tight entry/exit suggests you got shaken on noise rather than a sentiment reversal — CRCL didn't have enough narrative momentum to hold through intraday volatility. If CT wasn't talking about it (low signal-to-noise), 5x leverage on a micro-cap without backing conviction is friction waiting to happen.

**Confidence: 0.4** — need the sentiment timeline to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

Missing critical context: Polymarket odds for CRCL at entry and exit, position thesis (catalyst/timeline), and macro regime at trade time. Without those, I can't assess whether you were fighting consensus pricing or if the market repriced the event itself. The tight loss ($2.34 on a $1.76K position) suggests you got stopped on noise rather than a fundamental break—typical of short-duration bets in low-liquidity pairs. **To give you actionable feedback:** pull the Polymarket prices for CRCL around your entry/exit times, and I'll compare your thesis to what the market was pricing; that'll tell us if this was bad timing, bad thesis, or just variance.

**Confidence: 0.3** (insufficient market data).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold duration, and what triggered the exit (stop-hit, time decay, thesis break?). On mechanics alone: $126.71→$126.60 is a -0.09% move; at 5x leverage that's -0.45% loss, which matches your $2.34 on ~$520 notional. The real issue isn't the small move—it's **why you held a 5x position through noise on a micro-cap (CRCL) with no invalidation trigger stated.** Paper or live, that's a structure problem: size down or tighten your stop. If this was a scalp, you need sub-$1 targets; if it was a swing, 5x is too hot for a stock with that liquidity profile.

**Confidence: 0.6** (missing hold time and exit trigger; can't assess if this

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
- Risk budget: planned=$66.04, realized=$2.34, slippage=$-63.70, breach=false
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
- PM_RISK_SLIPPAGE_USD: -63.7
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
  "holdMinutes": 721,
  "adverseMovePct": 0.083,
  "riskBudget": {
    "plannedRiskUsd": 66.04,
    "realizedRiskUsd": 2.34,
    "riskSlippageUsd": -63.7,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.083,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T14:13:16.104Z",
    "exitTimestampUtc": "2026-03-21T02:13:46.369Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T14:13:16.104Z",
    "exitTimestampUtc": "2026-03-21T02:13:46.369Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 66.04,
    "maxLossPct": 18.75,
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
