# Post-mortem: AMD short (stop_loss)

**Date:** 2026-03-06

## Trade Snapshot

- AMD short closed stop_loss: entry $197.21 -> exit $200.18, P&L $-33.92 (2180.0266360505166 USD, 5x).
- Entry time (UTC): 2026-03-05T17:41:57.750Z
- Hold window target: intraday
- Max loss budget: $32.70 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 523 minutes
- Adverse move: 1.506%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on AMD at entry vs. exit? Was there a macro catalyst (Fed speak, earnings, sector rotation) that shifted the vibe between those two points?

**On the loss itself:** A $34 stop on a $197 entry is tight (17 bps) — if CT flipped bullish on semiconductors or the broader market between entry and stop, that's a real headwind, not just noise. Without the sentiment timeline, I can't tell if you got caught in a contrarian setup (CT was bearish, you shorted, then retail/whales rotated) or if you simply missed a macro shift.

**What I need to give you real feedback:** Entry timestamp, CT sentiment pulse at that moment, and what changed by exit.

Confidence: 0.3

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** AMD prediction-market pricing at entry/exit (what was the market pricing the move?), volatility regime (IV spike into earnings?), and whether this trade was hedged against a specific Polymarket position or standalone directional.

**On the regime:** A $3 move on a 5x leveraged short into a $200 stock is a classic stop-hunt on thin liquidity—AMD's weekly options typically see vol crush post-earnings or vol expansion into macro. If this was a naked directional short into a known catalyst window (earnings, Fed, chip cycle rotation), the stop was too tight for that regime.

**The feedback:** Check if a Polymarket edge (e.g., "AMD outperforms semis this quarter") was priced in—if so, the short should have been sized *against* that edge, not naked. Paper bot should weight regime volatility (ATR, IV percentile

### Solus

- Lane: options mechanics and sizing
- Confidence: 0%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Mechanics read:** You sized into a short at $197.21 with 5x leverage on a $2,180 notional position—that's a ~$436 stop (2.1% buffer). AMD closed above resistance; your stop triggered cleanly. The loss is contained (~1.6% of notional), which is textbook risk management. **Missing context:** entry thesis (support break? IV spike?), time-in-trade (minutes vs hours?), and whether this was part of a pair trade or standalone. If it was a quick tactical short into resistance and you got shaken out by a wick, that's normal friction; if it was a thesis short and AMD held support, that's a signal to re-examine the invalidation. **Next:** Post the entry thesis so I can assess whether the stop was placed correctly or if you need tighter invalidation rules for this asset class.

Confidence: 0

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
- Risk budget: planned=$32.70, realized=$33.92, slippage=$1.22, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 1.22
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
  "holdMinutes": 523,
  "adverseMovePct": 1.506,
  "riskBudget": {
    "plannedRiskUsd": 32.7,
    "realizedRiskUsd": 33.92,
    "riskSlippageUsd": 1.22,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.506,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T17:41:57.750Z",
    "exitTimestampUtc": "2026-03-06T02:24:31.295Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T17:41:57.750Z",
    "exitTimestampUtc": "2026-03-06T02:24:31.295Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 32.7,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
