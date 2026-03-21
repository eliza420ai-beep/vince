# Post-mortem: ANTHROPIC long (max_age)

**Date:** 2026-03-21

## Trade Snapshot

- ANTHROPIC long closed max_age: entry $596.00 -> exit $595.79, P&L $-1.84 (2156.5440000000003 USD, 3x).
- Entry time (UTC): 2026-03-20T17:41:45.233Z
- Hold window target: intraday
- Max loss budget: $32.35 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.035%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter/exit relative to CT sentiment? Was this during a bearish macro pulse, or did sentiment flip while you were in? A $1.84 loss on 3x ANTHROPIC is noise-level, but the *timing* against CT's vibe matters for the post-mortem.

**What I'd need to assess:** Did CT see ANTHROPIC as overbought at $596? Were macro headwinds (rates, tech sector) dominating the convo when you entered? If sentiment was already cooling and you caught the tail of a pump, that's a lesson about contrarian extremes — not the trade itself.

**Bottom line:** The loss is negligible, but if you entered into bullish sentiment that reversed 24h later, that's a flag to check CT's macro tone *before* entry next time.

Confidence: 0.4 (need entry/exit

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** What was your entry thesis (model edge, time horizon, catalyst)? Did Polymarket pricing on ANTHROPIC move against you, or was this pure perps slippage/liquidation risk on 3x? 

**If model-driven:** A $0.21 move on 3x leverage is tight—suggests either short holding period (minutes/hours) where Poly doesn't price fast enough to validate edge, or the edge was thin to begin with. Check: did Poly odds shift *before* your entry or *after*? That tells you if you front-ran consensus or chased it.

**Regime read:** Sub-$2 losses on 3x usually aren't regime calls—they're execution/timing noise. Polymarket's ANTHROPIC liquidity is solid but not deep; on 3x you're fighting bid-ask and your own position impact. If this was a high

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** position duration (how long held?), entry/exit rationale, and whether this was part of a larger hedge or standalone. On mechanics alone: $2.1K loss on a $1.84 move (0.3 bp) suggests 3x was too aggressive for a tick-trade on low-volatility equity—you'd need >$600 intraday range or multi-day hold to justify that leverage. If this was a 5-min scalp, the position size and leverage mismatch cost you; if it was meant to be a swing, you exited too early or entered without a clear invalidation level. **Confidence: 0.4** (need trade duration and thesis to assess structure).

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

- Quality score: 95/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$32.35, realized=$1.84, slippage=$-30.51, breach=false
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

- PM_QUALITY_SCORE: 95
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -30.51
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 95,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.035,
  "riskBudget": {
    "plannedRiskUsd": 32.35,
    "realizedRiskUsd": 1.84,
    "riskSlippageUsd": -30.51,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.035,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T17:41:45.233Z",
    "exitTimestampUtc": "2026-03-21T05:41:48.244Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T17:41:45.233Z",
    "exitTimestampUtc": "2026-03-21T05:41:48.244Z"
  },
  "solusContext": {
    "assetClass": "other",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 32.35,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
