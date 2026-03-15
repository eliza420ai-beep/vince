# Post-mortem: OPENAI short (stop_loss)

**Date:** 2026-03-15

## Trade Snapshot

- OPENAI short closed stop_loss: entry $915.65 -> exit $937.09, P&L $-32.69 (1366.9006012478728 USD, 3x).
- Entry time (UTC): 2026-03-15T12:09:35.242Z
- Hold window target: intraday
- Max loss budget: $20.50 (4.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 60 minutes
- Adverse move: 2.342%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter? (timing relative to CT sentiment shift matters) + What was CT saying about OPENAI at entry vs. exit? (did sentiment flip against you, or was this a contrarian setup that didn't pan out?)

**On the loss itself:** If you caught a bearish sentiment reversal mid-trade, that's actionable intel for next time — CT can turn on a stock fast. If sentiment was neutral/bullish the whole way, this was a directional miss, not a sentiment call. Either way, I'd need the X vibe at entry/exit to tell you if you were fighting the crowd or if the crowd just turned on you.

**Confidence: 0.3** (can't assess without entry timestamp + CT sentiment snapshot).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing critical context:** What was your entry thesis vs. the Polymarket price at entry/exit? Without knowing if you were fading consensus or riding it, I can't assess whether this was a regime miss or a sizing/timing call.

That said: **$915→$937 is a tight stop on a 3x perp**—you got shaken out in noise, likely during a volatility spike that didn't invalidate your view. Polymarket OPENAI often reprices on macro/earnings whispers, not intraday technicals; if the market consensus hadn't shifted materially, the stop was too tight for the leverage.

**Ask:** What was Polymarket's OPENAI price at your entry and exit? That tells us if you were fighting consensus (edge play) or got caught in a regime shift you missed.

Confidence: 0.6 (regime assessment requires Polymarket context I don

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, hold duration, and what triggered the stop (market move vs. planned exit). That said: **3x leverage on a $915 entry into a $937 exit is tight margin for error**—you caught a 2.3% move against you, which at 3x becomes a full stop loss. For paper trades proving edge, consider: (1) wider stops (5–8% range) to let thesis play out, or (2) 1–2x sizing to survive normal chop without liquidation psychology. The mechanics here aren't broken, but the leverage-to-thesis ratio suggests you're sizing for a tighter conviction than OPENAI's typical daily volatility warrants. **Confidence: 0.65** (structure clear, but need hold duration and catalyst context to assess if this was bad luck or bad setup).

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
- Risk budget: planned=$20.50, realized=$32.69, slippage=$12.19, breach=true
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

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 12.19
- PM_ADAPTATION_ELIGIBLE: false
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
  "holdMinutes": 60,
  "adverseMovePct": 2.342,
  "riskBudget": {
    "plannedRiskUsd": 20.5,
    "realizedRiskUsd": 32.69,
    "riskSlippageUsd": 12.19,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 2.342,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-15T12:09:35.242Z",
    "exitTimestampUtc": "2026-03-15T13:09:17.197Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-15T12:09:35.242Z",
    "exitTimestampUtc": "2026-03-15T13:09:17.197Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.5,
    "maxLossUsd": 20.5,
    "maxLossPct": 4.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
