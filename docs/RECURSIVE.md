# VINCE: The Recursive Architecture

## What this is

A deep analysis of how the autoresearch-mlx framework — Apple Silicon port of Karpathy's autonomous research loop — fundamentally changes what VINCE can become. Not just "Forge runs experiments overnight." A complete recursive self-improvement architecture with five distinct loops, each optimizing a different surface, each feeding the next.

Source being analyzed: https://github.com/eliza420ai-beep/autoresearch-mlx

**Read this when:** Designing Forge's evaluation harness, adding the signal cache, creating per-surface program.md files, or thinking about what "self-improving" actually means in a trading system.

---

## The framework: what autoresearch-mlx does and why it works

The loop has four components:

1. **One mutable file** — `train.py` only. Everything else is fixed.
2. **One metric** — `val_bpb` (bits per byte on validation set). One number. Not a composite.
3. **Fixed evaluation budget** — 5 minutes per experiment. Not "run until convergence."
4. **Keep-or-revert via git** — win: `git commit`. lose: `git checkout`.

Point an AI coding agent at `program.md`, which tells it exactly what to try, how to measure it, and when to keep vs revert. Let it run overnight. Wake up to a git log of improvements.

First session results on autoresearch-mlx: val_bpb from 2.667 to 1.807 in 4 experiments (baseline through `reduce depth from 8 to 4`). Overnight runs pushed to 1.294. The critical observation: **Mac Mini found different winners from M4 Max** — "some of those Mac Mini findings did not carry cleanly onto the Max baseline." The hardware constraint changes the optimal configuration.

AIHF's autoresearch (applied to portfolio logic): 27 experiments in 7 minutes, Sharpe -0.79 to +2.22, with the single biggest win being "disable shorting in bull market" — a regime-aware principle, not a parameter tweak.

The framework works because of three properties:

**Property 1: The evaluation function is deterministic and cheap.** In autoresearch-mlx: `val_bpb` takes milliseconds after the training run. In AIHF: after caching price data and agent signals once, each experiment takes 5 seconds with zero LLM calls. The expensive part (training the model, running 18 agents) is done once. The cheap part (evaluating parameter changes) runs in a tight loop.

**Property 2: One change at a time prevents compound effects.** When you change two things simultaneously and the metric improves, you don't know which change was responsible. One change at a time means every win in `results.tsv` is attributable. This also prevents phantom synergies that don't generalize.

**Property 3: The constraint reveals the actual optimum for your specific context.** The 5-minute budget on Mac Mini forced the optimizer toward step-efficiency over model capacity — and discovered a completely different winner stack. For VINCE, the equivalent constraint is the actual closed trade history. You don't optimize for hypothetical infinite data. You optimize for the 50-200 trades you actually have. The winners found are calibrated to your specific data distribution.

---

## Why VINCE is uniquely positioned for this

**Claim 1: VINCE's "dataset" grows continuously.** In autoresearch-mlx, Shakespeare doesn't generate new Shakespeare. The training set is fixed. In VINCE, every closed paper trade adds a new row to the feature store. More trades → better evaluation function → more reliable autoresearch winners → better configuration → better trades. The loop compounds. Language model autoresearch doesn't have this property.

**Claim 2: VINCE has more mutable surfaces than any ML system.** autoresearch-mlx has one mutable file (`train.py`). VINCE has five distinct surfaces, each with a different metric, each improvable independently:
- Signal source weights (`dynamicConfig.ts` → `config/weights.json`)
- Signal thresholds (when each source fires)
- Risk parameters (sizing, stops, ATR multipliers)
- ML feature selection (which features to include in ONNX)
- Agent prompts (post-mortem analysis, entry gate wording)

Each surface has its own loop. Each loop runs on the same shared signal cache. The surfaces are independent enough to optimize separately but coupled enough that wins on one surface change the baseline for others.

**Claim 3: Today's evidence proves the evaluation function would have worked.** Today: 4 consecutive losses, all `regime:uncertain`, all Echo 30-40% confidence, all budget breach, all stop-loss. Primary cause on 3 of 4: `regime_conflict`. If `replay_sharpe_holdout` had been the evaluation metric on a signal weights experiment last week, the "MarketRegime weight: 1.0 in uncertain regime" would have been a losing configuration. A winner would have been found — probably MarketRegime at 2.0 or a regime-gate blocking new longs when MarketRegime is uncertain.

This is not theoretical. The evaluation function, applied to last week's closed trades, would have surfaced the regime_conflict problem before it became today's -83% paper day.

---

## The central insight: separate expensive from cheap

This is the thing Forge currently gets partially right but not fully.

**What Forge currently does (from the PRD):** "Feature-store JSONL replay (last 90-300 days)" + "VincePaperTradingService replay" + measure `causal_uplift × sharpe × brier_calibration`.

**The problem:** `VincePaperTradingService replay` requires re-running the signal aggregator on historical data. If the aggregator calls live APIs (CoinGlass, Binance, Deribit), the replay is:
- Slow (API latency per trade)
- Non-deterministic (API results change over time)
- Expensive (API call cost × N trades × M experiments)

**The autoresearch-mlx solution:** Cache the expensive part once. Run the cheap part many times.

The signal cache is the enabling technology. It's what makes VINCE's autoresearch as fast as AIHF's.

### The signal cache architecture

Every time the paper bot evaluates a trade, the signal aggregator already produces a full structured output: which sources contributed, what each said, the confidence, the factors, the weights applied. This data is already logged. The signal cache formalizes it as a queryable archive.

```typescript
interface SignalCacheRecord {
  tradeId: string;
  timestamp: number;
  asset: string;
  
  // What each source said (raw, pre-aggregation)
  sourceOutputs: {
    [sourceName: string]: {
      direction: 'long' | 'short' | 'neutral';
      confidence: number;
      factors: string[];
      weight: number; // what weight was applied at the time
    };
  };
  
  // What the aggregator decided
  aggregatedDirection: 'long' | 'short' | 'neutral';
  aggregatedConfidence: number;
  aggregatedStrength: number;
  
  // Market context at decision time
  regime: 'bullish' | 'bearish' | 'uncertain' | 'volatile';
  btcFearGreed: number;
  dvol: number;
  
  // Outcome (filled when trade closes)
  outcome?: 'win' | 'loss' | 'neutral';
  pnlPct?: number;
  holdMinutes?: number;
  primaryCause?: string; // from post-mortem
}
```

Once this cache exists, the replay function is pure arithmetic:

```typescript
function replayWithWeights(
  cache: SignalCacheRecord[],
  newWeights: Record<string, number>,
  holdout: boolean = true
): { sharpe: number; winRate: number; maxDrawdown: number } {
  const trades = holdout 
    ? cache.slice(Math.floor(cache.length * 0.8)) // last 20% as holdout
    : cache;
  
  return trades.map(record => {
    // Re-aggregate with new weights — no API calls
    const newSignal = reAggregateSignals(record.sourceOutputs, newWeights);
    
    // Would we have opened this trade with new weights?
    const wouldOpen = newSignal.confidence >= CONFIDENCE_THRESHOLD;
    
    if (!wouldOpen && record.outcome === 'loss') return { pnl: 0 }; // avoided loss
    if (!wouldOpen && record.outcome === 'win') return { pnl: -record.pnlPct }; // missed gain
    return { pnl: record.pnlPct }; // same as actual
  });
  // compute sharpe from pnl series
}
```

**Speed:** No API calls. No LangGraph orchestration. Pure object traversal on cached data. 100 trades × 1ms per trade = 100ms per experiment. 1000 experiments in 100 seconds. Overnight: 50,000+ experiments.

This is the autoresearch-mlx insight applied to VINCE: once you have the signal cache, the search space becomes astronomically larger than what Forge can currently explore.

---

## The five recursive layers

Each layer has: one mutable file, one primary metric, one evaluation command, program.md instructions.

---

### Layer 1: Signal weight autoresearch

**What it optimizes:** Which signal sources to trust, and how much, in each market context.

**Mutable file:** `config/weights.json`
```json
{
  "global": {
    "CoinGlass": 1.0,
    "BinanceTakerFlow": 0.8,
    "MarketRegime": 1.0,
    "NewsSentiment": 0.6,
    "XSentiment": 0.5,
    "StandupSignal": 0.6,
    "DeribitIVSkew": 0.7,
    "LiquidationCascade": 2.0,
    "AIHFEquity": 1.8
  },
  "regime_overrides": {
    "uncertain": {
      "MarketRegime": 2.0,
      "XSentiment": 0.2,
      "LiquidationCascade": 1.5
    },
    "bull": {
      "BinanceTakerFlow": 1.2,
      "MarketRegime": 0.8
    }
  }
}
```

**Primary metric:** `replay_sharpe_holdout` — Sharpe ratio on the holdout 20% of the signal cache.

**Evaluation command:**
```bash
bun run scripts/replay-signals.ts \
  --weights config/weights.json \
  --cache .elizadb/vince-paper-bot/signal-cache.jsonl \
  --holdout 0.2 \
  | grep "replay_sharpe_holdout="
```

**Speed:** ~100ms per experiment. 1000+ experiments/hour.

**What it finds (prediction based on today's evidence):**
- MarketRegime weight should increase in uncertain regime (today's primary cause was regime_conflict × 3)
- XSentiment weight should decrease when confidence < 40% (it was 30-40% on all today's trades)
- StandupSignal weight may need regime conditioning
- LiquidationCascade weight is probably underpowered for extreme conditions

**Program.md instructions for the AI agent:**

```markdown
# Signal Weight Autoresearch — VINCE

## Your goal
Improve replay_sharpe_holdout by changing one weight in config/weights.json per experiment.

## What you can change
- Adjust any weight in "global" by ±0.1 to ±0.5
- Add or modify a "regime_overrides" entry for "uncertain", "bull", or "bear"
- Set a weight to 0 to disable a source
- Never change more than one weight per experiment

## What to look for in the cache
- Sources present on losing trades: consider reducing their weight
- Sources absent on winning trades: consider checking thresholds (Layer 2)
- Sources where all losses had regime:uncertain: add to regime_overrides.uncertain

## Evaluation
Run: bun run scripts/replay-signals.ts --weights config/weights.json --holdout 0.2
Read the last line: replay_sharpe_holdout=X.XXXX

## Keep or revert
If new sharpe > best_sharpe in results.tsv: git add config/weights.json && git commit -m "keep: [description] sharpe X.XXXX → X.XXXX"
Otherwise: git checkout config/weights.json

## Log
Append to autoresearch/weights-results.tsv: [timestamp, sharpe, status, description]

## Current priority
Today's 4 losses all had regime:uncertain + low Echo confidence. Start with:
1. Increase MarketRegime weight from 1.0 to 1.5 in regime_overrides.uncertain
2. Decrease XSentiment weight from 0.5 to 0.25 in regime_overrides.uncertain
3. Try setting a "uncertain_gate": minimum MarketRegime source agreement to open
```

---

### Layer 2: Threshold autoresearch

**What it optimizes:** When each source fires. The thresholds determine the sensitivity of the signal aggregator.

**Mutable file:** `config/thresholds.json`
```json
{
  "BinanceTakerFlow": { "bullish": 1.25, "bearish": 0.75 },
  "BinanceLongShort": { "bullish": 1.4, "bearish": 0.72 },
  "BinanceFundingExtreme": { "top_pct": 10, "bottom_pct": 10 },
  "DeribitPutCallRatio": { "bearish": 1.2, "bullish": 0.82 },
  "XSentiment": { "confidence_floor": 40 },
  "NewsSentiment": { "confidence_floor": 40 },
  "PolymarketSentiment": { "confidence_floor": 40 },
  "AIHFEquity": { "agreement_rate_floor": 0.60 },
  "StandupSignal": { "confidence_floor": 25 },
  "entry_gate": {
    "min_sources": 2,
    "min_confidence": 55,
    "min_strength": 0.4
  }
}
```

**Primary metric:** `replay_sharpe_holdout` — same as Layer 1 but now evaluating threshold sensitivity.

**The insight from autoresearch-mlx:** "Shorter EMA windows (8/21/55 → 5/13/34)" was the third biggest improvement in AIHF autoresearch. For VINCE, the equivalent is: are the current thresholds tuned to the actual data distribution, or were they set by intuition? The signal cache answers this question empirically.

**Speed:** Same as Layer 1 (~100ms per experiment).

**What it finds (prediction):**
- Entry gate `min_sources: 2` may be too low for uncertain regime (today's trades likely had only 2 sources)
- XSentiment `confidence_floor: 40` is barely above neutral (30-40% confidence on all today's trades passed this gate)
- Consider a dynamic threshold that tightens in uncertain regime

---

### Layer 3: Risk parameter autoresearch

**What it optimizes:** Position sizing, stop distances, leverage caps. The configuration in `policies/trading-policy.yaml`.

**Mutable file:** `policies/trading-policy.yaml` (already exists from Forge PRD)

**Primary metric:** Composite — `replay_sharpe_holdout × (1 - max_drawdown_pct)`. Sharpe alone can be gamed by reducing position sizes; the drawdown term prevents that.

**The autoresearch-mlx insight applied:** "Larger position sizes in confirmed trend (0.5 → 1.0)" was the fourth biggest win. The inverse for VINCE: smaller positions in uncertain regime. The current `base_risk_fraction` may be regime-unaware — the same sizing applies regardless of regime confidence.

**What it finds (prediction based on today):**
- `base_risk_fraction` in uncertain regime should be 0.4-0.5× the baseline
- Stop distance should be ATR-based, not fixed percentage (today's BTC had `stop: 0.65%` but `ATR: 1.13%` — stop was inside the noise band)
- Leverage cap per asset class: CRCL (lower liquidity) should have lower max leverage than AMZN

**Speed:** ~200ms per experiment (needs to simulate sizing + stops on cached trades).

---

### Layer 4: Feature selection autoresearch

**What it optimizes:** Which features to include in the ONNX model training. Current: 40+ features. Are all of them signal? Or is some of them noise that degrades the model?

**Mutable file:** `config/features.json` — a boolean mask over the full feature set
```json
{
  "signal_strength": true,
  "signal_confidence": true,
  "signal_xSentimentScore": true,
  "signal_coinGlassFunding": true,
  "signal_binanceTakerFlow": true,
  "market_regime": true,
  "market_dvol": true,
  "aihf_agreementRate": false, // not yet — add when AIHF Surface 3 lands
  "hold_duration_target": true,
  "source_count": true
}
```

**Primary metric:** `holdout_auc` — the ONNX model's AUC on the holdout set when retrained with the feature subset.

**The autoresearch-mlx insight:** Removing features (reducing depth from 8 to 4 layers) was the single biggest improvement on Apple Silicon. Fewer features with the same signal content beats more features with noise. For VINCE: the 40+ features in the feature store include several that were added because they were available, not because they were predictive. The loop finds which to drop.

**Speed:** Requires ONNX retraining per experiment — slower (~30-60 seconds). Limit to 20-30 experiments/night. Still useful.

**When to run:** After ONNX is trained on 90+ trades (current prerequisite). This layer only activates in Phase 2.

---

### Layer 5: Prompt autoresearch

**What it optimizes:** The agent system prompts that generate post-mortem analysis, entry gate reasoning, and Solus strike ritual guidance.

**Mutable file:** `prompts/vince-entry-gate.md` or `prompts/solus-strike-ritual.md` (one at a time)

**Primary metric:** `pm_quality_signal` — correlation between post-mortem quality score (PM_QUALITY_SCORE) and the next trade's outcome in the same asset. High-quality post-mortems should predict better subsequent trades if the prompts are generating actionable analysis.

**The key difference from Layers 1-4:** This layer requires LLM calls to evaluate (post-mortems are generated by LLMs). It cannot run hundreds of experiments per night. Cadence: weekly, 5-10 experiments per session.

**What it finds over time:**
- Does adding "regime context" to the entry gate prompt change trade quality?
- Does the specific phrasing of "what went wrong" in post-mortems affect whether the lesson is applied?
- Do Solus's questions about ATR alignment improve stop placement in subsequent trades?

**The autoresearch-mlx insight applied:** The loop still works — just slower. One prompt change per week, one metric (correlation), keep or revert. Over 3 months: 12+ prompt improvements, each validated on real trade data.

---

## The regime-specific autoresearch: the biggest unlock

This is the insight the Mac Mini finding points to: **hardware constraints change the optimal configuration.** For VINCE, market regimes are the "hardware constraint."

What works in bull regime (confirmed trend, low fear, ADX > 20) is different from what works in uncertain regime (low ADX, fear 15-50, mixed signals). The autoresearch loop that runs globally misses this — it averages across regimes and finds configurations that are mediocre in all of them.

The fix: run **Layer 1 (signal weights) separately for each regime window.**

```bash
# Bull regime experiments — optimize for bull-specific sharpe
bun run scripts/replay-signals.ts \
  --weights config/weights-bull.json \
  --cache .elizadb/vince-paper-bot/signal-cache.jsonl \
  --regime bull \
  --holdout 0.2 \
  | grep "replay_sharpe_holdout="

# Uncertain regime experiments — optimize for uncertain-specific sharpe (or max-avoid-loss)
bun run scripts/replay-signals.ts \
  --weights config/weights-uncertain.json \
  --cache .elizadb/vince-paper-bot/signal-cache.jsonl \
  --regime uncertain \
  --holdout 0.2 \
  | grep "replay_sharpe_holdout="
```

**The two separate configs become the regime-adaptive policy:**

```typescript
// At trade evaluation time:
const regime = MarketRegimeService.getCurrentRegime();
const weights = regime === 'bull'
  ? loadJSON('config/weights-bull.json')
  : regime === 'uncertain'
  ? loadJSON('config/weights-uncertain.json')
  : loadJSON('config/weights.json'); // bear/volatile fallback
```

**Why today's losses matter for this:** All 4 of today's losses were in `regime:uncertain`. The global autoresearch would absorb these losses and try to compensate elsewhere. The regime-specific autoresearch looks only at uncertain-regime trades and asks: "What signal weight configuration would have minimized losses in THIS regime?" The answer is almost certainly: MarketRegime at 2.0+, XSentiment at 0.15-0.25, and a `min_confident_sources: 3` gate that today's 2-source signals would have failed.

**AIHF autoresearch found the same principle:** "Disable shorting in bull market" = regime-conditional rule, not global rule. The Mac Mini finding says hardware-conditional rules (regimes) can look completely different from global rules.

**Regime-specific autoresearch output (prediction after 100 uncertain-regime trades):**

| Surface | Global config | Bull config | Uncertain config |
|---|---|---|---|
| MarketRegime weight | 1.0 | 0.8 | 2.0+ |
| XSentiment weight | 0.5 | 0.7 | 0.2 |
| min_sources gate | 2 | 2 | 3 |
| base_risk_fraction | 0.6 | 0.9 | 0.35 |
| stop_atr_multiplier | 1.5 | 1.5 | 2.0 (wider stops) |

These are regime-specific commitments in `results.tsv` — each one validated against real historical data.

---

## The compounding flywheel

This is why "recursive" is the right word. The five layers interact, and their improvements compound.

```
Layer 1 wins (better signal weights)
  → Signal aggregator makes better decisions
  → Better decisions → more wins, clearer losses
  → Feature store accumulates cleaner signal
  → Layer 4 (ONNX) trains on better-labeled data
  → ONNX model improves
  → Thompson Sampling adapts faster (better model → faster weight convergence)
  → Layer 1 baseline improves (the floor is higher for the next run)
  → Loop accelerates
```

```
Layer 3 wins (better risk sizing)
  → Fewer budget breaches (planned vs realized risk converges)
  → Post-mortem quality scores improve (less "stop_too_tight_for_vol")
  → Layer 5 (prompts) gets cleaner feedback signal
  → Post-mortem prompts improve
  → Future Layers 1-3 get better labeled root causes
  → Autoresearch has better signal for what it's trying to minimize
```

```
Regime-specific loops win
  → Regime-adaptive weights prevent regime_conflict losses
  → Better win rate in each regime
  → Feature store has better regime labels
  → Layer 4 ONNX trains with regime as a first-class feature
  → ONNX learns regime-conditional patterns
  → Thompson Sampling adapts weights PER REGIME
  → Fully regime-aware adaptive system
```

**The speed of compounding depends on trade volume.** With 50 trades/month: noticeable improvement in 3 months, meaningful improvement in 6. With 100 trades/month (VINCE at full throughput): noticeable in 6 weeks, meaningful in 3 months.

This is why the day report saying "accuracy 30%, sizing down" is actually the right call — but the autoresearch loop should be running in parallel to find what went wrong. The loop is not just for good times. It's most valuable during drawdowns, because that's when the gap between current configuration and optimal configuration is largest.

---

## What needs to be built

The Forge PRD has the architecture but is missing the enabling infrastructure. In priority order:

### 1. Signal cache writer (blocking for everything else)

Currently the signal aggregator logs what it decides (in WHY THIS TRADE banners) but doesn't persist a structured record of what each source said before aggregation. The signal cache writer hooks into `aggregateSignals()` and writes a `SignalCacheRecord` to `.elizadb/vince-paper-bot/signal-cache.jsonl` on every trade evaluation.

```typescript
// In signalAggregator.service.ts, after aggregation:
if (this.signalCacheEnabled) {
  await this.writeSignalCache({
    tradeId: decision.id,
    timestamp: Date.now(),
    asset,
    sourceOutputs: rawSourceOutputs, // pre-aggregation
    aggregatedDirection: result.direction,
    aggregatedConfidence: result.confidence,
    regime: await this.regimeService.getRegime(),
    btcFearGreed: marketData.fearGreed,
    dvol: await this.deribitService.getDVOL('BTC')
  });
}
// Outcome written when trade closes
```

This is ~100 lines of code. It unlocks all five autoresearch layers.

### 2. Replay function

```bash
# scripts/replay-signals.ts
# Reads signal-cache.jsonl + a weights config
# Re-aggregates with new weights (pure arithmetic, no API calls)
# Outputs: replay_sharpe_holdout=X.XXXX replay_win_rate=X.XX replay_max_dd=X.XX
```

This is ~200 lines of TypeScript. It makes every Layer 1-3 experiment take <500ms.

### 3. Per-surface program.md files

The Forge PRD has one `FORGE_PROGRAM.md` as a charter. The autoresearch-mlx pattern requires one per surface — specific enough that an AI agent can follow it autonomously without hallucinating what to change.

```
autoresearch/
  signal-weights-program.md    # Layer 1 instructions
  thresholds-program.md         # Layer 2 instructions  
  risk-params-program.md        # Layer 3 instructions
  features-program.md           # Layer 4 instructions
  prompts-program.md            # Layer 5 instructions (weekly cadence)
  signal-weights-results.tsv
  thresholds-results.tsv
  risk-params-results.tsv
  features-results.tsv
  prompts-results.tsv
```

### 4. Regime-split evaluation

Extend the replay function with `--regime` flag. Forge nightly task runs separate experiment batches per regime (bull/uncertain/bear) and commits regime-specific configs.

### 5. AIHF committee score as a feature

Once `AIHFEquityService` is built (AIHF.md Surface 3), write `aihfAgreementRate` and `aihfDirection` to the signal cache. Layer 4 (feature selection) then tests whether AIHF agreement rate improves the ONNX model's predictive accuracy. If yes, AIHF becomes a first-class ONNX feature. The signal cache architecture makes this zero-friction to test.

---

## The `program.md` structure for every surface

Every surface in VINCE needs a `program.md` that follows this template. This is the exact thing that makes autoresearch-mlx work — without it, the AI agent drifts, gets confused, or makes compound changes that obscure causality.

```markdown
# [Surface Name] Autoresearch — VINCE

## Your goal
[One sentence: what metric you're maximizing and why]

## The one mutable file
[Path to file]. You may only modify this file. Do not touch any other file.

## The one metric
[Metric name and exact grep pattern from evaluation command]

## How to evaluate
[Exact bash command to run]
[Expected output format]

## What to try
[5-10 specific hypotheses, ordered by likelihood of improvement]
[What to look for in the cache/results.tsv to generate new hypotheses]

## Keep or revert
If [metric] > best in results.tsv:
  git add [mutable file]
  git commit -m "keep: [description] [metric] OLD → NEW"
Otherwise:
  git checkout [mutable file]

## Log
Append to autoresearch/[surface]-results.tsv:
[timestamp]\t[metric value]\t[keep/revert]\t[description]

## Safety rules
- Never change two parameters in one experiment
- Never change safety gates (those are in policies/trading-policy.yaml under [SAFETY] section — Forge auto-reverts any change to these)
- If metric improves but win_rate drops below 30%, revert
- Stop if you see [specific failure mode]
```

---

## Connection to Forge PRD

The Forge PRD defines the architecture (forgeNightly.tasks.ts, forgeExperiment.service.ts, forgeGit.service.ts). This document defines the *surfaces and protocols* that those services operate on. The two documents are complementary:

- **Forge PRD:** How the infrastructure works (services, git integration, Telegram push, SOUL.md context)
- **RECURSIVE.md (this document):** What surfaces Forge runs, what metric each uses, what the AI agent's protocol is

**The specific gap Forge PRD doesn't address (from autoresearch-mlx):**

The PRD says "VincePaperTradingService replay" as the evaluation mechanism. This needs to become "signal cache + deterministic replay function." The service replay requires the paper trading service to be running, which requires the full ElizaOS runtime, which requires time. The signal cache replay is a standalone script — no service, no runtime, ~500ms per experiment.

**Forge nightly cadence with this architecture:**

- 23:00 UTC: Forge nightly task triggers
- 23:00-23:30: Layer 1 (signal weights) — 1000+ experiments on signal cache
- 23:30-00:00: Layer 2 (thresholds) — 1000+ experiments
- 00:00-00:30: Layer 3 (risk params) — 500+ experiments
- 00:30-01:00: Layer 4 (features) — 20-30 experiments (slower, ONNX retraining)
- 01:00-07:00: Regime-specific loops (bull and uncertain windows separately)
- 07:00 UTC: Forge pushes Telegram summary to OpenClaw
- Claude Cowork (laptop) reads summary, proposes next-night mutations in FORGE_PROGRAM.md

Total experiments per night: **3000-5000** on Layers 1-3 alone. This is 100× more than what any manual or LangGraph-orchestrated experiment loop can achieve.

---

## Timing and data requirements

| Layer | Speed | Experiments/night | Data requirement | Status |
|---|---|---|---|---|
| Signal weights | ~100ms | 5000+ | 30+ closed trades | Needs: signal cache |
| Thresholds | ~100ms | 5000+ | 30+ closed trades | Needs: signal cache |
| Risk params | ~200ms | 2500+ | 50+ closed trades | Needs: signal cache |
| Feature selection | ~30s | 20-30 | 90+ closed trades (ONNX) | Needs: signal cache + ONNX |
| Prompt autoresearch | ~5min (LLM) | 5-10/week | 30+ post-mortems | Needs: pm_quality correlation metric |

**Current state:** ~50-100 closed trades in the feature store (enough for Layers 1-3). The primary blocker is the signal cache writer (~100 lines of code).

**Projection with signal cache in place:**
- Week 1: Signal cache accumulates 20 new records. Layer 1 finds first regime_conflict-prevention win.
- Week 4: 80+ records. All three fast layers running nightly. Regime-specific configs committed.
- Month 3: 200+ records. Feature selection (Layer 4) producing meaningful ONNX improvements. Prompt autoresearch has 10+ wins.
- Month 6: 400+ records. The compounding flywheel is clearly visible in paper bot accuracy trends.

---

## The deepest insight

autoresearch-mlx's public baseline shows: val_bpb from 2.667 to 1.807 in 4 experiments. Then overnight runs pushed to 1.294. Then Mac Mini pushed to 1.353 with a *different winner stack*.

The depth of improvement from 2.667 → 1.807 came from obvious wins. The depth from 1.807 → 1.294 came from non-obvious wins that only the loop found. The depth from M4 Max wins → Mac Mini wins shows that different constraints (different "hardware" = different data distributions) produce different optima.

For VINCE, the progression looks like:
- **Obvious wins** (first 200 experiments): regime-gate preventing uncertain-regime longs, MarketRegime weight increase, stop distance widening to ATR-based
- **Non-obvious wins** (experiments 200-1000): specific source weight combinations that predict certain asset classes better, threshold combinations that catch cascade conditions earlier
- **Regime-specific non-obvious wins** (the equivalent of "Mac Mini finds different recipe"): configurations that only work in specific regime windows and would look wrong in global evaluation

These non-obvious, regime-specific wins are the ones that no human would find by manual tuning. They require the loop. And they're the wins that compound most — because they're durable (they reflect actual causal relationships in the data) rather than statistical artifacts.

---

## Related docs

- [docs/AIHF.md](./AIHF.md) — AIHF integration; `aihfAgreementRate` becomes a signal cache feature and ONNX input
- [docs/DEXTER.md](./DEXTER.md) — Dexter integration; Forge reads Dexter regime context as replay context in Phase 2
- [.cursor/plans/forge_prd_6613d167.plan.md](../.cursor/plans/forge_prd_6613d167.plan.md) — Forge PRD; infrastructure this document specifies surfaces for
- [src/plugins/plugin-vince/SIGNAL_SOURCES.md](../src/plugins/plugin-vince/SIGNAL_SOURCES.md) — All signal sources; every source here gets a corresponding field in the signal cache
- [docs/FEATURE-STORE.md](./FEATURE-STORE.md) — Feature store schema; signal cache is complementary (signal cache = pre-aggregation inputs; feature store = post-aggregation ML features)
- autoresearch-mlx: https://github.com/eliza420ai-beep/autoresearch-mlx

---

*The loop is the value. Not the first set of results. The loop.*
