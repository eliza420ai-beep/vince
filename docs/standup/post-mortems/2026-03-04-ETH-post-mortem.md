# Post-mortem: ETH short (stop_loss)

**Date:** 2026-03-04

## Trade Snapshot

- ETH short closed stop_loss: entry $2132.27 -> exit $2155.90, P&L $-57.50 (4965.080909090909 USD, 10x).
- Entry time (UTC): 2026-03-04T15:49:33.887Z
- Hold window target: intraday
- Max loss budget: $38.81 (7.82%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 10 minutes
- Adverse move: 1.108%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 0%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on ETH at entry vs. exit? Was there a macro catalyst (Fed, macro data, whale move) that shifted sentiment between entry and stop?

**On the trade itself:** Without knowing the sentiment backdrop, I can't tell if you shorted into bullish CT consensus (crowded against you) or if macro/on-chain shifted mid-trade. A $2132→$2155 move in 10x leverage is tight — if CT was already long-biased, that's a headwind. If there was a news spike (ETF inflow, macro surprise), that's a lesson on macro-sentiment timing, not your thesis.

**What I need to give you real feedback:** Entry timestamp + what CT was saying about ETH at that moment, and whether any macro event hit between entry and stop.

**Confidence: 0.

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need the trade date/time and which Polymarket ETH prediction(s) you were hedging against—were you short because Poly was pricing a dip, or was this a directional bet divorced from on-chain sentiment?

**On the loss itself:** A $57.50 stop on a 10x short at $2132 is tight (26 bps)—typical for scalps, but if you held >1 min, you likely got stopped into chop rather than a real reversal. The 2–3% move ($2132→$2156) is normal intraday noise on ETH; without knowing the Poly regime (was the market pricing stability or vol?), I can't tell if your directional thesis was wrong or your risk sizing was just too aggressive for the timeframe.

**Ask:** Pull the Poly ETH prediction odds at your entry time—if

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, exit date, IV regime at entry/exit, and whether this was part of a larger hedge or standalone directional bet. That said: **10x leverage on a $57.50 stop (2.7% drawdown) is tight—you got shaken out on noise.** For a $4,965 position, that's appropriate risk-per-trade sizing, but the leverage + tight stop combo means you're fighting slippage and micro-moves; consider wider stops (4-5%) or lower leverage (5x) on perps if the thesis is medium-term. **Missing:** did you have a profit target, or was this a "hold until stop" trade? Structure matters more than direction here.

**Confidence: 0.6** (mechanics sound, but missing trade context limits specificity).

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

- Quality score: 84/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$38.81, realized=$57.50, slippage=$18.69, breach=true
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

- PM_QUALITY_SCORE: 84
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 18.69
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 84,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 10,
  "adverseMovePct": 1.108,
  "riskBudget": {
    "plannedRiskUsd": 38.81,
    "realizedRiskUsd": 57.5,
    "riskSlippageUsd": 18.69,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.108,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.782,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-04T15:49:33.887Z",
    "exitTimestampUtc": "2026-03-04T15:59:15.931Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-04T15:49:33.887Z",
    "exitTimestampUtc": "2026-03-04T15:59:15.931Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.782,
    "maxLossUsd": 38.81,
    "maxLossPct": 7.82,
    "entryAtrPct": 1.5631413612565443
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
