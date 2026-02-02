# Plugin-Vince Scripts

Python scripts for offline ML training used by the VINCE paper-trading ML pipeline (Layer 3: ONNX inference).

## Scripts

| Script | Purpose |
|--------|--------|
| `train_models.py` | Trains XGBoost models (signal quality, position sizing, TP optimizer) on feature-store data and exports to ONNX for `VinceMLInferenceService`. |

**Input:** Feature store JSONL files under `.elizadb/vince-paper-bot/features/*.jsonl`  
**Output:** ONNX models + metadata JSON (paths/config used by the inference service).

## Training script TODO

Use this checklist to track improvements. Full rationale and detail are in [FEEDBACK.md](./FEEDBACK.md).

### Short-term (unblock production)

- [ ] **Load JSONL** – Feature store writes JSONL; script may assume single JSON. Use line-by-line read (e.g. `pd.read_json(..., lines=True)` or loop with `json.loads`) so training runs on real data.
- [ ] **SL Optimizer** – Either implement (quantile regression → ONNX, see FEEDBACK.md) or remove from docstring and CLAUDE.md “Layer 3” table so code and docs match.
- [ ] **Robust input** – Use safe access for nested keys (e.g. `r.get('market', {})`) so missing/malformed records don’t cause KeyErrors.
- [ ] **requirements.txt** – Add pinned deps (`xgboost`, `skl2onnx`, `onnxruntime`, `pandas`, etc.) for reproducible runs.
- [ ] **Logging** – Prefer `logging` over `print` for production runs.

### Medium-term (v2)

- [ ] Early stopping in XGBoost (`early_stopping_rounds` + `eval_set`).
- [ ] Optional hyperparameter tuning (e.g. GridSearchCV/Optuna) with `TimeSeriesSplit`.
- [ ] Validate ONNX after export (e.g. run a small batch with `onnxruntime`).
- [ ] Unit tests for load/prep (e.g. pytest with mocked JSONL).
- [ ] Optional: asset dummies or per-asset models if multi-asset; SHAP/feature selection.

## Running

From repo root (or plugin root), with a venv that has the training deps:

```bash
# Example: run on all feature files (implement glob if needed)
python src/plugins/plugin-vince/scripts/train_models.py
```

Ensure feature store has enough samples (script skips training if &lt; 100).

## Reference

- [FEEDBACK.md](./FEEDBACK.md) – Full review of `train_models.py` (strengths, issues, suggestions).
- Plugin [CLAUDE.md](../CLAUDE.md) – V4 ML architecture, feature store paths, ONNX usage.
