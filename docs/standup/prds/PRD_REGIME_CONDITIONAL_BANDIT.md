# PRD: Regime-Conditional Bandit

**Status:** Design  
**Author:** Satoshi  
**Date:** 2026-02-26  
**Branch:** `satoshi/regime-conditional-bandit`

---

## Problem

The current Thompson Sampling bandit in `swarmCoordination.service.ts` maintains one set of Beta distributions per signal source — shared across all market regimes.

This is wrong.

A signal that crushes it in `TRENDING_BULL` (e.g. `BinanceLongShort`) may be noise in `CHOPPY`. A source that nails `CAPITULATION` reversals (e.g. `XSentiment` reading peak fear) is useless in `EUPHORIA`. Treating them the same conflates good signal with bad signal and slows learning by 5x.

**Today:** One bandit, 45 arms, all regimes blended  
**Target:** Five bandits, 45 arms each, regime-isolated learning

---

## The 5 Regimes (existing, from Phase 5)

| Regime | Characteristics | Oracle reads |
|--------|----------------|--------------|
| `TRENDING_BULL` | ADX > 25, prices making higher highs, momentum sources lead | Strong long bias, momentum signals alpha |
| `CHOPPY` | ADX < 20, range-bound, mean-reversion dominates | Fade breakouts, sentiment contrarian |
| `CAPITULATION` | FGI < 15, sharp drawdowns, extreme fear | Sentiment bottom signals, OI collapse |
| `EUPHORIA` | FGI > 80, parabolic move, late-cycle | Short setups, narrative decay signals |
| `RECOVERY` | Post-capitulation bounce, vol contracting | Early longs, macro signals weight up |

---

## Design

### Data structure change

```typescript
// CURRENT
interface SwarmBanditState {
  globalSources: Record<string, BetaParams>;  // one pool
  ...
}

// TARGET
interface SwarmBanditState {
  // Regime-conditional pools (5 regimes × 45 sources)
  regimeSources: Record<MarketRegime, Record<string, BetaParams>>;

  // Global pool (fallback for cold-start / unknown regime)
  globalSources: Record<string, BetaParams>;

  // Regime transition tracking
  regimeHistory: Array<{
    regime: MarketRegime;
    startedAt: number;
    endedAt?: number;
    outcomesRecorded: number;
  }>;

  // Per-regime performance summary (for reporting)
  regimePerformance: Record<MarketRegime, {
    totalTrades: number;
    wins: number;
    topSource: string;
    worstSource: string;
    lastActive: number;
  }>;

  ...rest unchanged
}

type MarketRegime = 'TRENDING_BULL' | 'CHOPPY' | 'CAPITULATION' | 'EUPHORIA' | 'RECOVERY' | 'UNKNOWN';
```

### Sampling logic change

```typescript
// CURRENT
sampleArm(sourceId: string): number {
  const params = this.state.globalSources[sourceId];
  return betaSample(params.alpha, params.beta);
}

// TARGET
sampleArm(sourceId: string, regime: MarketRegime): number {
  const pool = this.getPool(regime);
  const params = pool[sourceId] ?? this.state.globalSources[sourceId];

  // Cold start: fewer than MIN_OBSERVATIONS in this regime → blend with global
  if (params.count < MIN_REGIME_OBSERVATIONS) {
    const globalParams = this.state.globalSources[sourceId];
    return blendedBetaSample(params, globalParams, COLD_START_WEIGHT);
  }

  return betaSample(params.alpha, params.beta);
}

const MIN_REGIME_OBSERVATIONS = 10;  // per source per regime before trusting regime-specific params
const COLD_START_WEIGHT = 0.3;       // weight of regime-specific params during cold start
```

### Update logic change

```typescript
// CURRENT
recordOutcome(sourceId: string, success: boolean) {
  const params = this.state.globalSources[sourceId];
  if (success) params.alpha += 1;
  else params.beta += 1;
}

// TARGET
recordOutcome(sourceId: string, success: boolean, regime: MarketRegime) {
  // Update regime-specific pool
  const pool = this.getOrCreatePool(regime);
  if (!pool[sourceId]) pool[sourceId] = { alpha: 1, beta: 1, count: 0, lastUpdated: Date.now() };
  if (success) pool[sourceId].alpha += 1;
  else pool[sourceId].beta += 1;
  pool[sourceId].count += 1;
  pool[sourceId].lastUpdated = Date.now();

  // Also update global (regime-agnostic fallback)
  const global = this.state.globalSources[sourceId];
  if (success) global.alpha += 1;
  else global.beta += 1;

  // Update regime performance summary
  this.updateRegimePerformance(regime, sourceId, success);
}
```

### Cold start handling

The biggest risk: a new regime starts and we have no regime-specific data. Three layers of fallback:

```
1. Regime-specific pool (if count ≥ MIN_REGIME_OBSERVATIONS) → use directly
2. Regime-specific pool (if count < MIN_REGIME_OBSERVATIONS) → blend: 30% regime + 70% global
3. No regime-specific data at all → use global pool only
```

This ensures the bandit never goes blind during regime transitions.

---

## Regime Detection Integration

The regime is already computed by Oracle/VINCE. The bandit needs to:

1. **Read current regime** from the signal aggregator cache (already stored as `regime:trending_bull` etc.)
2. **Normalize** to `MarketRegime` enum (handle lowercase, underscores, etc.)
3. **Persist regime context** alongside each trade's feature store entry

```typescript
function detectCurrentRegime(runtime: IAgentRuntime): MarketRegime {
  const cache = runtime.getService('VINCE_SIGNAL_CACHE');
  const raw = cache?.getRegime() ?? 'unknown';
  return normalizeRegime(raw);  // 'trending_bull' → 'TRENDING_BULL'
}
```

---

## Learning Speed Comparison

| Scenario | Current bandit | Regime-conditional |
|----------|---------------|-------------------|
| 100 trades, all TRENDING_BULL | 100 updates to one pool | 100 updates to TRENDING_BULL pool |
| Next regime change to CHOPPY | Carries TRENDING_BULL noise | Starts fresh (+ global fallback) |
| Same source, 2 regimes | One blended signal | Two clean, isolated signals |
| Convergence to true best arm | ~200 trades | ~40 trades per regime |

**5x faster convergence per regime.** The system stops mixing apples and oranges.

---

## Reporting Unlocks

Once regime-conditional, the daily standup can surface:

```
=== BANDIT BY REGIME ===
TRENDING_BULL (last active: today, 47 trades)
  Best: CoinGlass (win rate: 71%)
  Worst: XSentiment (win rate: 38%)

CHOPPY (last active: 3 days ago, 22 trades)
  Best: XSentiment (win rate: 62%)  ← flips!
  Worst: BinanceLongShort (win rate: 29%)

CAPITULATION (last active: 2 weeks ago, 8 trades — cold start)
  Using global fallback (< 10 observations)
```

This is the kind of insight that makes VINCE genuinely better than any single-agent system.

---

## Implementation Plan

### Files to modify

| File | Change |
|------|--------|
| `swarmCoordination.service.ts` | Add `regimeSources`, update `sampleArm` + `recordOutcome` |
| `swarmCoordination.service.test.ts` | Add regime-conditional tests |
| `vincePaperTrading.service.ts` | Pass current regime when recording outcomes |
| `dailyStandup.action.ts` | Surface per-regime bandit summary |

### Estimated effort: **S** (1 day)

Core change is surgical — `regimeSources` replaces/extends `globalSources`. The blending logic is ~50 lines. The rest is passing `regime` through the call chain.

---

## Acceptance Criteria

- [ ] `regimeSources` persists across restarts (same JSON file, new key)
- [ ] Cold start fallback activates when `count < 10` per regime
- [ ] `recordOutcome` updates both regime pool and global pool
- [ ] `sampleArm` uses regime pool when available, blends during cold start
- [ ] Standup action surfaces per-regime top/worst source
- [ ] TypeScript errors: 0
- [ ] Tests: regime isolation, cold start fallback, cross-regime learning

---

## What This Unlocks Next

- **Regime-conditional genome** — different mutation parameters per regime
- **Regime transition alerts** — "just entered CHOPPY, switching bandit context"
- **Cross-regime source comparison** — "XSentiment kills in CHOPPY, useless in TRENDING_BULL"
- **Regime prediction market** — bet on which regime we're entering next

---

_The bandit learns faster when it knows what game it's playing._
