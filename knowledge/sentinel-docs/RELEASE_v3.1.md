# VINCE v3.1.0

> **Release date:** 2026-02-18

VinceBench helps ML automatically: per-decision bench scores on every closed trade, sample weighting and optional filtering at training time, backfill script for historical JSONL, and cleaner training logs. ONNX is written straight into the agent models dir so no copy step when using the standard command.

---

## VinceBench → ML pipeline

- **labels.benchScore** — Every closed trade gets a VinceBench per-decision score (process quality: signal, risk, timing, regime). Set automatically when a trade closes; available to training as `label_benchScore` after flattening.
- **Training options** — `--bench-score-weight` upweights high-quality decisions for the signal-quality model. Optional `--min-bench-score` or `--bench-score-quantile` trains only on strong-process trades. Metadata and improvement report record when bench options were used.
- **Backfill script** — `bun run src/plugins/plugin-vince/scripts/backfill-bench-scores.ts --input .elizadb/vince-paper-bot/features` adds `benchScore` to existing JSONL (with `.bak` backup). New trades get the score from the feature store; backfill is for history only.
- **Docs** — FEATURE-STORE.md § VinceBench and ML; README § Paper bot & ML updated with the re-run training command and explanation.

---

## Training & ONNX

- **Re-run training** — Documented in README: `python3 src/plugins/plugin-vince/scripts/train_models.py --data .elizadb/vince-paper-bot/features --output .elizadb/vince-paper-bot/models --min-samples 90 --bench-score-weight`. Or `bun run train-models -- --bench-score-weight`.
- **No copy step** — When `--output` is the agent models dir (path contains `vince-paper-bot` and `models`), the script logs: "Models are in the agent directory. Restart the agent to load new ONNX." Otherwise it reminds you to copy `.onnx` and `*_features.json` into that dir.
- **train_models.py** — Pandas/numpy warnings reduced: coerce to numeric before clip/zscore, explicit float64 in outlier clipping, infer_objects after fillna to avoid deprecated downcasting.

---

## Summary

| Area                | Change                                                                                                 |
| :------------------ | :----------------------------------------------------------------------------------------------------- |
| **VinceBench + ML** | benchScore on labels; --bench-score-weight, --min-bench-score, --bench-score-quantile; backfill script |
| **README**          | VinceBench explanation, re-run training command, no-copy note                                          |
| **train_models.py** | Smarter final log (copy vs in-place); fewer dtype/RuntimeWarnings                                      |

---

**Full changelog:** [CHANGELOG.md](../CHANGELOG.md)

**Run:** `elizaos dev` · **Train:** `bun run train-models -- --bench-score-weight` · **Deploy:** `bun run deploy:cloud`

---

## Create this release on GitHub

```bash
git add -A && git status
git commit -m "chore: release v3.1.0 — VinceBench helps ML, backfill, training docs, ONNX in-place"
git tag v3.1.0
git push origin main
git push origin v3.1.0
gh release create v3.1.0 --title "v3.1.0 — VinceBench helps ML automatically" --notes-file docs/RELEASE_v3.1.md
```
