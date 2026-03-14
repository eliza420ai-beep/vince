# Post-mortem: XYZ100 short (max_age)

**Date:** 2026-03-13

## Trade Snapshot

- XYZ100 short closed max_age: entry $24607.08 -> exit $24627.00, P&L $-3.41 (2607.328810992366 USD, 5x).
- Entry time (UTC): 2026-03-13T01:32:28.116Z
- Hold window target: intraday
- Max loss budget: $39.11 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.081%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** What was CT sentiment at entry vs. exit? Was this a contrarian setup (CT extreme, you faded it) or a momentum trade (you rode the vibe)? Without the X pulse snapshot from entry time, I can't tell if sentiment diverged against you or if the macro just shifted. 

That said — $24.6k BTC short into a move higher usually means either (a) you caught a local top that reversed, or (b) sentiment stayed bullish despite your thesis. Either way, the loss is small relative to size, which is solid risk management.

**Confidence: 0.3** (need sentiment timeline to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** I need the entry/exit timestamps and which market this was against (BTC weekly call strike? macro event?). Without the regime window, I can't tell if this was a whipsaw in a tight range or a directional miss. That said: **$24,607–$24,627 is a 20-point range on spot**—if this was a short gamma scalp or mean-reversion play, the exit at +$20 suggests you got caught holding duration into volatility expansion rather than mean reversion. Check if Polymarket pricing (or IV surface) telegraphed a breakout or event risk you didn't price in at entry.

**Confidence: 0.4** (need trade structure + market context to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 30%
- Source stamp: options_mechanics_snapshot
- Missing data flags: entry_datetime

**Missing critical context:** entry date/time, exit date/time, and what triggered the close (time decay, stop hit, discretionary). On mechanics alone: $2,607 loss on a $24,607 short at 5x is ~10.6% drawdown from entry—acceptable for a paper trade, but the $20 move against you (0.08% price move) should not have cost that much unless leverage slippage or funding worked against you. If this was a short-term scalp, the hold time matters; if it was a swing, $20 against $24.6K notional is tight risk/reward. **Missing:** funding rate at entry/exit, hold duration, and whether you had a stop or let it run. Confidence: 0.3 (not enough data to assess structure).

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$39.11, realized=$3.41, slippage=$-35.70, breach=false
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

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -35.7
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.081,
  "riskBudget": {
    "plannedRiskUsd": 39.11,
    "realizedRiskUsd": 3.41,
    "riskSlippageUsd": -35.7,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.081,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T01:32:28.116Z",
    "exitTimestampUtc": "2026-03-13T13:32:40.807Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T01:32:28.116Z",
    "exitTimestampUtc": "2026-03-13T13:32:40.807Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 39.11,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ],
    "Solus": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
