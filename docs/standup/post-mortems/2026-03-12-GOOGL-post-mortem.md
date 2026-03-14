# Post-mortem: GOOGL long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- GOOGL long closed stop_loss: entry $308.04 -> exit $303.22, P&L $-69.58 (4307.738317757009 USD, 5x).
- Entry time (UTC): 2026-03-12T13:30:28.488Z
- Hold window target: intraday
- Max loss budget: $64.62 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 57 minutes
- Adverse move: 1.565%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime, lane_coverage_gap

**Missing key context:** When did you enter (date/time)? What was CT sentiment on GOOGL/big tech at entry vs. exit? Was there a macro event (Fed speak, jobs data, rate expectations shift) that moved the trade against you?

**On sentiment alone:** If you entered into cooling big-tech sentiment or during a rotation out of mega-cap AI plays, that's a headwind X was already pricing in. The 5x leverage on a $5 stop in a choppy macro environment is tight — sentiment swings alone can trigger those without a fundamental break. 

**What I'd need to give real feedback:** The exact entry timestamp + a quick X vibe check on GOOGL/tech sentiment that day. Then I can tell you if CT was already rotating or if this was just noise.

**Confidence: 0.4** (I'm outside my lane on execution; Solus owns the trade

### Oracle

- Lane: prediction market regime
- Confidence: 72%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

VINCE, you're in the right lane—paper perps let you iterate fast. The $5k loss on a 5x long tells me you caught a momentum fade, not a regime flip; GOOGL's been range-bound on macro uncertainty, so a $5 stop was tight for that volatility. **Missing context:** What triggered entry (tech sector rotation, earnings catalyst, or just momentum)? And did you check Polymarket's "Will GOOGL hit $310 by [date]" odds before entry—that would've shown you the consensus probability and given you a strike-selection lens for next time. **Regime call:** If you're seeing similar tech weakness across your watchlist, consider whether you need wider stops or smaller size on momentum trades in low-conviction setups. Confidence: 0.72.

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** invalidation thesis (why you entered, what broke it), hold duration (hours? days?), and whether this was paper-bot or manual. That said: **5x leverage on a $300 stock is aggressive for a $100K stack**—if this was your sizing standard, you're risking ~3.5% per trade; two more like this and you've eaten a week of options income. The stop at $303.22 (1.6% below entry) is tight for intraday chop on GOOGL—typical daily range is 1-2%, so you likely got shaken out. **Mechanics call:** increase stop buffer to 2.5-3% or reduce leverage to 2-3x on single-name equities. Post the invalidation and hold time, and I can assess whether this was bad luck or bad structure.

Confidence: 0.6

## Root-Cause Tags

- Primary: agent_lane_mismatch
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

- Quality score: 89/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: unclear
- Risk budget: planned=$64.62, realized=$69.58, slippage=$4.96, breach=true
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
- Delta confidence: 0.57
- Delta window trades: 20
- Delta expiry: 2026-03-26T14:28:06.378Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: agent_lane_mismatch
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.96
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "agent_lane_mismatch",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 57,
  "adverseMovePct": 1.565,
  "riskBudget": {
    "plannedRiskUsd": 64.62,
    "realizedRiskUsd": 69.58,
    "riskSlippageUsd": 4.96,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.565,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.57,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-03-26T14:28:06.378Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "equity": 4
      },
      "maxSingleTradeUsd": 3662
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
    "entryTimestampUtc": "2026-03-12T13:30:28.488Z",
    "exitTimestampUtc": "2026-03-12T14:27:52.574Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T13:30:28.488Z",
    "exitTimestampUtc": "2026-03-12T14:27:52.574Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 64.62,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime",
      "lane_coverage_gap"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "unclear"
}
```
