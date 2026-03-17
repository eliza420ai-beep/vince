# WHAT.md — The Trader's Compass in a Chaotic World

```
  ██╗   ██╗██╗███╗   ██╗ ██████╗███████╗
  ██║   ██║██║████╗  ██║██╔════╝██╔════╝
  ██║   ██║██║██╔██╗ ██║██║     █████╗
  ╚██╗ ██╔╝██║██║╚██╗██║██║     ██╔══╝
   ╚████╔╝ ██║██║ ╚████║╚██████╗███████╗
    ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
```

**Purpose:** Define _what_ plugin-vince is and does—scope, domains, and capabilities. For _why_ we chose ElizaOS and design trade-offs, see [WHY.md](./WHY.md). For _how_ to develop and extend it, see [HOW.md](./HOW.md) and [CLAUDE.md](./CLAUDE.md).

---

## At a Glance

|                     |                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**      | A quantitative trading assistant—unified data intelligence across options, perps, TradFi, memes, and art. Lifestyle: ask Kelly.                               |
| **How you use it**  | Chat with the VINCE agent: "gm", "perps", "options", "memes", "bot status", etc. One coherent voice instead of 15 browser tabs.                               |
| **Technical shape** | ~30 services, 20 actions, 2 context providers, 1 trade-performance evaluator. Paper trading bot with ML enhancement (Thompson Sampling, feature store, ONNX). |
| **Primary assets**  | BTC, ETH, SOL, HYPE + 34 HIP-3 assets (gold, SPX, NVDA, etc.).                                                                                                |
| **Docs**            | [README.md](./README.md) · [CLAUDE.md](./CLAUDE.md) · [SIGNAL_SOURCES.md](./SIGNAL_SOURCES.md)                                                                |

---

## What VINCE Actually Does

VINCE started as a personal itch: paper trading BTC perps on Hyperliquid, scanning Solana memes on DexScreener, dipping into options on Deribit—and trying to remember if it was Thursday (pool day) or Friday (ritual vibes). The data was everywhere; the context wasn’t. I wanted one coherent voice: _"Here’s the play, and here’s why it fits your life."_

At its core, VINCE blends **five domains** (plus lifestyle via Kelly) into one feed:

- **Options** — Covered calls on BTC via HYPERSURFACE (Deribit IV, Greeks, DVOL).
- **Perps** — Long/short signals with paper execution; 10+ signal sources, weighted voting.
- **TradFi** — Gold, NVDA, SPX via Hyperliquid HIP-3 (34 assets).
- **Memes** — AI tokens in the $1M–$20M sweet spot (DexScreener, traction, liquidity).
- **Art** — NFT floor tracking for thin-buy opportunities (curated collections).
- **Lifestyle** — Handled by Kelly (dining, hotels, day-of-week suggestions).

Say **"gm"** and you get a briefing: options skew, perps funding, top memes, session context, NFT floors (for lifestyle nudge, ask Kelly). Not a dashboard—curated, one narrative.

The **paper trading bot** follows those signals with guardrails:

- Kelly Criterion sizing, circuit breakers (e.g. $200 daily loss cap), goals ($420/day, $10K/month).
- It learns from trades: Thompson Sampling adjusts signal weights; embeddings find similar past trades; optional ONNX models refine quality and sizing.
- You can check bot status, deep-dive a meme, or pull "Grok Expert" prompts for research.

So: a quant desk in your pocket that still respects you’re human.

---

## Self-Improving Edge (Without the Drama)

Markets evolve; VINCE learns **parametrically**, not by rewriting code:

- **Thompson Sampling** — Signal source weights adapt from real wins/losses.
- **Embeddings** — Similar past trades inform current decisions.
- **Offline models** — ONNX (from feature-store JSONL) for signal quality and position sizing. Training produces an improvement report (including holdout metrics) consumed by the runtime to refine weights.

Timeline: **Day 1** rule-based → **~30 days** adaptive weights → **90+ days** full ML inference when data allows. If ML fails, rules take over. No auto-code edits, no external ML infra—just graceful degradation.

---

## Free-First, Optional Premium

VINCE runs on **free** sources by default (Binance, Deribit, DexScreener, Hyperliquid, CoinGecko, etc.). Paid APIs (CoinGlass, Nansen, Sanbase) are **optional** boosts. Hobbyist-friendly: $0 to start; upgrade if you scale. Ensembles beat single sources; historical tracking culls weak ones.

---

## Philosophy in One Line

**Trade well, live well.** Edge and equilibrium—crypto as a game, not a jail. Goals like $10K/month are enablers for better living, not the only point.

---

## Where to Go Next

- **Implement or extend:** [HOW.md](./HOW.md), [CLAUDE.md](./CLAUDE.md).
- **Signal sources and debugging:** [SIGNAL_SOURCES.md](./SIGNAL_SOURCES.md).
- **ML improvement, tuning, and proof:** [IMPROVEMENT_WEIGHTS_AND_TUNING.md](./IMPROVEMENT_WEIGHTS_AND_TUNING.md), [ML_IMPROVEMENT_PROOF.md](./ML_IMPROVEMENT_PROOF.md).
- **Why ElizaOS (and trade-offs):** [WHY.md](./WHY.md).
- **Cost coverage and profitability context:** [TREASURY.md](../../docs/TREASURY.md) (project root).

---

## Dexter as Portfolio Authority (VINCE consumes)

VINCE is the **monitoring layer**. Dexter is the **portfolio construction + scorecard authority**.

In this repo, we treat these root artifacts as the canonical portfolio inputs published by Dexter:

- `portfolio_watchlist.json`
- `portfolio_tastytrade.json`
- `portfolio_hyperliquid.json`
- `scorecard.json`

Operational boundary:

- **VINCE can propose** new names and enrich them with live overlays (quotes, filings, insiders, momentum).
- **Dexter promotes** names into the canonical portfolio files and republishes `scorecard.json`.

Discovery funnel:

- `portfolio_watchlist_candidates.json` is a **staging inbox** for names surfaced by VINCE (often from X/news/filings). It is _not_ the active watchlist.
- Once Dexter approves a candidate, it gets promoted into `portfolio_watchlist.json` (and later into sleeves).

---

## AIHF portfolio drafts (compare only)

We may also copy AI Hedge Fund (AIHF) draft artifacts into this repo for **comparison inside the Top100 tab**:

- `portfolio_draft_top100.json`
- `portfolio_draft_tastytrade_full.json`
- `portfolio_draft_hyperliquid_full.json`

Guardrails:

- These drafts are **staging/compare inputs** only.
- They can annotate **overlap** (and suggested target weights) on existing canonical Top100 rows.
- They do **not** redefine canonical Top100 membership, rank, sleeves, score coverage, score provenance, or history.

---

## Dexter cache import (cost + reuse)

Dexter may publish a local `cache_dexter/` folder (gitignored) with historical API responses to reduce re-fetching and cost.

In VINCE:

- `cache_dexter/` is **staging only**. Readers do not use it directly.
- `.elizadb/financialdatasets-cache/` is the **canonical runtime cache** consumed by Top100, FD snapshots, and discovery.

Import path:

- When `VINCE_DEXTER_CACHE_IMPORT=true`, the weekly discovery task will import supported `cache_dexter/` domains into `.elizadb/financialdatasets-cache/` before building snapshots.
- The importer is deterministic and file-based (no API calls). It only writes when the source cache file is newer than the destination.

Supported imported domains (today):

- `cache_dexter/prices` → `.elizadb/financialdatasets-cache/prices` (FD daily envelopes)
- `cache_dexter/company_facts` → `.elizadb/financialdatasets-cache/company-facts` (per-ticker facts)
- `cache_dexter/earnings` → `.elizadb/financialdatasets-cache/earnings`
- `cache_dexter/insider-trades` → `.elizadb/financialdatasets-cache/insiders`

Note: `cache_aifh/` (AI hedge fund cache) is typically hash-keyed blobs without ticker/query metadata. VINCE does not import it unless it also ships an index/manifest that maps cache keys back to tickers and date ranges.

Recommended index format:

- Write `cache_aifh/index.jsonl` where each line includes:
  - `key` (filename without `.json`)
  - `kind` (e.g. `prices`, `company_news`, `line_items`)
  - `endpoint` (e.g. `/prices/`)
  - `params` (must include `ticker` when applicable)
  - optional `startDate`, `endDate`, `expiresAt`

A tiny Python helper to generate this at cache-write time lives at `scripts/aifh-cache-index-writer.py`.
