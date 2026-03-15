# Post-mortem: ETH short (stop_loss)

**Date:** 2026-03-15

## Trade Snapshot

- ETH short closed stop_loss: entry $2085.98 -> exit $2104.60, P&L $-11.49 (1219.3276688038102 USD, 4x).
- Entry time (UTC): 2026-03-15T01:18:27.602Z
- Hold window target: intraday
- Max loss budget: $9.66 (3.17%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 91 minutes
- Adverse move: 0.892%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter (exact time/date)? What was CT sentiment at entry vs. exit? Was there a macro catalyst (Fed speak, BTC move, ETH narrative shift) that flipped the trade against you?

**On the loss itself:** If you shorted into retail FOMO or whale accumulation (both detectable via X), that's a sentiment mismatch — you need to check whether CT was pricing in a move you didn't account for. A $19.62 move on a 4x short is tight; if sentiment was already bullish at entry, the setup was fighting headwinds.

**What I need to give you real feedback:** Entry timestamp, CT sentiment pulse at that moment, and whether macro (BTC, rates, macro news) shifted during your hold.

Confidence: 0.3 (can't assess without sentiment data from your entry window).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was your edge thesis (Polymarket consensus, model fair value, vol regime)? Did ETH prediction markets signal weakness or were you contrarian? Without knowing if you were betting *with* or *against* the market's pricing, I can't assess whether the stop was well-placed or if regime shifted mid-trade.

That said: $19.62 drawdown on a 4x short is tight risk management—the issue isn't the stop, it's whether the entry had positive EV in the first place. If Polymarket ETH upside markets (e.g., ETH >$2100 by week-end) were pricing >55% odds at your entry, you were fighting consensus and got caught in a mean-reversion snap. Check the orderbook depth and Synth fair value at entry time—if liquidity was thin or the model fair value was above $2100, that's

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, and whether this was part of a larger hedge or standalone perp. That said: **$1,219 loss on a 4x short suggests tight stop placement relative to volatility**—at $2,085 entry, a 0.9% move to stop is aggressive for ETH's typical intraday range. If this was a 1-2 hour hold, the structure was probably too tight; if multi-day, you ate a real directional miss. **Sizing check:** $1,219 loss on a $100K stack is ~1.2%—acceptable, but only if it's part of a disciplined series where you're not stacking losses. One trade doesn't tell me if your risk model is sound.

**What I need:** entry time, how long you held, and whether you're seeing a pattern of tight stops + reversals (suggests you

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$9.66, realized=$11.49, slippage=$1.83, breach=true
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

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: stop_too_tight_for_vol
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 1.83
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "stop_too_tight_for_vol",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 91,
  "adverseMovePct": 0.892,
  "riskBudget": {
    "plannedRiskUsd": 9.66,
    "realizedRiskUsd": 11.49,
    "riskSlippageUsd": 1.83,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.892,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.792,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-15T01:18:27.602Z",
    "exitTimestampUtc": "2026-03-15T02:49:29.441Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-15T01:18:27.602Z",
    "exitTimestampUtc": "2026-03-15T02:49:29.441Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 4,
    "stopDistancePct": 0.792,
    "maxLossUsd": 9.66,
    "maxLossPct": 3.17,
    "entryAtrPct": 1.583874345549738
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
