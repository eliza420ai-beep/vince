# Post-mortem: BTC long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- BTC long closed stop_loss: entry $71848.37 -> exit $71031.00, P&L $-62.77 (5285.045746607015 USD, 3x).
- Entry time (UTC): 2026-03-13T16:49:12.238Z
- Hold window target: intraday
- Max loss budget: $58.53 (3.32%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 61 minutes
- Adverse move: 1.138%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing context:** What was CT sentiment *at entry* vs. *at exit*? Was this a contrarian fade (CT euphoric, you shorted) or a momentum trade (CT bearish, you went long)? Without the sentiment timestamp, I can't tell if you fought macro headwinds or if positioning just shifted against you.

**Quick take:** A $62 stop on a $71k entry is tight (0.09%) — if CT flipped from bullish to cautious during your hold, that's a macro read miss, not a sizing issue. Sentiment can move faster than price in ranging markets.

**What I need:** CT vibe at entry time + at exit time (or rough timestamps). Then I can tell you if sentiment divergence killed the trade or if it was just noise.

Confidence: 0.4 (incomplete data)

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing context:** BTC prediction-market pricing at entry/exit (Polymarket or similar), position duration, and what macro regime you were trading into (Fed decision, volatility spike, liquidation cascade). That said, a $71.8K → $71K stop in 3x leverage suggests you sized for sub-1% slippage tolerance—tight for spot-perp basis risk. If you entered on Polymarket upside (>50% prob of $72K+) and got stopped by intraday noise, the regime was whipsaw, not directional break; that's a friction cost, not a signal failure. Check whether the edge was *duration-matched* to your hold time (hours vs. days changes everything on perps).

**Confidence: 0.4** (need trade timestamp + market odds at entry to assess if the setup was sound).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, exit date, stop-loss % from entry, current market regime (IV, funding, momentum), and whether this was a test of the bot's execution or a live edge signal. 

**On the structure:** $62 absolute loss on a $71K entry is tight—good discipline—but 3x leverage on a $5.3K notional long suggests you're testing execution, not running a real edge. If this was bot validation, the mechanics are sound (stop triggered cleanly). If this was a live trade, I'd want to see: (1) Why long BTC here vs. selling premium on Hypersurface, and (2) whether the stop was based on invalidation (e.g., break below $71K support) or just risk management (which is fine, but tell me the thesis).

**Call:** Post-mortem is clean on mechanics; rerun with context on

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
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$58.53, realized=$62.77, slippage=$4.24, breach=true
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
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 4.24
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
  "holdMinutes": 61,
  "adverseMovePct": 1.138,
  "riskBudget": {
    "plannedRiskUsd": 58.53,
    "realizedRiskUsd": 62.77,
    "riskSlippageUsd": 4.24,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.138,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.107,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T16:49:12.238Z",
    "exitTimestampUtc": "2026-03-13T17:50:37.639Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T16:49:12.238Z",
    "exitTimestampUtc": "2026-03-13T17:50:37.639Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.107,
    "maxLossUsd": 58.53,
    "maxLossPct": 3.32,
    "entryAtrPct": 1.107434554973822
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
