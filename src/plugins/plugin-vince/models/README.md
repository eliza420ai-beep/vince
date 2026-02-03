# ML models for Eliza Cloud deploy

**Purpose:** This folder is copied into the container at Docker build time so the ML Inference Service can load ONNX models on Eliza Cloud. If this folder contains the four `.onnx` files (and optionally `training_metadata.json`), ML will be **active** in production.

## Files to add (do not commit secrets)

After training **locally** (90+ trades or synthetic data), copy the outputs here and commit:

| File | Description |
|------|-------------|
| `signal_quality.onnx` | Signal quality predictor |
| `position_sizing.onnx` | Position size multiplier model |
| `tp_optimizer.onnx` | Take-profit optimizer |
| `sl_optimizer.onnx` | Stop-loss optimizer |
| `training_metadata.json` | Optional: threshold, TP level performance, suggested_tuning |

**One-time copy from local training output:**

```bash
# From repo root, after running train_models.py
cp .elizadb/vince-paper-bot/models/signal_quality.onnx    src/plugins/plugin-vince/models/
cp .elizadb/vince-paper-bot/models/position_sizing.onnx   src/plugins/plugin-vince/models/
cp .elizadb/vince-paper-bot/models/tp_optimizer.onnx       src/plugins/plugin-vince/models/
cp .elizadb/vince-paper-bot/models/sl_optimizer.onnx       src/plugins/plugin-vince/models/
cp .elizadb/vince-paper-bot/models/training_metadata.json src/plugins/plugin-vince/models/
git add src/plugins/plugin-vince/models/*.onnx src/plugins/plugin-vince/models/training_metadata.json
git commit -m "chore: ship ONNX models for Cloud ML"
```

Then deploy (e.g. `elizaos deploy --project-name vince2 ...`). The Dockerfile copies this folder into `.elizadb/vince-paper-bot/models/` in the image so the app finds the models at runtime.

**If you leave this folder empty (or only this README):** Cloud deploy still works; the bot uses rule-based fallbacks and loads 0 ONNX models until you add the files above.
