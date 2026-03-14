# Post-mortem: HOOD long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- HOOD long closed stop_loss: entry $76.86 -> exit $75.22, P&L $-38.32 (1751.2229189189186 USD, 5x).
- Entry time (UTC): 2026-03-13T12:22:43.544Z
- Hold window target: intraday
- Max loss budget: $26.27 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 74 minutes
- Adverse move: 2.138%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** What was CT's sentiment on HOOD at entry vs. exit? Was this a contrarian setup (CT bearish, you long) or consensus trade (CT bullish)? Also — was this tied to a macro event (rates, Fed speak, sector rotation) that shifted mid-trade?

**What I can say:** A 1.7% stop loss on a 5x levered equity play is tight; if CT flipped bearish on retail/fintech during your hold, that's a real headwind, not just noise. Check if whale accounts or algo traders were shorting HOOD into your entry — that's a red flag for sentiment misalignment.

**Confidence: 0.3** — need the sentiment timeline to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket odds for HOOD at entry and exit, live volume/spread, and what regime shift triggered the stop. Without those, I can't tell if the market repriced HOOD fundamentally or if you hit liquidity slippage on a thin orderbook.

**What I'd pull:** Let me check if there's an active HOOD prediction market—if so, I'll compare entry/exit Polymarket probabilities to your price action to see if the market consensus shifted or if this was a localized move on Hyperliquid. That delta tells you whether to re-enter on a dip or wait for regime confirmation.

**Bottom line:** A $38 loss on 5x is tight risk management; the real question is whether Polymarket saw the same repricing you did. If not, that's your edge signal for next time.

Confidence: 0.4 (need live odds and

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold time, IV environment, and whether this was a planned hedge or directional bet—hard to assess mechanics without knowing the thesis. **On sizing:** $1,751 notional at 5x on a $76.86 entry is aggressive for a paper trade (suggests ~$350 capital); if this was testing edge, the stop at $75.22 (2.1% drawdown) is tight—typical equity stop is 3-5%. **Mechanics call:** If HOOD is part of your HIP-3 research stack (not live until BTC > 125K), paper losses are data, not capital risk—useful for refining entry/exit logic. **Next:** Post entry thesis + market regime when you closed (bull/bear/ranging) and I'll assess whether the stop placement was sound or if you're over-testing noise.

Confidence: 0.4

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

- Quality score: 85/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$26.27, realized=$38.32, slippage=$12.05, breach=true
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

- PM_QUALITY_SCORE: 85
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 12.05
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 85,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 74,
  "adverseMovePct": 2.138,
  "riskBudget": {
    "plannedRiskUsd": 26.27,
    "realizedRiskUsd": 38.32,
    "riskSlippageUsd": 12.05,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 2.138,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T12:22:43.544Z",
    "exitTimestampUtc": "2026-03-13T13:36:40.156Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T12:22:43.544Z",
    "exitTimestampUtc": "2026-03-13T13:36:40.156Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 26.27,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
