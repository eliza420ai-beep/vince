# VINCE — TLDR

_The machine should always be running._

## What

Autonomous investing system. Three layers, each with a different time horizon:

| Layer | Repo | Job |
|-------|------|-----|
| **VINCE** | this repo | Hours→weeks. Monitor OI, funding, L/S, portfolio drift. Run Solus options. Forge overnight. Screen 17k+ US tickers. |
| **Dexter** | [dexter](https://github.com/eliza420ai-beep/dexter) | Months→years. Hold the thesis (SOUL.md). Re-underwrite when VINCE surfaces a regime shift. |
| **AIHF** | [ai-hedge-fund](https://github.com/eliza420ai-beep/ai-hedge-fund) | Cycle-scale. 18-analyst adversarial second opinion. Find blind spots. |

Each catches the other's failure mode: missed execution, stale thesis, unchallenged conviction.

## Four Agents (v2 Core)

| Agent | One-liner |
|-------|-----------|
| **VINCE** | Perps data, portfolio drift, Mando Minutes, stock discovery. The eyes. |
| **Solus** | Weekly Hypersurface options. Self-calibrating (Brier scores → ONNX). |
| **Otaku** | On-chain executor. Only agent with a funded wallet. |
| **Forge** | Overnight self-improvement on Apple Silicon. Mutate → replay → commit winners. |

## Two Portfolios

- **Hyperliquid** — HIP-3 sleeve (NVDA, TSM, MSFT, META, AMZN, GOOGL, PLTR, ORCL, COIN, HOOD). Solus writes weekly options on Hypersurface.
- **Tastytrade** — AI infrastructure bottlenecks (ASML, AMAT, KLAC, LRCX, SNPS, CDNS, ANET, AVGO, VRT).

Ground truth: `portfolio_hyperliquid.json`, `portfolio_tastytrade.json`, `portfolio_watchlist.json`.

## Three Improvement Loops

| Loop | Cadence | What it optimizes |
|------|---------|-------------------|
| ML | Every 12h | ONNX models (signal quality, sizing, TP/SL) |
| Strategy genome | Weekly | 15+ algo parameters |
| **Forge** | **Nightly** | Policy thresholds + prompts + hyperparams |

Composite metric: `causal_uplift × Sharpe × brier_calibration`. All three dimensions must improve together or the change is reverted.

## Stock Discovery

17,000+ US tickers (Financial Datasets) → coarse screen → enrich survivors → rank. Structured explanations per ticker: **M**omentum, **Q**uality, **E**vent, **L**iquidity, **F**it. Tastytrade-aligned tags. Output: `portfolio_watchlist_candidates.json`. Live portfolios are never auto-edited.

## Quick Start

```bash
bun install
cp .env.example .env   # OPENAI_API_KEY or ANTHROPIC_API_KEY
bun start              # API :3000, UI :5173
```

v2 slim (4 agents only):

```bash
ELIZA_ENABLED=false KELLY_ENABLED=false ECHO_ENABLED=false \
SENTINEL_ENABLED=false CLAWTERM_ENABLED=false \
ORACLE_ENABLED=false NAVAL_ENABLED=false bun start
```

## North Star

The portfolio reflects the thesis at all times. Options run weekly without gaps. Improvement loops compound overnight without supervision.

The machine monitors. The machine executes. The machine improves overnight. The human holds the thesis, challenges the machine, and writes the record.

---

Full details: [README.md](README.md) · Architecture essay: [We Built the Machine](https://ikigaistudio.substack.com/p/we-built-the-machine)
