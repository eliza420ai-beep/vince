# Post-mortem: MSTR long (stop_loss)

**Date:** 2026-03-14

## Trade Snapshot

- MSTR long closed stop_loss: entry $140.27 -> exit $138.15, P&L $-30.97 (1985.5180799999998 USD, 5x).
- Entry time (UTC): 2026-03-13T16:28:55.540Z
- Hold window target: intraday
- Max loss budget: $29.78 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 499 minutes
- Adverse move: 1.51%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Sentiment read on MSTR's move:**

MSTR got caught in a macro headwind — likely a broader risk-off pulse (equities/crypto correlation) rather than MSTR-specific narrative collapse. The stop at $138.15 suggests tight risk management, which is solid, but I'd need to know: **(1) what CT sentiment was saying about BTC/macro at entry vs. exit, and (2) did whale accounts or macro voices flip bearish between those timestamps?** Without the timing and macro context, I can't tell if this was a "sentiment was wrong, you were right to exit" or "you exited before sentiment reversed." 

Post-mortem: Check if BTC futures sentiment (whale liquidations, funding rates chatter) or macro news (Fed, geopolitics) shifted between entry and stop — that's usually what moves MSTR correlated plays.

**Confidence:

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing key context:** I need the trade date, duration held, and what macro/sentiment regime you were trading into—was this a short-term overreaction play or a swing? Also: did Polymarket have MSTR conviction pricing that day, and what was the IV environment on Hypersurface weeklies?

That said: **$30.97 loss on a 5x micro position is noise-level**, and the entry/exit spread ($2.12) suggests tight execution in a liquid pair. The real question is whether you were fighting a macro headwind (BTC weakness, rate shock) or caught a brief liquidity dip. If it's the former, that's a regime miss; if the latter, the stop was well-placed and you dodged a worse bleed.

**Confidence: 0.4** (need trade context and market conditions that day to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Position sizing relative to portfolio (% of $100K stack?), stop placement rationale (% from entry, support level, or fixed?), and whether this was a test trade or part of a live signal. 

**On mechanics:** 5x leverage on a $140 entry with a $2.12 stop (~1.5% risk) is tight for MSTR volatility—typical daily swings are 2-3%—which means you're vulnerable to noise, not just thesis break. If this was a paper test, the structure is sound (defined risk); if it's a live signal pattern, widen the stop or reduce leverage to 2-3x to separate signal from noise.

**Next:** Post your sizing rule (% per trade, max leverage by asset class) and I'll assess whether this fits your edge or if the stops need recalibration.

Confidence: 0.65

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
- Escalate to Sentinel: true
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$29.78, realized=$30.97, slippage=$1.19, breach=true
- Consistency checks: fail (truncated_agent_findings)

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
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 1.19
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 85,
  "qualityEscalate": true,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 499,
  "adverseMovePct": 1.51,
  "riskBudget": {
    "plannedRiskUsd": 29.78,
    "realizedRiskUsd": 30.97,
    "riskSlippageUsd": 1.19,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": false,
    "issues": [
      "truncated_agent_findings"
    ],
    "adverseMovePctFromPrices": 1.51,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": true
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T16:28:55.540Z",
    "exitTimestampUtc": "2026-03-14T00:48:02.216Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T16:28:55.540Z",
    "exitTimestampUtc": "2026-03-14T00:48:02.216Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 29.78,
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
