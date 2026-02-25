# Paper Bot & ML Pipeline

The core of VINCE: **signals → trades → learning → repeat.** One deploy, features and models in Supabase, training in prod when ready—no redeploy tax to improve ML.

---

## The loop

```
  signals  ──►  trades  ──►  learning  ──►  (repeat)
```

- **15+ signal sources** — CoinGlass, Binance, MarketRegime, News, X sentiment, Deribit, liquidations, Sanbase, Hyperliquid OI cap / funding extreme
- **50+ features per decision** — stored with **decision drivers** ("WHY THIS TRADE")
- **Python training** — `train_models.py` → four XGBoost models (signal quality, position sizing, TP optimizer, SL optimizer) → ONNX + improvement report
- **ONNX at runtime** — Bot loads ONNX for signal quality and sizing; rule-based fallbacks when models aren’t trained

See [ONNX.md](ONNX.md) for the full pipeline and [FEATURE-STORE.md](FEATURE-STORE.md) for feature storage and Supabase. **Full algo + ML:** [PRD: Paper Trading Algo and How ML Improves It](standup/prds/PRD_PAPER_TRADING_ALGO_AND_ML.md) — decision flow, gates, and improvement loop in one doc.

---

## MandoMinutes · News sentiment

| Capability                                                                                            |
| :---------------------------------------------------------------------------------------------------- |
| Asset-specific sentiment ("Vitalik sells ETH" affects ETH more than BTC)                              |
| Risk-event dampening (block bullish when critical/warning, boost bearish)                             |
| Price-embedded headlines ("BTC: 75.2k (-4%)")                                                         |
| Category weighting, headcount-calibrated confidence                                                   |
| **getVibeCheck()** — 1–2 line vibe (Risk-off / Risk-on / Mixed) at top of dashboard and briefing      |
| Wired into paper bot context and "WHY THIS TRADE"                                                     |
| NASDAQ 24h + macro (HIP-3 primary, Yahoo fallback) — `news_nasdaqChange` top-5 signal-quality feature |
| Real-time thresholds relaxed — more sources contribute more often                                     |
| Improvement weights — NewsSentiment↑, CoinGlass↑, MarketRegime↑                                       |

Logs: `[VINCE] 📡 Signal sources available:` · [SIGNAL_SOURCES.md](../src/plugins/plugin-vince/SIGNAL_SOURCES.md)

---

## Improvements we claim

1. Market data wired: order-book, SMA20, funding 8h delta, DVOL, NASDAQ 24h + macro
2. Book-imbalance filter · SMA20/funding confidence boost · DVOL size cap
3. **getVibeCheck()** → "Headlines: {vibe}" in WHY THIS TRADE
4. Real-time thresholds relaxed
5. **Improvement weights** from training metadata (run-improvement-weights logs holdout_metrics when present)
6. **Retrain pipeline** — train_models.py (Optuna, walk-forward, SHAP, lag features, Platt calibration, feature manifests, ONNX hashing, parallel training), run-improvement-weights.ts, FEATURE_TO_SOURCE

We do **not** yet claim improved P&L or win rate—that requires backtest or live results.

---

## WHY THIS TRADE banner

Supporting vs Conflicting factors · "N of M sources agreed (K disagreed)" · ML Quality % · Open window boost · up to 20 factors. News sentiment under Conflicting when going SHORT.

---

## Resilience

- **Binance 451** — After 3 consecutive 451s, aggregator skips Binance; recovery on 2xx. Use `VINCE_BINANCE_BASE_URL` for proxy.
- **Fetch timeouts** — 12s; one slow source does not block aggregation.

---

## Train_models.py and ONNX

Recent pipeline improvements (see [ONNX.md](ONNX.md) and [plugin-vince/scripts/README.md](../src/plugins/plugin-vince/scripts/README.md)):

- **Optuna** hyperparameter tuning (all 4 models); GridSearchCV fallback
- **Walk-forward validation** — expanding-window CV with purge gap; forward-in-time fold ordering
- **SHAP** explainability — TreeExplainer for all 4 models; mean |SHAP| and top interactions in improvement report
- **Lag features** — lag1/2/3 + rolling mean for key market columns per asset
- **Platt calibration** — signal-quality probability calibration; saved to metadata for inference
- **Feature manifests** — `{model}_features.json` alongside each ONNX; maps f0/f1/… to column names
- **ONNX SHA-256 hash** — in `training_metadata.json` for versioning
- **Parallel training** — `--parallel` flag; ProcessPoolExecutor for concurrent model training
- **Retrain on performance** — besides 90+ trades / 24h cooldown, retrain when recent win rate &lt; 45%
- **Pre-flight health check** — Before training: logs trade count (need 90+) and worst empty important columns; exits with clear message if insufficient.
- **Auto-keep-last-good-model** — Before saving new .onnx, compares holdout metrics with the previous model; if new is worse, keeps old model and does not overwrite.
- **Single-model training** — `--model signal_quality|position_sizing|tp_optimizer|sl_optimizer` (or `all`) to train only one model and save time.
- **Improvement report → Sentinel tasks** — Report creates task briefs in `docs/standup/openclaw-queue/` (e.g. tighten TP rules, add feature to store); footer shows “Created N new tasks” or “No action needed.”
- **Default sample weights** — `--recency-decay 0.01` and `--balance-assets` on by default; `--bench-only` trains only on high VinceBench-score rows.

No train/serve skew (StandardScaler removed); no holdout leakage; sample weights (`--recency-decay`, `--balance-assets`).

---

## Plugin-vince at a glance

27 services · 20 actions · 2 providers · 1 evaluator — 18 data-source services, 7 fallbacks, 4 ML services (feature store, weight bandit, signal similarity, ONNX inference).

Implementation: [src/plugins/plugin-vince/](../src/plugins/plugin-vince/)
