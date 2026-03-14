# Post-mortem: AMZN short (max_age)

**Date:** 2026-03-12

## Trade Snapshot

- AMZN short closed max_age: entry $211.00 -> exit $211.56, P&L $-4.47 (1411.1999999999998 USD, 5x).
- Entry time (UTC): 2026-03-11T23:13:06.112Z
- Hold window target: intraday
- Max loss budget: $21.17 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.266%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** What was CT saying about AMZN/mega-cap tech at entry vs. exit? Was there a macro shift (Fed pivot, AI hype rotation) that moved sentiment while you were in? A $0.56 move on a short is tight — sentiment data would tell us if you got shaken out by a narrative swing or if the trade setup was just undercapitalized for the noise.

**On sentiment alone:** If this was a contrarian short into retail FOMO on Mag 7, the loss is noise. If CT flipped bullish mid-trade and you held through it, that's the real signal — next time check the vibe before entry. Without the sentiment backdrop, I can't tell if this was bad timing or bad setup.

**Confidence: 0.3** (need X pulse at entry/exit timestamps to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the trade date, duration held, and the Polymarket odds for AMZN at entry/exit to compare paper pricing vs. prediction-market consensus. Without that, I can't tell if you got caught in a micro-reversal (noise) or if the market repriced AMZN fundamentals mid-hold.

**What I see:** $0.56 move on a $211 short (26 bps) on 5x leverage = $4.47 loss—tight stop or quick reversal. On paper perps, that's normal friction; the real question is whether Polymarket was pricing AMZN higher at entry (bullish edge) and you were fighting consensus.

**Ask:** Pull the Polymarket odds for AMZN (or the closest market—earnings, price level, timeframe) for your entry and exit times, and I'll tell you if you

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry/exit date, IV environment, and whether this was part of a broader hedge or standalone short. That said: **$4.47 loss on a $211 short at 5x leverage = 0.2% move against you** — tight stop or shallow conviction. If this was a directional bet, the sizing (5x on a single equity short) concentrates risk; if it was a hedge against long exposure, the P&L is noise. **Mechanics feedback:** paper trades should test *position structure* (sizing, hedge ratio, Greeks if options) before live execution — a $1.4K loss tells me you're testing conviction, which is the point, but next time log the *intent* (hedge vs directional) so we can assess whether the structure matched the thesis. **Confidence: 0.6** (need entry/exit dates and portfolio context to score the *decision*, not just the

## Root-Cause Tags

- Primary: thesis_invalid
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

- Quality score: 88/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=10, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: unclear
- Risk budget: planned=$21.17, realized=$4.47, slippage=$-16.70, breach=false
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

- PM_QUALITY_SCORE: 88
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: thesis_invalid
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -16.7
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 88,
  "qualityEscalate": false,
  "primaryCause": "thesis_invalid",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.266,
  "riskBudget": {
    "plannedRiskUsd": 21.17,
    "realizedRiskUsd": 4.47,
    "riskSlippageUsd": -16.7,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.266,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-11T23:13:06.112Z",
    "exitTimestampUtc": "2026-03-12T11:13:28.529Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-11T23:13:06.112Z",
    "exitTimestampUtc": "2026-03-12T11:13:28.529Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 21.17,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "unclear"
}
```
