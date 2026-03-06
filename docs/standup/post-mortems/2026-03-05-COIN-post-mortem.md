# Post-mortem: COIN short (stop_loss)

**Date:** 2026-03-05

## Trade Snapshot

- COIN short closed stop_loss: entry $201.93 -> exit $205.25, P&L $-62.25 (3674.163805688397 USD, 5x).
- Entry time (UTC): 2026-03-05T18:33:09.636Z
- Hold window target: intraday
- Max loss budget: $55.11 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 104 minutes
- Adverse move: 1.644%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** Did CT flip bearish *after* you entered, or was sentiment already turning when you shorted? Was this a contrarian play against extreme bullish sentiment, or did the macro pulse shift (macro risk-off → risk-on)?

**If sentiment was already cooling:** The stop-loss hit because momentum traders + liquidations pushed price higher despite the bearish thesis—classic whipsaw on low liquidity. **If CT flipped bullish mid-trade:** You caught a genuine sentiment reversal (macro news, whale accumulation, or retail FOMO)—that's a read miss, not execution.

Either way, $62.25 loss on 5x is tight risk management. The real question: was the trade thesis sound but timing off, or did you miss a CT signal shift?

**Confidence: 0.6** (need the sentiment context at entry vs. exit to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the Polymarket odds for COIN at entry and exit to assess whether the market repriced against you or you fought consensus. Was COIN trading 65%+ prob at $201.93 (implying your short was contrarian/high-edge) or did it flip mid-trade?

**What I can say:** A 1.7% stop on a 5x perp is tight for regime chop—if COIN was range-bound on the day, you got shaken out. If there was a macro catalyst or Polymarket repriced COIN higher, the stop was right (no point fighting a consensus shift). Pull the Poly odds at entry/exit and I'll tell you if you fought the market or got whipsawed.

**Confidence: 0.3** (need live market pricing to diagnose regime).

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** What was your thesis invalidation trigger (news, chart break, funding spike)? Did you hit stop because the signal broke or because price touched a level? On a 5x short COIN at $201.93, a $3.32 move (1.6%) is tight — was that your planned risk, or did you size too aggressively for the volatility you expected? **Mechanics call:** If the thesis is still intact and you just got shaken out by noise, tighten your stops next time (0.5–0.8% on perps vs 1.6%); if the thesis broke, the stop was correct and you dodged further downside. Either way, $62 loss on a 5x is acceptable risk management — the real question is repeatability: are you hitting stops on signal breaks (good) or noise (bad)?

**Confidence: 0.4**

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

- Quality score: 85/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$55.11, realized=$62.25, slippage=$7.14, breach=true
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
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 7.14
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 85,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 104,
  "adverseMovePct": 1.644,
  "riskBudget": {
    "plannedRiskUsd": 55.11,
    "realizedRiskUsd": 62.25,
    "riskSlippageUsd": 7.14,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.644,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T18:33:09.636Z",
    "exitTimestampUtc": "2026-03-05T20:16:59.650Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T18:33:09.636Z",
    "exitTimestampUtc": "2026-03-05T20:16:59.650Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 55.11,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
