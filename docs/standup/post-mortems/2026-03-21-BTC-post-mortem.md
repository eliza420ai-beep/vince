# Post-mortem: BTC short (max_age)

**Date:** 2026-03-21

## Trade Snapshot

- BTC short closed max_age: entry $70479.90 -> exit $70627.00, P&L $-9.35 (3612.6719999999987 USD, 4x).
- Entry time (UTC): 2026-03-20T21:19:27.380Z
- Hold window target: intraday
- Max loss budget: $23.48 (2.60%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.209%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter (exact time/date)? What was CT sentiment at entry vs. exit? Was there a macro event (Fed, inflation data, geopolitics) between those two timestamps that flipped the vibe?

**On the loss itself:** A $148 move on a $70k short is tight — you got shaken out on noise, not a structural break. If CT was still net-bearish during your hold, the trade setup was sound but your timeframe was too short. If sentiment *flipped* bullish between entry and exit (ETF inflows, macro relief, whale accumulation), that's the real lesson — you were fighting the crowd.

**Confidence: 0.4** — need the exact entry/exit times and what CT was saying in that window to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** entry/exit timestamps, what drove the move (macro event, liquidation cascade, Polymarket BTC price action), and whether Poly signaled a regime shift you didn't catch. That said: **$70.6K was resistance**—if Poly had consensus >65% for higher by your exit time, you were fighting the market's base rate. A 4x short on $148 of slippage suggests tight stops; next time check Polymarket's BTC outcome odds (weekly/monthly) *before* entry to confirm the market agrees with your directional bias. If Poly was pricing >55% upside and you shorted anyway, that's a regime mismatch, not bad execution.

**Confidence: 0.4** (need timestamps and Poly context to isolate whether this was bad timing or bad thesis).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** entry time/date, exit time/date, IV environment at entry/exit, funding rate at entry, and whether this was a hedge against a live Hypersurface position or a standalone directional bet.

**Mechanics read:** $148 notional loss on 4x leverage ($70.6K notional short) is tight slippage—suggests good execution—but the trade lasted long enough to bleed theta and potentially funding; a $70.5K short in ranging consolidation often has negative funding, which compounds losses. If this was a hedge for a covered call position, the loss might offset premium collected (need to see the full P&L pairing). If standalone: entry at $70,479 in a $70K zone is crowded; better to wait for IV spike or clearer directional signal before shorting.

**Next:** Post the entry/exit timestamps and funding rate snapshot, and confirm

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

- Quality score: 89/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: execution_miss
- Risk budget: planned=$23.48, realized=$9.35, slippage=$-14.13, breach=false
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

- PM_QUALITY_SCORE: 89
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: stop_too_tight_for_vol
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -14.13
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 89,
  "qualityEscalate": false,
  "primaryCause": "stop_too_tight_for_vol",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.209,
  "riskBudget": {
    "plannedRiskUsd": 23.48,
    "realizedRiskUsd": 9.35,
    "riskSlippageUsd": -14.13,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.209,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0.65,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T21:19:27.380Z",
    "exitTimestampUtc": "2026-03-21T09:19:49.395Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T21:19:27.380Z",
    "exitTimestampUtc": "2026-03-21T09:19:49.395Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 4,
    "stopDistancePct": 0.65,
    "maxLossUsd": 23.48,
    "maxLossPct": 2.6,
    "entryAtrPct": 1.1459685863874345
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ],
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "execution_miss"
}
```
