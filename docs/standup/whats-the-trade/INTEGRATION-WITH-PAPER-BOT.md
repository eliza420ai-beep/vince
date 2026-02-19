# What's the Trade ↔ Paper Bot & train_models.py

**Short answer:** Yes. WTT logic and standup outputs improve the paper trading bot and `train_models.py`. The full loop is **implemented**: WTT daily task writes a structured JSON sidecar; the paper bot can trade today’s pick (gated by `VINCE_PAPER_WTT_ENABLED`); the feature store records WTT rubric fields and `invalidateHit` on close; `train_models.py` uses WTT optional columns and reports a `wtt_performance` slice.

---

## What is implemented (shipped)

| Component           | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WTT daily task**  | After the markdown report, the task runs LLM extraction to produce a typed **WttPick** (thesis, primaryTicker, primaryDirection, primaryInstrument, rubric, invalidateCondition, killConditions, alt\*, evThresholdPct). Saved as `docs/standup/whats-the-trade/YYYY-MM-DD-whats-the-trade.json` alongside the `.md`.                                                                                                                                                                                                           |
| **Feature store**   | Optional **`wtt`** block on `FeatureRecord`: primary, ticker, thesis, alignment/edge/payoffShape/timingForgiveness (ordinals), invalidateCondition, invalidateHit, evThresholdPct. `recordDecision({ asset, signal, wtt })` accepts `wtt`. In **`recordOutcome()`**, when a record has `wtt.invalidateCondition`, the store computes **`invalidateHit`** (e.g. "BTC < 65k" vs exit price) and persists it.                                                                                                                      |
| **Paper bot**       | **`evaluateWttPick()`** runs at the start of `evaluateAndTrade()` when WTT is enabled. It reads today’s WTT JSON, maps ticker via **`normalizeWttTicker()`** (targetAssets), skips if already positioned or ineligible, builds an **AggregatedTradeSignal** from **`wttRubricToSignal(pick.rubric)`**, opens a paper trade, and calls **`recordMLFeatures(..., wttBlock)`** so the feature store gets the `wtt` block. Gated by **`VINCE_PAPER_WTT_ENABLED`** (env) or **`vince_paper_wtt_enabled`** (character). Default: off. |
| **train_models.py** | **`load_features()`** flattens **`wtt_*`** (wtt_primary, wtt_alignment, wtt_edge, wtt_payoffShape, wtt_timingForgiveness, wtt_invalidateHit). These are in **`OPTIONAL_FEATURE_COLUMNS`**. **`CANDIDATE_SIGNAL_FACTORS`** includes "WTT alignment" and "WTT edge". **`build_improvement_report()`** adds a **`wtt_performance`** slice when there are ≥5 WTT trades: wtt_win_rate, non_wtt_win_rate, delta, and correlations of each rubric dimension with `label_profitable`.                                                  |
| **Config / env**    | **paperTradingDefaults.ts**: `isWttEnabled()`, `wttRubricToSignal()`, `wttPickToWttBlock()`, WTT strength/confidence defaults. **.env.example**: `# VINCE_PAPER_WTT_ENABLED=true`. **Vince character**: `vince_paper_wtt_enabled` can be set from env.                                                                                                                                                                                                                                                                          |

---

## 1. Where the two systems meet

| System                    | What it does                                                                                                                                                                         | Data shape                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **WTT (standup / skill)** | Turns qualitative narratives → one primary expression + alt, with rubric (alignment, edge, payoff, timing), invalidate conditions, conviction breakeven.                             | Unstructured output in standup markdown; skill can produce structured JSON.              |
| **Paper bot**             | Aggregates signals (funding, OI, whale, news, regime) → open/close paper positions → writes **feature records** (market, session, signal, regime, news, execution, outcome, labels). | `FeatureRecord` in feature store → JSONL / `plugin_vince.paper_bot_features` / Supabase. |
| **train_models.py**       | Trains on feature records: Signal Quality (profitable?), Position Sizing (rMultiple), TP Optimizer (optimalTpLevel), SL Optimizer (MAE). Uses optional columns when present.         | Reads flat feature columns + labels; exports ONNX + improvement report.                  |

WTT does not currently write into the feature store. The link is: **when a trade is taken**, we could tag it with WTT metadata (if it came from a WTT recommendation), and **optionally** add WTT rubric dimensions as features so `train_models.py` can use them.

---

## 2. Concrete ways to use WTT logic

### A. Add WTT-sourced fields to the feature store (when WTT drives a trade) — **implemented**

When the paper bot opens a trade from today's WTT pick (e.g. “today’s WTT pick” or “trade the primary expression”), the feature record carries WTT context so training can see it:

- **`wtt_primary`** (boolean): this trade was the WTT primary expression.
- **`wtt_alignment`**: Direct | Pure-play | Exposed | Partial | Tangential (or ordinal 1–5).
- **`wtt_edge`**: Undiscovered | Emerging | Consensus | Crowded (or ordinal 1–4).
- **`wtt_payoff_shape`**: Max asymmetry | High | Moderate | Linear | Capped (or ordinal).
- **`wtt_timing_forgiveness`**: Very forgiving → Very punishing (or ordinal).
- **`wtt_invalidate_condition`** (string): e.g. `"BTC < 65k"` for later checks.

**train_models.py:** Implemented: these are in `OPTIONAL_FEATURE_COLUMNS` as `wtt_primary`, `wtt_alignment`, `wtt_edge`, `wtt_payoffShape`, `wtt_timingForgiveness`, `wtt_invalidateHit`. The improvement report includes a `wtt_performance` slice (win rate vs non-WTT, plus rubric-dimension correlations with profitability) when ≥5 WTT trades exist.

### B. Proxy “edge” and “alignment” from existing data (no WTT pipeline yet)

You don’t need WTT in the loop to approximate two rubric ideas:

- **Edge proxy:** “How crowded is this expression?”
  - Already in use: `signal_hasFundingExtreme`, `signal_hasOICap` (contrarian / less crowded).
  - Could add: IV percentile (elevated → more consensus/crowded), or sentiment vs price divergence. Add to `CANDIDATE_SIGNAL_FACTORS` and to the feature store when you have the data.
- **Alignment proxy:** For perps we don’t have “Direct/Pure-play,” but you could add a **narrative tag** when a trade is explicitly tied to a thesis (e.g. from ALOHA or a future “trade WTT” flow): e.g. `narrative_source: "wtt_primary" | "wtt_alt" | "aggregator_only"`. Then train_models can compare profitability of narrative-driven vs pure-signal trades.

### C. Hard gates → bot rules and features

WTT hard gates (thesis contradiction, liquidity, time mismatch) map to bot/feature ideas:

- **Time mismatch:** We already have session filters (Asia/EU/US, weekend). Could add a feature `session_ok_for_asset` or use session in training more explicitly (already in session features).
- **Liquidity:** Not in the feature store today. Adding spread or depth (e.g. `market_bidAskSpread`, order-book imbalance) would help both live risk and ML. `train_models.py` already has `CANDIDATE_SIGNAL_FACTORS` for `market_bidAskSpread` / `market_bookImbalance` — populating these when available would let the model learn liquidity vs outcome.
- **Thesis contradiction:** Only relevant when we have a stated thesis (e.g. WTT output). Then we could store “thesis direction” and “signal direction” and flag contradiction as a feature or a pre-trade gate.

### D. Invalidate conditions → outcome labels — **implemented**

WTT’s “invalidate condition” (e.g. “lose above $180”, “dies if BTC &lt; $65k”) could be turned into a label after close:

- The feature store stores `wtt.invalidateCondition` at open (when WTT-sourced).
- At close, **`recordOutcome()`** computes **`wtt.invalidateHit`** (boolean) by parsing the condition (e.g. "TICKER &lt; X", "TICKER &gt; X") and comparing to exit price.
- train_models flattens `wtt_invalidateHit` and uses it in the optional feature set; the improvement report's WTT slice can be used to analyze profitable rate when invalidate was hit vs not.

### E. Improvement report and CANDIDATE_SIGNAL_FACTORS — **implemented**

- **CANDIDATE_SIGNAL_FACTORS** (train_models.py): Includes "WTT alignment" (hint: `wtt_alignment`) and "WTT edge" (hint: `wtt_edge`).
- **Improvement report:** When `wtt_primary` is present and there are ≥5 WTT trades, the report has a **`wtt_performance`** subsection: wtt_win_rate, non_wtt_win_rate, delta, and correlations of `wtt_alignment`, `wtt_edge`, `wtt_payoffShape`, `wtt_timingForgiveness` with `label_profitable`.

### F. Avoided decisions and “should we trade?”

WTT stress-test (“what would make this lose even if thesis is right?”) is a pre-commit check. The paper bot already has “avoided” records (e.g. similarity AVOID, ML quality below threshold). You could:

- Add an **avoid reason** like `wtt_stress_test_fail` when a future WTT–bot integration runs the stress-test and decides not to trade.
- Use avoided records later for an “should we trade?” classifier (as in FEATURE-STORE.md). WTT gates would then be one more input to that classifier.

---

## 3. Implementation status

1. **No WTT pipeline yet**
   - Add liquidity/edge-like proxies to the feature store and `OPTIONAL_FEATURE_COLUMNS` / `CANDIDATE_SIGNAL_FACTORS` (e.g. bid-ask spread, book imbalance, IV percentile if available).
   - Run train_models and improvement report; see if these help Signal Quality or sizing.

2. **WTT as daily idea, not yet executed by bot** — **done**
   - WTT standup output is persisted as structured JSON (`docs/standup/whats-the-trade/YYYY-MM-DD-whats-the-trade.json`) with primary, alt, rubric, invalidate, etc.

3. **Full loop** — **done**
   - Paper bot trades today's WTT pick when `VINCE_PAPER_WTT_ENABLED=true` (or `vince_paper_wtt_enabled` in character). Feature store records the `wtt` block and computes `invalidateHit` on close. train_models uses WTT optional columns and the improvement report includes the `wtt_performance` slice.

---

## 4. Summary

| WTT concept                                 | Use in paper bot / train_models                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Rubric (alignment, edge, payoff, timing)    | Store when trade is WTT-sourced; add as optional features; slice improvement report by rubric. |
| Hard gates (liquidity, time, contradiction) | Session already used; add liquidity features; add thesis/signal direction when WTT in loop.    |
| Invalidate condition                        | Store at open; compute hit at close; use as label or filter.                                   |
| Stress-test / “no trade”                    | New avoid reason; feed into future “should we trade?” model.                                   |
| Single best expression + alt                | Tag primary vs alt in feature store; compare profitability.                                    |

So: **yes, the logic and insights from docs/standup/whats-the-trade can and should be used to improve the paper bot and train_models.py.** Start with proxy features and liquidity; then add WTT-specific fields and labels once WTT output is structured and (optionally) connected to paper execution.
