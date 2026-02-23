# VINCE v4.0.0 — Paper Bot ML docs & validation

> **Release date:** 2026-02-23

This release documents the Paper Bot & ML workflow and adds a single command to validate that ML-derived thresholds improve selectivity on historical data.

---

## Paper Bot & ML

- **README** — Paper Bot & ML section rewritten: re-run training (including `train-models:recency` for recency-weighted training), **validate ML improvement** with `bun run validate-ml`, example validation run table (158 closed trades, Feb 2026), and Scripts table entry for `validate-ml`.
- **package.json** — New scripts:
  - **`validate-ml`** — Runs `validate_ml_improvement.py` on `.elizadb/vince-paper-bot/features`; reports baseline win rate vs filtered win rate and % of skipped trades that were losers.
  - **`train-models:recency`** — Trains with `--recency-decay 0.01` (upweight recent trades).

## Validate ML improvement

After training, prove that ML-derived min strength / min confidence would have improved selectivity:

```bash
bun run validate-ml
```

Or directly:

```bash
python3 src/plugins/plugin-vince/scripts/validate_ml_improvement.py \
  --data .elizadb/vince-paper-bot/features
```

Example run (Feb 2026, 158 closed trades): baseline win rate 23.4%; suggested tuning min_strength=56, min_confidence=50; filtered set 121 trades at 20.7% win rate; 68% of skipped trades were losers. On this small sample, suggested_tuning did not improve win rate—re-run after more trades. See [README § Paper Bot & ML](https://github.com/IkigaiLabsETH/vince/blob/main/README.md#paper-bot--ml).

---

**Full changelog:** [CHANGELOG.md](../CHANGELOG.md)

**Train:** `bun run train-models -- --bench-score-weight` · **Validate:** `bun run validate-ml` · **Deploy:** `bun run deploy:cloud`

---

## Create this release on GitHub

The tag `v4.0.0` is already pushed. To publish the release with these notes (requires [GitHub CLI](https://cli.github.com/)):

```bash
gh release create v4.0.0 --title "v4.0.0 — Paper Bot ML docs & validation" --notes-file docs/RELEASE_v4.0.0.md
```

Or edit the release at: https://github.com/IkigaiLabsETH/vince/releases/new?tag=v4.0.0 and paste the contents of `docs/RELEASE_v4.0.0.md`.
