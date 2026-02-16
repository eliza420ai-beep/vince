# Proof: 24/7 Research, Knowledge, and ONNX Self-Improvement

**Thesis:** 24/7 research, extending knowledge, and ONNX self-improvement are worth it because together they deliver: (a) continuous signal coverage and training data, (b) methodology-backed answers instead of raw numbers, and (c) provable parameter improvement from data. This doc states where proof already exists (ONNX) and what evidence means for the other two pillars.

**Contents:** [Pillar 1 — ONNX](#pillar-1--onnx-self-improvement) · [Pillar 2 — 24/7 research](#pillar-2--247-research) · [Pillar 3 — Extending knowledge](#pillar-3--extending-knowledge) · [Evidence checklist](#evidence-checklist) · [One-command proof (ONNX)](#one-command-proof-onnx)

---

## Pillar 1 — ONNX self-improvement

**What we do:** Feature store (40+ features per trade) → `train_models.py` → ONNX models + `suggested_tuning` in `training_metadata.json`; online Parameter Tuner (Bayesian) and Weight Bandit (Thompson Sampling) adjust thresholds and source weights from outcomes. See [ML_IMPROVEMENT_PROOF.md](../src/plugins/plugin-vince/ML_IMPROVEMENT_PROOF.md) for the full causal chain.

**What "worth it" means:** Better selectivity (fewer bad trades, higher win rate) and adaptive TP/SL/position sizing so the paper bot improves as more data arrives.

**Proof:** We can show that ML-derived thresholds improve selectivity on historical data. Run the validation script on your feature store; if the filtered win rate (using `suggested_tuning`) is higher than the baseline win rate (all trades), that demonstrates that the logic can adjust parameters to improve the algo. Holdout metrics from training and tuner/bandit state files show that parameters actually change over time. Live improvement still depends on data quality and regime.

**One-command:** See [One-command proof (ONNX)](#one-command-proof-onnx) below.

---

## Pillar 2 — 24/7 research

**What we do:** Scheduled tasks (daily report, news briefing, [GROK_EXPERT_DAILY_PULSE](../src/plugins/plugin-vince/src/tasks/grokExpert.tasks.ts)), multi-source signal aggregation (CoinGlass, Binance, Deribit, Hyperliquid, etc.), and feature-store ingestion so the paper bot has continuous context and ONNX has data to train on. See [SIGNAL_SOURCES.md](../src/plugins/plugin-vince/SIGNAL_SOURCES.md) and [FEATURE-STORE.md](FEATURE-STORE.md).

**What "worth it" means:** Without 24/7 we wouldn't have diverse signals or enough closed trades to train. With it, the paper bot gets continuous context and the ML loop gets data; signal diversity and feature-store growth are necessary for the ONNX proof above.

**Proof:**

1. **Necessity:** 24/7 tasks and the signal aggregator are the source of signal diversity and feature-store growth. No scheduled ingestion → no multi-source signals → no feature store → no ONNX training. So 24/7 research is a prerequisite for the provable ONNX improvement in Pillar 1.
2. **Optional evidence:** To strengthen the case later, you could track (a) trades per week vs number of active signal sources, or (b) win rate over time after enabling a new task (e.g. Grok Expert). The doc structure is in place; add metrics or a dashboard when you want.

---

## Pillar 3 — Extending knowledge

**What we do:** [trenchKnowledgeProvider](../src/plugins/plugin-vince/src/providers/trenchKnowledge.provider.ts) (RAG), `knowledge/` dirs, and VINCE_UPLOAD; frameworks and methodologies are injected into context every turn so the LLM can cite them.

**What "worth it" means:** Answers cite methodology (e.g. "funding + L/S ratio suggests caution") instead of generic numbers; the paper bot's "why" and narrative improve. Knowledge = "how," APIs = "what."

**Proof:**

1. **Qualitative:** Without knowledge, VINCE would only echo numbers. With it, VINCE interprets live data through proven lenses (see [plugin-vince README](../src/plugins/plugin-vince/README.md) and [CLAUDE.md](../CLAUDE.md)). Same number, added reasoning for OPTIONS, PERPS, MEMES, LIFESTYLE.
2. **Optional:** Spot-check a few answers (e.g. OPTIONS or PERPS) and confirm they reference methodology. For a future quantitative angle, you could log which knowledge chunks were retrieved per action and compare answer quality with/without.

---

## Evidence checklist

To show it's worth it:

1. **ONNX:** Run `validate_ml_improvement.py` (see below). If filtered win rate > baseline, ML-derived thresholds improve selectivity on that data.
2. **24/7 research:** Confirm scheduled tasks are running (daily report, news, Grok Expert if configured) and the feature store is growing (e.g. `wc -l .elizadb/vince-paper-bot/features/*.jsonl` or Supabase row count).
3. **Knowledge:** Confirm knowledge dirs are used (trenchKnowledge provider is registered) and spot-check a few answers for methodology-backed reasoning.

---

## One-command proof (ONNX)

From repo root, with a feature store at the default path:

```bash
python3 src/plugins/plugin-vince/scripts/validate_ml_improvement.py --data .elizadb/vince-paper-bot/features
```

**How to interpret:**

- The script loads all trades with outcomes, computes a **baseline** win rate (all trades) and a **suggested_tuning** bar (25th percentile of profitable trades' strength/confidence, same as `train_models.py`).
- It then reports: with only trades that pass those thresholds, win rate W1 vs baseline W0.
- **If W1 > W0** and we skipped mostly losers, that is evidence that ML-derived thresholds improve selectivity. The script may also print holdout_metrics from the last training run if `training_metadata.json` is present.
- If you have no feature store yet or fewer than a handful of complete trades, the script will report accordingly (e.g. "No data" or small N); run again after more paper trades.

For full detail (essential parameters, causal chain, unit tests), see [ML_IMPROVEMENT_PROOF.md](../src/plugins/plugin-vince/ML_IMPROVEMENT_PROOF.md).

---

## See also

- [ML_IMPROVEMENT_PROOF.md](../src/plugins/plugin-vince/ML_IMPROVEMENT_PROOF.md) — How to prove ML improves the algo (validate_ml_improvement, tests)
- [FEATURE-STORE.md](FEATURE-STORE.md) — Feature storage, training data, Supabase
- [SIGNAL_SOURCES.md](../src/plugins/plugin-vince/SIGNAL_SOURCES.md) — Signal sources and aggregator
- [README.md](../README.md) — Project overview
