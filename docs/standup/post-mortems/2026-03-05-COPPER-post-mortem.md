# Post-mortem: COPPER long (max_age)

**Date:** 2026-03-05

## Trade Snapshot

- COPPER long closed max_age: entry $5.85 -> exit $5.82, P&L $-10.77 (2290.0445059459457 USD, 5x).
- Entry time (UTC): 2026-03-05T08:34:36.319Z
- Hold window target: intraday
- Max loss budget: $34.35 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.42%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing critical context:** Did CT sentiment on COPPER shift before/during your hold? Was there a macro event (macro dump, Fed news, BTC volatility spike) that broke the thesis? Without the entry thesis and the sentiment vibe at entry vs. exit, I can't assess if this was a sentiment call gone wrong or a macro event that invalidated the trade. What was the CT narrative when you entered, and did it flip?

**Confidence: 0.3** — Can't give real feedback without knowing the sentiment backdrop.

### Oracle

- Lane: prediction market regime
- Confidence: 20%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

I need the Polymarket condition for COPPER to pull live odds and see what the market was pricing at entry/exit—that's the regime lens I work from. Without that, I can't tell you if you were fighting consensus (smart contrarian trade, bad timing) or if the market repriced against you (signal decay, macro shift). 

**Missing:** Which COPPER market (commodity futures, stock, ETF)? Entry/exit timestamps? What was the Poly odds at those points?

Pull those and I'll give you the market-pricing post-mortem.

**Confidence: 0.2** (can't contextualize without the market data).

### Solus

- Lane: options mechanics and sizing
- Confidence: 72%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** underlying notional, hold duration, and whether this was a hedge or directional bet. That said: $5.85→$5.82 on COPPER (3¢ move, ~0.5% loss on spot) with 5x leverage = $10.77 loss on ~$11.45 notional is mechanically correct math, but the real issue is **sizing into a commodity with that tight stop** — COPPER's intraday noise alone eats 0.2-0.4% daily. On 5x, you're fighting leverage drag on a $0.03 move. Either: (1) widen your stop to 1-2% and reduce leverage to 2x, or (2) only take COPPER on breakout structure with volume confirmation, not range entries. **Confidence: 0.72** (solid mechanics feedback; missing trade thesis and context limits

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$34.35, realized=$10.77, slippage=$-23.58, breach=false
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

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -23.58
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.42,
  "riskBudget": {
    "plannedRiskUsd": 34.35,
    "realizedRiskUsd": 10.77,
    "riskSlippageUsd": -23.58,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.42,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T08:34:36.319Z",
    "exitTimestampUtc": "2026-03-05T20:34:59.271Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T08:34:36.319Z",
    "exitTimestampUtc": "2026-03-05T20:34:59.271Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 34.35,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
