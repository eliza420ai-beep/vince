# Post-mortem: BTC long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- BTC long closed stop_loss: entry $70423.08 -> exit $69893.00, P&L $-70.40 (8770.792727272728 USD, 10x).
- Entry time (UTC): 2026-03-12T15:46:08.017Z
- Hold window target: intraday
- Max loss budget: $57.01 (6.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 23 minutes
- Adverse move: 0.753%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing context:** When did you enter/exit (date/time)? What was CT sentiment at entry vs. exit — were whales/alphas positioned long, or was there early bearish divergence you could've caught? Was there a macro event (Fed speak, jobs data, whale dump) that shifted the vibe between entry and stop?

**On the loss itself:** A $70 stop on a $70k entry is tight (0.1% risk) — that's execution-heavy and sentiment-blind. If CT was cautiously bullish at entry but turned fearful intraday, that's a flag you could've used to tighten or exit early rather than let the stop catch you.

**What I need to give you real feedback:** Timestamps, CT sentiment snapshot at entry/exit, and whether any alpha accounts flagged weakness before your stop triggered.

Confidence: 0.3 (too much missing to

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What timeframe (4h, 1h, 15m)? What was the thesis—mean reversion, breakout, macro catalyst? Did BTC prediction markets show weakness into your entry, or were they pricing strength?

**On the loss itself:** A $70 stop on a $70k entry (10 bps) is tight for spot/perps vol; if you were caught in a wick or funding spike, that's regime noise, not thesis failure. Pull the Polymarket BTC weekly/monthly odds at your entry time—if they showed >60% for higher prices, your directional call was sound and the loss was execution/sizing, not edge. If odds were <50%, the market was already pricing caution and your entry was fighting consensus.

**Key question:** Was this a scalp (minutes) or swing (hours)? Tight stops work on liquid micro-moves but bleed

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** leverage sizing relative to account (what % of paper capital?), stop placement rationale (why $530 below entry?), and whether this was a scheduled trade or reactive. **Mechanics read:** 10x on ~$70K notional is aggressive for a $100K stack if real; stop at 0.75% loss is tight—typical BTC intraday noise. **Call:** If this was paper bot testing, tighten your win/loss ratio target (aim 1.5:1 or better) and widen stops to 1-2% to avoid whipsaw. If leverage was >5x on live capital, size down—your edge is *weekly options income*, not intraday directional bets.

**Confidence: 0.65** (missing position sizing context relative to total account).

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

- Quality score: 96/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$57.01, realized=$70.40, slippage=$13.39, breach=true
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

- PM_QUALITY_SCORE: 96
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 13.39
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 96,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 23,
  "adverseMovePct": 0.753,
  "riskBudget": {
    "plannedRiskUsd": 57.01,
    "realizedRiskUsd": 70.4,
    "riskSlippageUsd": 13.39,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.753,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.65,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T15:46:08.017Z",
    "exitTimestampUtc": "2026-03-12T16:09:32.687Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T15:46:08.017Z",
    "exitTimestampUtc": "2026-03-12T16:09:32.687Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.65,
    "maxLossUsd": 57.01,
    "maxLossPct": 6.5,
    "entryAtrPct": 1.1346596858638742
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
