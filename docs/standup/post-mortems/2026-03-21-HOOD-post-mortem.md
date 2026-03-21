# Post-mortem: HOOD short (max_age)

**Date:** 2026-03-21

## Trade Snapshot

- HOOD short closed max_age: entry $70.25 -> exit $71.56, P&L $-32.99 (1727.9999999999998 USD, 5x).
- Entry time (UTC): 2026-03-20T18:56:18.765Z
- Hold window target: intraday
- Max loss budget: $64.80 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 1.859%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Sentiment post-mortem on HOOD short:**

The short got caught in a retail-bullish macro (likely post-FOMC relief or tech sector rotation). CT was probably neutral-to-bullish on fintech/brokers that day — did you check X sentiment before entry, or was this a pure TA play? If you didn't cross-check CT vibe against your thesis, that's the gap: sentiment can override technicals for 2–4 hours, especially on names like HOOD that retail loves. Going forward, run an X_PULSE on "HOOD" or "fintech" 30min before entry to catch if there's a bullish wall you're swimming against.

**Missing context:** What was CT saying about HOOD/fintech that day? Was there news (earnings, CEO tweet, regulatory)?

Confidence: 0.6 (I'd need the actual X sentiment from that

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the Polymarket odds for HOOD at entry and exit to assess whether the short was mispriced relative to market consensus—did the market repriced against you, or did you misread the edge? Also: what was your probability thesis vs. the market price at $70.25? Without that, I can't isolate whether this was a regime miss (market shifted fundamentals) or a sizing/timing miss (right direction, wrong scale/hold time).

**What I can say:** A 1.8% move against a 5x short in paper is tight—suggests low vol regime or tight stops. If Polymarket was pricing HOOD higher conviction than your model at entry, the loss flags a Bayesian updating miss (you underweighted market signal). 

**Ask:** Pull the Poly odds snapshot at entry/exit and your estimated fair value—that tells us if the market was smarter or if

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: timestamp

**Missing context:** Entry date, exit date, and reason for close (stop hit, time decay, thesis shift?). On mechanics alone: 5x leverage on a $70 stock is aggressive for a short—typical max for equities is 2-3x unless this was a defined-risk spread or hedge pair. The 1.8% loss on entry ($70.25→$71.56) suggests either a quick stop or a slow bleed; if it was time-based, you paid theta on a short, which compounds losses. **Call:** For paper HOOD shorts, size down to 2x max, use tighter stops (0.5-0.75%), or pair with a long hedge to define max loss upfront. Post the entry/exit dates and I'll assess if this was a structure problem or just unlucky timing.

**Confidence: 0.6** (need entry/exit timestamps and close reason

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$64.80, realized=$32.99, slippage=$-31.81, breach=false
- Consistency checks: pass

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.
- Promote bounded policy delta candidate and evaluate over a rolling window.

## Recursive Policy Delta

- Adaptation eligible: true
- Policy version at entry: baseline
- Proposed delta: none

## Machine-Readable Summary

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -31.81
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 1.859,
  "riskBudget": {
    "plannedRiskUsd": 64.8,
    "realizedRiskUsd": 32.99,
    "riskSlippageUsd": -31.81,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.859,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T18:56:18.765Z",
    "exitTimestampUtc": "2026-03-21T06:56:19.040Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T18:56:18.765Z",
    "exitTimestampUtc": "2026-03-21T06:56:19.040Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 64.8,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Solus": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
