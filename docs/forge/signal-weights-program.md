# Forge Autoresearch — Signal Weights Program

**Surface**: `src/plugins/plugin-vince/src/config/dynamicConfig.ts` → `DEFAULT_SOURCE_WEIGHTS`  
**Mutable file**: `.elizadb/forge/signal-weights-candidate.json`  
**Primary metric**: `holdout_replay_sharpe` (from `forgeSignalCache.replayWithWeights`)  
**Secondary metric**: `holdout_winRate` (must not fall below 0.40)  
**Evaluation budget**: 5,000 experiments per session  
**Holdout**: most-recent 20% of `.elizadb/forge/signal-cache.jsonl` records  
**Minimum records required**: 30 with outcomes before experiments begin

---

## What you are optimizing

VINCE's signal aggregator combines votes from 20+ sources. Each source has a weight in
`DEFAULT_SOURCE_WEIGHTS` that scales its vote in the aggregation loop:

```
vote_contribution = signal.confidence × sourceWeight × recencyDecay
```

You are searching for a `sourceWeights` object that, when applied to the frozen
`sourceVotes` in the signal cache, maximises `holdout_replay_sharpe` without
degrading `holdout_winRate` below 0.40.

**One change at a time.** Each experiment mutates a single weight value.
This isolates causality — if Sharpe improves, you know exactly why.

---

## Constraints

- All weights must remain in `[0.0, 3.0]`
- Weights marked `# DISABLED` (TopTraders, SanbaseWhales) must stay at `0.0`
- If `holdout_winRate < 0.40` after a mutation, **revert immediately** regardless of Sharpe
- If `totalTriggered` in holdout drops below 5, the experiment is underpowered — revert
- Never change more than one weight per experiment commit
- Maximum single-step change: `±0.3` (prevents cliff-edge jumps)

---

## Regime-specific mode

Run the experiment loop twice:
1. **Global**: all records, all regimes
2. **Uncertain-regime**: filter to `record.regime === 'uncertain'` only

The two optima diverge. The uncertain-regime weights typically need:
- Higher `MarketRegime` weight (regime signal is most predictive in uncertain markets)
- Lower `XSentiment` / `NewsSentiment` (noisy when there is no clear trend)
- Lower `BinanceFundingExtreme` (mean-reversion thesis breaks in choppy regimes)

Regime-specific weights are stored separately and applied by the aggregator when
`MarketRegime` reports `uncertain`.

---

## Evaluation function

```typescript
import {
  loadForgeSignalCache,
  splitHoldout,
  replayWithWeights,
  replayForRegime,
  type ReplayWeightsConfig,
} from '../src/plugins/plugin-vince/src/forge/forgeSignalCache';

const records = loadForgeSignalCache();
const { train, holdout } = splitHoldout(records, 0.2);

function evaluate(weights: Record<string, number>): number {
  const cfg: ReplayWeightsConfig = { sourceWeights: weights, defaultWeight: 1.0 };
  const m = replayWithWeights(holdout, cfg);
  if (m.withOutcome < 5) return -Infinity;          // underpowered
  if (m.winRate < 0.40) return -Infinity;           // win-rate floor
  return m.sharpe;                                  // primary metric
}
```

---

## Experiment protocol

### Startup
1. Load `.elizadb/forge/signal-cache.jsonl`
2. Check: `records.filter(r => r.outcome !== undefined).length >= 30`
   - If not: print "Insufficient labeled data — skipping session" and exit
3. Load current weights from `.elizadb/forge/signal-weights-candidate.json`
   - If file doesn't exist: copy `DEFAULT_SOURCE_WEIGHTS` from `dynamicConfig.ts` as baseline
4. Compute baseline Sharpe on holdout

### Experiment loop (up to 5,000 iterations)
For each iteration:
1. Pick one source weight to mutate (exclude disabled sources)
2. Sample a delta from `[-0.3, -0.15, -0.05, +0.05, +0.15, +0.3]`
3. Apply: `newWeight = clamp(current + delta, 0.0, 3.0)`
4. Evaluate on holdout
5. If `evaluate(candidate) > evaluate(baseline)`:
   - Accept: update `.elizadb/forge/signal-weights-candidate.json`
   - Log: `ACCEPTED source=${source} ${old} → ${new} sharpe_delta=${delta}`
6. Else: revert (no file write)
7. Every 500 iterations: log progress summary

### Shutdown
1. Print final metrics: `{ baseline_sharpe, final_sharpe, delta, experiments_run, accepted_count }`
2. If `final_sharpe > baseline_sharpe + 0.1`:
   - The candidate file is the winner — `dynamicConfig.ts` gets updated manually or by Forge Phase 2 auto-apply
3. Print per-regime breakdown from `regimeBreakdown` field

---

## Acceptance criteria for promotion

A candidate is promoted to `DEFAULT_SOURCE_WEIGHTS` when:
- Holdout Sharpe improvement: `≥ +0.1`
- Holdout win rate: `≥ 0.42`
- Holdout max drawdown: does not worsen by more than `+5%`
- `totalTriggered` in holdout: `≥ 10` (enough sample size)
- Promotion requires human review of the per-regime breakdown before merge

---

## What good results look like

```
Session: signal-weights-autoresearch
Records: 187 total, 94 with outcomes
Holdout: 38 records (20%)
Baseline Sharpe: 0.31

Experiments: 5,000
Accepted: 47 (0.94%)

ACCEPTED CoinGlass: 1.0 → 0.85 sharpe_delta=+0.08
ACCEPTED MarketRegime: 1.0 → 1.45 sharpe_delta=+0.12
ACCEPTED XSentiment: 0.5 → 0.30 sharpe_delta=+0.05
ACCEPTED BinanceFundingExtreme: 1.5 → 1.65 sharpe_delta=+0.07
...

Final Sharpe: 0.68 (Δ+0.37)
Win rate: 0.53 (baseline: 0.44)
Max drawdown: 0.21 (baseline: 0.29)

Regime breakdown (uncertain):
  triggered: 12, wins: 7, losses: 5, winRate: 0.58
  → MarketRegime weight boost especially effective in uncertain regime
```

---

## Files touched

| File | Action |
|---|---|
| `.elizadb/forge/signal-cache.jsonl` | Read-only input |
| `.elizadb/forge/signal-weights-candidate.json` | Mutated during experiments |
| `src/plugins/plugin-vince/src/config/dynamicConfig.ts` | Updated only on promotion |
| `docs/forge/signal-weights-results.md` | Session results log (append) |

---

## Connection to Forge PRD

This program is **Phase 1** of the Forge autoresearch roadmap:

> "Phase 1: Signal weight autoresearch on frozen replay data. Zero live API calls.
>  Nightly run, keep-or-revert via git-style versioning."

Phase 2 adds threshold autoresearch (`signal-thresholds-program.md`).  
Phase 3 adds risk parameter autoresearch (`risk-policy-program.md`).  
Phase 4 adds regime-specific weight sets (runs this program per-regime).  
Phase 5 adds prompt autoresearch (slower loop, requires LLM calls).

---

*Last updated: 2026-03-11 — initial implementation with ForgeSignalCache v1*
