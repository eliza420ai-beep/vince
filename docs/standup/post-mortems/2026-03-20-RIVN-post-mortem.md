# Post-mortem: RIVN long (stop_loss)

**Date:** 2026-03-20

## Trade Snapshot

- RIVN long closed stop_loss: entry $16.02 -> exit $15.35, P&L $-210.43 (4992 USD, 5x).
- Entry time (UTC): 2026-03-20T11:01:35.543Z
- Hold window target: intraday
- Max loss budget: $187.20 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 160 minutes
- Adverse move: 4.165%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter? What was CT sentiment at entry vs. exit? Was there a macro event (rate decision, earnings, sector rotation) that shifted the vibe? RIVN trades on sentiment swings — if you entered into euphoria and exited into fear, that's a timing/sentiment read miss, not a directional miss. Without the timestamp and what CT was saying at those moments, I can't tell you if sentiment analysis would've caught this.

**Confidence: 0.3** (can't assess sentiment lane without entry/exit timestamps and CT vibe at those points)

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Was this a perps trade or options? If options, what was the strike/expiry and IV regime at entry/exit? Did you have a Polymarket prediction market open on RIVN direction/price level to cross-check your thesis, or was this purely technical?

**On the regime:** A $670 move (4.2%) stop in a 5x position is tight for perps—suggests you were fighting intraday chop rather than directional conviction. If Polymarket had RIVN sentiment (e.g., bankruptcy risk, earnings event) priced in, that would've been your early warning; without that hedge, you ate the whipsaw solo.

**The call:** The loss is small relative to position size ($5K notional on $210 drawdown = 4.2% realized slippage)—tight risk management. But next time, anchor to what the market *

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, IV/vol regime at entry vs exit, and whether this was a hedge or standalone long. On mechanics alone: 4.2% loss on a 5x leveraged equity trade is reasonable slippage (entry→stop is tight; execution likely cost 20-30bps), but the real issue is **position sizing**—$5K notional on a $100K stack is 5% risk per trade, which is aggressive for paper until you prove edge. If this was a week-long hold in a ranging market with no catalyst, the stop was too tight (4.3% from entry); if it was intraday momentum, the leverage was fine. **Feedback:** Tighten position size to 2-3% per trade until you hit 65%+ win rate on paper, and widen stops to 6-8% unless you have a specific invalidation (support

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
- Risk budget: planned=$187.20, realized=$210.43, slippage=$23.23, breach=true
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
- Delta confidence: 0.5
- Delta window trades: 20
- Delta expiry: 2026-04-03T13:41:22.961Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 23.23
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 160,
  "adverseMovePct": 4.165,
  "riskBudget": {
    "plannedRiskUsd": 187.2,
    "realizedRiskUsd": 210.43,
    "riskSlippageUsd": 23.23,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 4.165,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.5,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-04-03T13:41:22.961Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "equity": 4
      },
      "maxSingleTradeUsd": 4243
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
    "entryTimestampUtc": "2026-03-20T11:01:35.543Z",
    "exitTimestampUtc": "2026-03-20T13:41:12.174Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:01:35.543Z",
    "exitTimestampUtc": "2026-03-20T13:41:12.174Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 187.2,
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
