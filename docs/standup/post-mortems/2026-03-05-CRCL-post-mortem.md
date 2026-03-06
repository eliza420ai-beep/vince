# Post-mortem: CRCL long (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- CRCL long closed stop_loss: entry $105.36 -> exit $103.74, P&L $-35.70 (2247.374735938171 USD, 5x).
- Entry time (UTC): 2026-03-05T19:01:30.660Z
- Hold window target: intraday
- Max loss budget: $33.71 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 38 minutes
- Adverse move: 1.539%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on CRCL at entry vs. exit? Was there a macro event (macro dump, Fed news, rate shift) that triggered the stop, or pure technicals?

Without the sentiment backdrop and timing, I can't tell you if CT was pricing in downside risk you missed or if macro whipsawed a solid thesis. Give me the entry date + what CT was saying about CRCL that day, and I'll audit the sentiment call.

Confidence: 0.3 (incomplete data)

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id, market_name

**Missing context:** I need the trade date, CRCL condition_id (or Polymarket market name), and what thesis drove the entry—was this a Poly-vs-perp basis play, a directional bet on a specific event, or a volatility/spread trade? 

Without knowing whether Polymarket odds shifted against you or if perp liquidity gapped on you, I can't isolate regime vs. execution. If this was a basis trade (long perp, short Poly), a tightening spread or Poly repricing on news would explain the stop. If pure directional, I'd want to know if volume dried up or if the market repriced the underlying event probability.

**Pull the live Poly odds for CRCL and share the thesis**—that tells me if you were fighting consensus or if the market genuinely moved against the setup.

**Confidence: 0.3**

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation for the long? Did spot break a key support level, or was this a stop-hunt in range? At 5x leverage on a $2.2K notional position, you're sizing for volatility you may not have priced in—CRCL is a semi with 30-40% realized vol typically, so a 1.5% move to stop is tight unless you were trading a 15min setup. The loss itself is small ($35), but the structure question is: were you targeting 3-5% upside with that stop placement, or did the setup change and you exited early? 

**Confidence: 0.65** (need trade context—entry logic, timeframe, what broke).

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

- Quality score: 79/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$33.71, realized=$35.70, slippage=$1.99, breach=true
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

- PM_QUALITY_SCORE: 79
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 1.99
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 79,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 38,
  "adverseMovePct": 1.539,
  "riskBudget": {
    "plannedRiskUsd": 33.71,
    "realizedRiskUsd": 35.7,
    "riskSlippageUsd": 1.99,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.539,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T19:01:30.660Z",
    "exitTimestampUtc": "2026-03-05T19:39:29.352Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T19:01:30.660Z",
    "exitTimestampUtc": "2026-03-05T19:39:29.352Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 33.71,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ],
    "Oracle": [
      "condition_id",
      "market_name"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
