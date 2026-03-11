# Post-mortem: BTC short (stop_loss)

**Date:** 2026-03-04

## Trade Snapshot

- BTC short closed stop_loss: entry $72832.43 -> exit $73420.00, P&L $-59.35 (6926.949197860963 USD, 10x).
- Entry time (UTC): 2026-03-04T15:49:24.672Z
- Hold window target: intraday
- Max loss budget: $45.03 (6.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 10 minutes
- Adverse move: 0.807%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** What was CT sentiment when you entered? Were whales long or short? Did you trade *against* dominant sentiment, or with it? — That's the only lens I can offer here. The $59.35 loss itself isn't my domain (that's execution/sizing for you), but if you shorted into a bullish CT macro (which I'd need to verify), that's a *sentiment mismatch* worth flagging for next time. Run me an X_PULSE from your entry time and I'll tell you if the crowd was positioned opposite.

**Confidence: 0.3** (can't assess without the sentiment snapshot).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** BTC prediction-market odds at entry/exit (what was Poly pricing vs spot?), trade duration, and macro regime (risk-on vs flight-to-safety). That said: a 6-minute move of ~$590 on a 10x short is a classic liquidation-cascade flush—your stop at +0.8% was tight for spot vol, especially if funding was positive (shorts getting squeezed). If Poly was pricing BTC lower than spot at entry, the trade had structural headwind; if it flipped bullish during your hold, that's regime shift, not bad execution. Without the odds snapshot, I can't isolate whether this was vol mispricing or just unlucky timing in a volatile 4-hour window.

**Confidence: 0.4**

(Need: Poly BTC odds at entry/exit, trade clock, funding rate.)

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** stop-loss width (58 bps—tight for 10x leverage on BTC), entry signal (why $72,832?), and market regime at entry (bull/bear/range). The loss itself is small in notional ($6,926 on 10x), but on a $100K stack that's ~7% draw—acceptable for a single trade, not if it's part of a pattern. **Mechanic feedback:** 10x leverage on a short with a 58 bps stop is aggressive positioning for BTC's typical intraday vol (80–120 bps weekly). If this is paper, the real question is whether your entry signal would have survived a wider stop (say 150 bps) at lower leverage (5x)—that's where edge lives, not in tight stops that get shaken out. Paste entry logic and I'll assess the signal structure.

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

- Quality score: 90/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=20, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$45.03, realized=$59.35, slippage=$14.32, breach=true
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

- PM_QUALITY_SCORE: 90
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: stop_too_tight_for_vol
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 14.32
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 90,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [
    "stop_too_tight_for_vol"
  ],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 10,
  "adverseMovePct": 0.807,
  "riskBudget": {
    "plannedRiskUsd": 45.03,
    "realizedRiskUsd": 59.35,
    "riskSlippageUsd": 14.32,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.807,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.65,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-04T15:49:24.672Z",
    "exitTimestampUtc": "2026-03-04T15:59:15.873Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-04T15:49:24.672Z",
    "exitTimestampUtc": "2026-03-04T15:59:15.873Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 10,
    "stopDistancePct": 0.65,
    "maxLossUsd": 45.03,
    "maxLossPct": 6.5,
    "entryAtrPct": 1.1367539267015707
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
