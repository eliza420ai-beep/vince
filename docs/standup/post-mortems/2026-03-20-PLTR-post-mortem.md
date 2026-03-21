# Post-mortem: PLTR long (max_age)

**Date:** 2026-03-20

## Trade Snapshot

- PLTR long closed max_age: entry $154.34 -> exit $151.51, P&L $-94.06 (4992 USD, 5x).
- Entry time (UTC): 2026-03-20T11:00:55.200Z
- Hold window target: intraday
- Max loss budget: $187.20 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 1.834%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

Need key context: **When did you enter vs. exit?** (timeframe matters for sentiment read) and **what was CT sentiment on PLTR at entry vs. close?** (if you entered into euphoria, that's a different lesson than exiting into fear). From a pure sentiment lane: PLTR trades on AI/defense hype cycles — if you caught the tail end of a pump (high sentiment, high velocity posts), that's a crowded entry regardless of technicals. Without the date/time and CT vibe snapshot, I can't tell if this was a sentiment mispricing or just bad timing. **Confidence: 0.3** (need the data).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** I need the entry/exit dates, the Polymarket PLTR prediction at both points, and whether this was a directional bet or a hedge play. That said, the $154.34 entry into a $151.51 exit on 5x leverage is a 1.9% drawdown that got liquidated—typical of mean-reversion whipsaws in low-vol regimes. If Polymarket was pricing PLTR flat or up at entry, the paper bot may have mispriced the short-term friction (bid-ask, funding, gamma crush). If Polymarket was pricing down, you fought the consensus and lost—which is the real lesson. **What I'd dig into:** Was the trade against or with Polymarket's price signal at entry, and did realized vol exceed the implied regime?

**Confidence: 0.4** (need trade timestamps and Poly context to give

### Solus

- Lane: options mechanics and sizing
- Confidence: 72%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, exit catalyst/signal, and whether this was a scheduled test or reactive exit. That said: **5x leverage on PLTR ($4,992 notional) is oversized for a $100K stack if this was discretionary** — that's 5% capital risk on a single equity trade, which breaks our 10-20% position-sizing rule. The 1.9% loss on notional is acceptable, but **5x means you're betting on momentum precision, not thesis conviction.** For equity paper trades, target 2-3x max unless you have a specific short-dated catalyst and tight invalidation. **Confidence: 0.72** (structure feedback solid; missing trade duration/signal clarity).

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$187.20, realized=$94.06, slippage=$-93.14, breach=false
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

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -93.14
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 1.834,
  "riskBudget": {
    "plannedRiskUsd": 187.2,
    "realizedRiskUsd": 94.06,
    "riskSlippageUsd": -93.14,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.834,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T11:00:55.200Z",
    "exitTimestampUtc": "2026-03-20T23:01:13.372Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:00:55.200Z",
    "exitTimestampUtc": "2026-03-20T23:01:13.372Z"
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
      "entry_datetime"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
