# ML Pipeline Assessment (2026-02-16)

Honest evaluation of the training pipeline's strengths, limitations, and what will actually move PnL.

## What's Genuinely Good

- **Closed-loop architecture.** Paper trade → feature store → train → ONNX → inference → better trades → repeat. Most crypto bots never close this loop; they're static rule engines forever. VINCE retrains on its own outcomes and feeds improvements back into live decisions. That's the hard part, and it's built.
- **Signal quality model is highest-leverage.** Filtering out low-quality signals before opening trades is where most PnL is won or lost. Platt calibration + suggested threshold flowing back into the aggregator is a clean feedback loop.
- **Improvement report with decision drivers.** The "why did we open this losing trade?" section is genuinely useful for a human reviewing the bot. Most systems lose the "why" at trade time — recording `decisionDrivers` in the feature store means the model can learn which *reasoning patterns* lead to losses.
- **Code quality.** DRY feature prep, proper holdout evaluation (no leakage), walk-forward with purge gap, SHAP explainability, feature manifests, ONNX hashing — the engineering is solid.

## What I'm Skeptical About

### 90 trades is thin

XGBoost with 20+ features on 90 samples will overfit. Walk-forward validation will show high variance across folds. The models get meaningfully better around **300–500 trades**. Until then, the **suggested thresholds** (25th percentile of profitable trades' strength/confidence) are probably more valuable than the ONNX models themselves.

**Recommendation:** Don't trust model predictions too heavily until you have 300+ real trades. Use the models as soft signals alongside rule-based logic (which the inference service already does with fallback thresholds).

### Position sizing and TP/SL models are weakest

Predicting optimal position size from pre-trade features is *really hard* — it's basically predicting magnitude of returns, which is noisier than direction. These models will likely converge to "just use 1x" for a long time.

The SL quantile regression (95th percentile of adverse excursion) is more defensible — it's answering "how bad could this get?" which is more learnable from market conditions.

**Recommendation:** Weight signal quality model outputs heavily; treat position sizing and TP model outputs as suggestions, not directives, until you see consistent holdout metrics improving across retraining runs.

### Synthetic data is a trap

The generator produces records that are structurally correct but have no real market dynamics. Models trained on synthetic data will pass all smoke tests but learn nothing useful. The README is clear about this — but deploying synthetic-trained models risks false confidence.

**Recommendation:** Use synthetic data *only* for pipeline testing. Never deploy synthetic-trained ONNX models to production. The `--real-only` flag exists for this reason.

## Biggest Missing Piece: Backtest Harness

You can train great models and still lose money if the end-to-end system (model → decision → execution → slippage → fees) doesn't compound. A backtest harness that replays historical trades with the new models and reports **Sharpe ratio, max drawdown, and net PnL** would tell you whether retrained models *actually* improve returns — not just ML metrics.

**Suggested implementation:**
1. Load holdout trades from JSONL (last 20% by time)
2. Run model predictions on holdout features
3. Simulate: would we have taken this trade? At what size? With what TP/SL?
4. Compute: net PnL (after fees), Sharpe, max drawdown, win rate
5. Compare against baseline (no ML, rule-based only)
6. Write `backtest_report.json` alongside improvement report

This is listed in the backlog (FEEDBACK.md) but should be prioritized once real trade volume reaches 200+.

## Bottom Line

The pipeline **will** make the bot better over time — but mostly after 200+ real trades, and mostly through the signal quality model and threshold suggestions. The infrastructure is solid and ready to scale. The gap isn't code quality (that's high), it's **data quantity**.

**Best thing to do now:** Let the bot trade and accumulate real outcomes. Retrain periodically. Watch the improvement report's holdout metrics across runs — when they stabilize and trend positively, the models are earning their keep.
