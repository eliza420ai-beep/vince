# Proving Solus Calibration and ML Improve Strike Advice

**Goal:** Show that Solus’s calibration loop and optional ML calibrator improve assignment-probability accuracy and strike advice. The loop is **recursive** and runs **on autopilot**: record → resolve → Brier + notes → inject into prompt; when 50+ resolved, TRAIN_SOLUS_CALIBRATION_WHEN_READY produces ONNX and reloads so the next strike call uses ML-calibrated P(assign) or at least calibrated context.

---

## 0. Recursive loop and autopilot

Solus’s improvement cycle is **recursive**—it feeds on its own outcomes:

1. **Record:** Optimal-strike (and optionally manual “record assignment prediction”) stores a prediction (asset, strike, P(assign)) in `.elizadb/solus/solus-assignment-predictions.jsonl`.
2. **Resolve:** At expiry, the user (or Friday reminder) resolves “we got assigned” / “we didn’t get assigned”; the store updates outcome 0/1.
3. **Brier + notes:** Mean Brier over resolved rows (last 30d) and last 10 outcomes are in **SOLUS_CALIBRATION_CONTEXT**; the daily task writes Brier-by-asset/IV to `solus-calibration-notes.txt`, which is also injected. Solus sees his own track record in every optimal-strike, strike-ritual, and position-assess prompt.
4. **TRAIN_SOLUS_CALIBRATION_WHEN_READY** (every 12h, max once per 24h when 50+ resolved): runs `train_solus_calibration.py` → `assignment_calibrator.onnx` + `solus_training_metadata.json`; then `SolusMlInferenceService.reloadModels()` so new ONNX is used without restart.
5. **Next strike call:** SOLUS_OPTIONS_CONTEXT uses ML-calibrated P(assign) for best CC/CSP when the model is loaded; otherwise GBM. Calibration context (Brier, notes) is always in the prompt so the model can temper confidence or note bias.

So the loop **runs on autopilot**: no manual “retrain and redeploy” once the agent is live and predictions are resolved.

**Proof that the loop improves Solus** (see §3): Brier and resolved count from the store; optional validation script on the JSONL; existing unit and integration tests for assignment store, calibration context, and strategy prompt richness.

---

## 1. What we measure

| Metric             | Source                                                                                                              | Where used                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Brier score**    | Mean of (predictedAssignProb − outcome)² over resolved rows (e.g. last 30d)                                         | SOLUS_CALIBRATION_CONTEXT; “assignment calibration” action        |
| **Resolved count** | Rows in `solus-assignment-predictions.jsonl` with resolvedAt and outcome ∈ {0,1}                                    | TRAIN_SOLUS_CALIBRATION_WHEN_READY gate (≥50); calibration report |
| **ML vs GBM**      | When `assignment_calibrator.onnx` is present, SOLUS_OPTIONS_CONTEXT shows “ML-calibrated P(assign)” for best CC/CSP | Strike advice; otherwise GBM-only                                 |

---

## 2. Causal chain (Data → Training → Application)

```
solus-assignment-predictions.jsonl (resolved rows)
  • asset, strike, predictedAssignProb, outcome, spotAtRecord, atmIvAtRecord
        →  train_solus_calibration.py (min 50 resolved)
        →  assignment_calibrator.onnx + solus_training_metadata.json
        →  SolusMlInferenceService.reloadModels()
        ↓
SOLUS_OPTIONS_CONTEXT provider
  • predictAssignmentProbability() when model loaded → ML P(assign) for best CC/CSP
  • Else GBM (assignmentProbabilityGBM) only

Same JSONL → calibration notes (daily task) → solus-calibration-notes.txt
        →  SOLUS_CALIBRATION_CONTEXT injects Brier + last 10 outcomes + notes
        ↓
Optimal strike / strike ritual / position assess prompts see calibration and (when present) ML output.
```

---

## 3. How to prove it

### A. Run “assignment calibration” with Solus

Ask Solus: “assignment calibration” or “how calibrated are you?” The **SOLUS_ASSIGNMENT_CALIBRATION** action reports mean Brier (last 30d) and resolved count. That is the direct proof of what we measure.

### B. Optional: validation script on the store

From repo root, run:

```bash
python3 src/plugins/plugin-solus/scripts/validate_solus_calibration.py
# Or with explicit path:
python3 src/plugins/plugin-solus/scripts/validate_solus_calibration.py --data .elizadb/solus/solus-assignment-predictions.jsonl
```

The script loads the JSONL, keeps resolved rows, computes Brier (and optionally Brier by asset), and prints count + mean Brier. Use it to audit the store or to compare before/after adding more resolved predictions.

### C. Tests

- **assignmentPredictionsStore.test.ts:** append, resolve, getResolvedCount, computeBrier.
- **solusCalibrationContext.test.ts:** provider returns Brier and recent outcomes when store has resolved rows.
- **solusStrategyImprovement.integration.test.ts:** prompt includes calibration context and assignment prob; response shape and richness.

---

## 4. Summary

- **Loop:** Record → resolve → Brier + notes → inject; 50+ resolved → train ONNX → reload; next call uses calibration context and (when present) ML P(assign).
- **Chain:** Predictions JSONL → training script → ONNX + metadata → inference service → SOLUS_OPTIONS_CONTEXT; same JSONL → calibration notes → SOLUS_CALIBRATION_CONTEXT.
- **Proof:** (1) “Assignment calibration” with Solus for live Brier and count. (2) Optional `validate_solus_calibration.py` on the JSONL. (3) Unit and integration tests above.

**See also:** [FEATURE-STORE.md](FEATURE-STORE.md) (schema and derived features), [README.md](README.md) § Solus ML / ONNX, [docs/SOLUS.md](../../../docs/SOLUS.md).

**Limitations / scope:** Live P(assign) via particle filter (quant 5.py) is a later iteration. We do not change the Deribit API or plugin-vince; Solus consumes VINCE_DERIBIT_SERVICE and existing `getOptionsContext` only. Tail/copula are TS-only (no Python pipeline).
