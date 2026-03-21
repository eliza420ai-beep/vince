# Post-mortem: OPENAI short (stop_loss)

**Date:** 2026-03-21

## Trade Snapshot

- OPENAI short closed stop_loss: entry $917.11 -> exit $956.10, P&L $-45.33 (1053.6959999999997 USD, 3x).
- Entry time (UTC): 2026-03-20T23:02:03.518Z
- Hold window target: intraday
- Max loss budget: $39.51 (11.25%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 634 minutes
- Adverse move: 4.252%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** Did CT turn bullish on OPENAI between entry and exit? Was there a macro catalyst (Fed, tech earnings, AI hype spike) that shifted sentiment? Without knowing the *sentiment environment* at entry vs. exit, I can't tell if this was a sentiment miss or just bad timing. What was the vibe when you shorted — was CT bearish on AI/OPENAI, or were you contrarian against bullish CT?

**Confidence: 0.3** (can't assess sentiment trade quality without the sentiment thesis.)

### Oracle

- Lane: prediction market regime
- Confidence: 30%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing critical context:** I need the entry date, exit date, and current Polymarket odds for OPENAI stock price at your strike/timeframe to assess whether the market repriced against you or you caught the wrong regime. The $39 slippage on a short suggests momentum shifted—was that a macro reversal, earnings surprise, or intraday whip? Without knowing *when* you entered relative to market events, I can't separate "bad timing" from "bad thesis." 

**What I can say:** A 3x leveraged short on OPENAI getting stopped at +4.2% is a tight stop in a momentum-heavy name; if Polymarket was pricing >60% odds of OPENAI rallying through your level, the trade was fighting consensus from the start.

**Confidence: 0.3** (need trade timestamps + Poly odds at entry to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation for the short, and did price break it cleanly or did you get stopped out on noise? The 4.3% loss on 3x suggests tight stops—good risk management, but I need to know if this was a thesis break or whipsaw. **Mechanics call:** If the stop was set at a technical level (e.g., support), you executed correctly; if it was arbitrary, tighten your entry logic. **Size note:** $1,053 notional on a $45 loss is solid risk-per-trade discipline; keep that ratio. **Next:** Paste the chart/level + your original thesis, and I'll tell you if the structure was sound or if your entry was premature.

Confidence: 0.6

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
- Risk budget: planned=$39.51, realized=$45.33, slippage=$5.82, breach=true
- Consistency checks: pass

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.
- Promote bounded policy delta candidate and evaluate over a rolling window.

## Recursive Policy Delta

- Adaptation eligible: true
- Policy version at entry: baseline
- Proposed delta: present
- Delta confidence: 0.4
- Delta window trades: 20
- Delta expiry: 2026-04-04T09:36:29.508Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 5.82
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 634,
  "adverseMovePct": 4.252,
  "riskBudget": {
    "plannedRiskUsd": 39.51,
    "realizedRiskUsd": 45.33,
    "riskSlippageUsd": 5.82,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 4.252,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.4,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-04-04T09:36:29.508Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "equity": 2
      },
      "maxSingleTradeUsd": 896
    },
    "validationPlan": {
      "windowTrades": 20,
      "targetMetrics": {
        "maxBudgetBreachRate": 0.2,
        "minExpectancyUsd": -5,
        "maxDrawdownPct": 15
      },
      "rollbackTriggers": [
        "budget_breach_rate_worse_than_baseline",
        "expectancy_usd_degrades",
        "drawdown_pct_exceeds_cap"
      ]
    }
  },
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T23:02:03.518Z",
    "exitTimestampUtc": "2026-03-21T09:36:14.742Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T23:02:03.518Z",
    "exitTimestampUtc": "2026-03-21T09:36:14.742Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 3.75,
    "maxLossUsd": 39.51,
    "maxLossPct": 11.25,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
