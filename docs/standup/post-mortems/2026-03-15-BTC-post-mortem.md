# Post-mortem: BTC short (stop_loss)

**Date:** 2026-03-15

## Trade Snapshot

- BTC short closed stop_loss: entry $70934.81 -> exit $71402.00, P&L $-12.16 (1715.9330333560922 USD, 4x).
- Entry time (UTC): 2026-03-15T01:18:02.946Z
- Hold window target: intraday
- Max loss budget: $11.15 (2.60%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 89 minutes
- Adverse move: 0.659%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing critical context:** Was CT bullish or mixed on BTC at entry? Did you short into a sentiment spike (retail FOMO) or during a contrarian dip (whale accumulation)? The $468 move against you is small enough that sentiment timing—not size—likely mattered. 

**What I'd need to give you real feedback:** Your entry time/date, and I'll pull X_PULSE to show what CT was saying at that exact moment. That tells us if you shorted into euphoria (bad setup) or missed a whale accumulation signal (better luck next time).

**Confidence: 0.3** — Can't assess sentiment edge without knowing when you entered.

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket's BTC price prediction(s) at entry/exit, your thesis timeframe (hours/days?), and whether this was hedging a Hypersurface strike or a standalone short. That said: a $468 move stop on a 4x short is tight for BTC's current regime—if Poly was pricing >55% for higher prices at entry, you were fighting consensus. The loss isn't material, but if you're using Poly signals to *validate* directional shorts, check whether the market was already pricing in the move you expected *not* to happen. What was Poly saying about BTC at $70.9K?

**Confidence: 0.4** (need the Poly context and your thesis window to give a real read).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** stop-loss trigger (time/price action), position hold duration, and whether this was part of a planned hedge or directional bet. On mechanics alone: $1.7K loss on 4x leverage into a $70K asset means ~2.4% notional size—reasonable for a paper trade. The entry/exit spread ($468) suggests slippage or market move against you; if this was a scalp, hold time matters (did you get caught in a wick?). For next trade: log entry thesis (why short BTC there?) and exit condition (stop logic vs time-based) so we can audit whether the structure was sound or leverage was misplaced.

**Confidence: 0.6** (need hold duration, thesis, and whether stop was technical or arbitrary).

## Root-Cause Tags

- Primary: stop_too_tight_for_vol
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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 85/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$11.15, realized=$12.16, slippage=$1.01, breach=true
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

- PM_QUALITY_SCORE: 85
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: stop_too_tight_for_vol
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 1.01
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 85,
  "qualityEscalate": false,
  "primaryCause": "stop_too_tight_for_vol",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 89,
  "adverseMovePct": 0.659,
  "riskBudget": {
    "plannedRiskUsd": 11.15,
    "realizedRiskUsd": 12.16,
    "riskSlippageUsd": 1.01,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.659,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.65,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-15T01:18:02.946Z",
    "exitTimestampUtc": "2026-03-15T02:47:27.824Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-15T01:18:02.946Z",
    "exitTimestampUtc": "2026-03-15T02:47:27.824Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 4,
    "stopDistancePct": 0.65,
    "maxLossUsd": 11.15,
    "maxLossPct": 2.6,
    "entryAtrPct": 1.1141361256544502
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
