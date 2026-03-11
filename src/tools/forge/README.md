# src/tools/forge/

This directory contains tooling for the Forge AutoResearch agent.

## autoresearch-mlx (submodule)

MLX-powered autoresearch runner for Apple Silicon.

**Initialize:**

```bash
git submodule add https://github.com/trevin-creator/autoresearch-mlx src/tools/forge/autoresearch-mlx
git submodule update --init
```

**After cloning this repo:**

```bash
git submodule update --init --recursive
```

**Requirements:**

- Apple Silicon Mac (M1/M2/M3)
- Python 3.11+
- MLX: `pip install mlx`

**VINCE metric override:**

The upstream metric in `autoresearch-mlx` is replaced by:

```
causal_uplift × Sharpe × (1 - brier_score)
```

This is configured via the `--metric` CLI flag in `ForgeMlxService.runAutoresearch()`.

**Status:** Submodule not yet added. Forge runs in Python fallback mode until initialized.
