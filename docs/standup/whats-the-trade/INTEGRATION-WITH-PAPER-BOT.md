# What's the Trade ↔ Paper Bot & train_models.py

**Short answer:** Yes. WTT logic and standup outputs can improve the paper trading bot and `train_models.py` in several concrete ways. Some need new feature-store fields and pipeline wiring; others are proxy features or rubric-driven analysis you can add incrementally.

---

## 1. Where the two systems meet

| System | What it does | Data shape |
|--------|--------------|------------|
| **WTT (standup / skill)** | Turns qualitative narratives → one primary expression + alt, with rubric (alignment, edge, payoff, timing), invalidate conditions, conviction breakeven. | Unstructured output in standup markdown; skill can produce structured JSON. |
| **Paper bot** | Aggregates signals (funding, OI, whale, news, regime) → open/close paper positions → writes **feature records** (market, session, signal, regime, news, execution, outcome, labels). | `FeatureRecord` in feature store → JSONL / `plugin_vince.paper_bot_features` / Supabase. |
| **train_models.py** | Trains on feature records: Signal Quality (profitable?), Position Sizing (rMultiple), TP Optimizer (optimalTpLevel), SL Optimizer (MAE). Uses optional columns when present. | Reads flat feature columns + labels; exports ONNX + improvement report. |

WTT does not currently write into the feature store. The link is: **when a trade is taken**, we could tag it with WTT metadata (if it came from a WTT recommendation), and **optionally** add WTT rubric dimensions as features so `train_models.py` can use them.

---

## 2. Concrete ways to use WTT logic

### A. Add WTT-sourced fields to the feature store (when WTT drives a trade)

If you ever route WTT output into a paper trade (e.g. “today’s WTT pick” or “trade the primary expression”), the feature record should carry WTT context so training can see it:

- **`wtt_primary`** (boolean): this trade was the WTT primary expression.
- **`wtt_alignment`**: Direct | Pure-play | Exposed | Partial | Tangential (or ordinal 1–5).
- **`wtt_edge`**: Undiscovered | Emerging | Consensus | Crowded (or ordinal 1–4).
- **`wtt_payoff_shape`**: Max asymmetry | High | Moderate | Linear | Capped (or ordinal).
- **`wtt_timing_forgiveness`**: Very forgiving → Very punishing (or ordinal).
- **`wtt_invalidate_condition`** (string): e.g. `"BTC < 65k"` for later checks.

**train_models.py:** Add these to `OPTIONAL_FEATURE_COLUMNS` (or ordinal variants). Use them in Signal Quality and Position Sizing when present. In the improvement report, add a slice: “WTT-sourced trades: which rubric dimension correlated most with profitable / higher rMultiple?”

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

### D. Invalidate conditions → outcome labels

WTT’s “invalidate condition” (e.g. “lose above $180”, “dies if BTC &lt; $65k”) could be turned into a label after close:

- Store `wtt_invalidate_condition` at open (when WTT-sourced).
- At close, compute **`invalidate_condition_hit`** (boolean): did price/level cross the condition?
- Use as an extra label: “we had a clear invalidate and it was hit” → good exit or missed exit; “we didn’t have one” vs “we had one and it wasn’t hit” → different learning signals. train_models could use this as an auxiliary target or filter (e.g. analyze profitable rate when invalidate was hit vs not).

### E. Improvement report and CANDIDATE_SIGNAL_FACTORS

- **CANDIDATE_SIGNAL_FACTORS** (train_models.py): Add entries for WTT-derived fields when you add them, e.g. “WTT alignment (when WTT-sourced)”, “WTT edge (when WTT-sourced)”, “Invalidate condition hit”.
- **Improvement report:** Add a subsection when `wtt_primary` (or similar) is present: rubric dimension vs profitability, and suggest “prefer WTT picks with Undiscovered/Emerging edge” or “avoid when timing is Very punishing” if the data supports it.

### F. Avoided decisions and “should we trade?”

WTT stress-test (“what would make this lose even if thesis is right?”) is a pre-commit check. The paper bot already has “avoided” records (e.g. similarity AVOID, ML quality below threshold). You could:

- Add an **avoid reason** like `wtt_stress_test_fail` when a future WTT–bot integration runs the stress-test and decides not to trade.
- Use avoided records later for an “should we trade?” classifier (as in FEATURE-STORE.md). WTT gates would then be one more input to that classifier.

---

## 3. Suggested order of implementation

1. **No WTT pipeline yet**  
   - Add liquidity/edge-like proxies to the feature store and `OPTIONAL_FEATURE_COLUMNS` / `CANDIDATE_SIGNAL_FACTORS` (e.g. bid-ask spread, book imbalance, IV percentile if available).  
   - Run train_models and improvement report; see if these help Signal Quality or sizing.

2. **WTT as daily idea, not yet executed by bot**  
   - Persist WTT standup output in a structured form (e.g. JSON: primary, alt, rubric, invalidate).  
   - When you later add “trade WTT primary” or “trade WTT alt,” pass that context into the feature store (wtt_primary, wtt_alignment, wtt_edge, etc.) and add optional columns in train_models + improvement report.

3. **Full loop**  
   - Paper trade WTT recommendations when they exist; store invalidate condition; compute `invalidate_condition_hit` on close; use WTT dimensions and invalidate hit in training and report.

---

## 4. Summary

| WTT concept | Use in paper bot / train_models |
|-------------|----------------------------------|
| Rubric (alignment, edge, payoff, timing) | Store when trade is WTT-sourced; add as optional features; slice improvement report by rubric. |
| Hard gates (liquidity, time, contradiction) | Session already used; add liquidity features; add thesis/signal direction when WTT in loop. |
| Invalidate condition | Store at open; compute hit at close; use as label or filter. |
| Stress-test / “no trade” | New avoid reason; feed into future “should we trade?” model. |
| Single best expression + alt | Tag primary vs alt in feature store; compare profitability. |

So: **yes, the logic and insights from docs/standup/whats-the-trade can and should be used to improve the paper bot and train_models.py.** Start with proxy features and liquidity; then add WTT-specific fields and labels once WTT output is structured and (optionally) connected to paper execution.
