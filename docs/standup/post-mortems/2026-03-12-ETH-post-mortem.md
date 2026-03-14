# Post-mortem: ETH short (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- ETH short closed stop_loss: entry $2059.09 -> exit $2077.90, P&L $-37.25 (3865.4705282069704 USD, 10x).
- Entry time (UTC): 2026-03-12T21:45:04.051Z
- Hold window target: intraday
- Max loss budget: $30.08 (7.78%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 79 minutes
- Adverse move: 0.914%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** I need the trade date/time and what CT sentiment was saying about ETH at entry—was the short contrarian (CT bullish) or consensus (CT bearish)? That tells me if you were fighting the vibe or aligned with it. Also: did macro shift (Fed news, BTC move, etc.) during the hold, and did CT flip?

**What I can say now:** A $37 loss on 10x leverage is tight risk management, but the real post-mortem is whether you shorted into strength (CT was euphoric) or into weakness (CT was capitulating). If you were contrarian to extreme bullish sentiment, the loss is a badge—sentiment reversals take time. If you were with the crowd and got stopped, that's a different lesson.

**Confidence: 0.3** (need the trade timestamp + CT vibe at entry/exit to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** Polymarket ETH prediction (weekly/monthly expiry) at entry and exit, and whether this was hedging a specific options position or directional. 

**Read:** A $37 stop on a $2059 entry is tight (~1.8%)—appropriate for 10x leverage, but the move ($18.81, 0.9%) suggests mean-reversion pressure rather than regime break. If Poly had ETH >50% for "higher by [date]" at entry, the market disagreed with the short; if it flipped to <50% at exit, you got whipsawed by sentiment, not technicals. Without that signal, I can't tell if the stop was premature or if you were fighting consensus.

**Next:** Pull the Poly odds for ETH at your entry/exit timestamps—that'll show whether you were short into rising conviction or exiting into capitulation.

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold time, IV regime at entry/exit, and whether this was part of a larger hedge or standalone. **On mechanics:** $37.25 stop on a $2059 short (1.8% risk) with 10x leverage means you were fighting against 18% notional downside before hitting the stop—tight for ETH's typical daily swings. **Sizing call:** if this was a test trade, acceptable; if it's your standard ETH short sizing, consider widening stops to 2.5–3.5% or dropping leverage to 5–7x to let thesis breathe. **Next:** what's your target hold time on shorts, and are you scaling in or one-shot entries?

Confidence: 0.65

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

- Quality score: 94/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$30.08, realized=$37.25, slippage=$7.17, breach=true
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

- PM_QUALITY_SCORE: 94
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 7.17
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 94,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 79,
  "adverseMovePct": 0.914,
  "riskBudget": {
    "plannedRiskUsd": 30.08,
    "realizedRiskUsd": 37.25,
    "riskSlippageUsd": 7.17,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.914,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.778,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T21:45:04.051Z",
    "exitTimestampUtc": "2026-03-12T23:04:27.294Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T21:45:04.051Z",
    "exitTimestampUtc": "2026-03-12T23:04:27.294Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.778,
    "maxLossUsd": 30.08,
    "maxLossPct": 7.78,
    "entryAtrPct": 1.5562303664921466
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
