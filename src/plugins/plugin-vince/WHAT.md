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
| **What it is**      | A quantitative trading assistant with a lifestyle overlay—unified data intelligence across options, perps, TradFi, memes, lifestyle, and art.                 |
| **How you use it**  | Chat with the VINCE agent: "gm", "perps", "options", "memes", "bot status", etc. One coherent voice instead of 15 browser tabs.                               |
| **Technical shape** | ~30 services, 20 actions, 2 context providers, 1 trade-performance evaluator. Paper trading bot with ML enhancement (Thompson Sampling, feature store, ONNX). |
| **Primary assets**  | BTC, ETH, SOL, HYPE + 34 HIP-3 assets (gold, SPX, NVDA, etc.).                                                                                                |
| **Docs**            | [README.md](./README.md) · [CLAUDE.md](./CLAUDE.md) · [SIGNAL_SOURCES.md](./SIGNAL_SOURCES.md)                                                                |

---

## What VINCE Actually Does

VINCE started as a personal itch: paper trading BTC perps on Hyperliquid, scanning Solana memes on DexScreener, dipping into options on Deribit—and trying to remember if it was Thursday (pool day) or Friday (ritual vibes). The data was everywhere; the context wasn’t. I wanted one coherent voice: _"Here’s the play, and here’s why it fits your life."_

At its core, VINCE blends **six domains** into one feed:

- **Options** — Covered calls on BTC via HYPERSURFACE (Deribit IV, Greeks, DVOL).
- **Perps** — Long/short signals with paper execution; 10+ signal sources, weighted voting.
- **TradFi** — Gold, NVDA, SPX via Hyperliquid HIP-3 (34 assets).
- **Memes** — AI tokens in the $1M–$20M sweet spot (DexScreener, traction, liquidity).
- **Lifestyle** — Day-of-week aware suggestions (dining, hotels, activities).
- **Art** — NFT floor tracking for thin-buy opportunities (curated collections).

Say **"gm"** and you get a briefing: options skew, perps funding, top memes, session context, lifestyle nudge, NFT floors. Not a dashboard—curated, one narrative.

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
- **Offline models** — ONNX (from feature-store JSONL) for signal quality and position sizing.

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
- **Why ElizaOS (and trade-offs):** [WHY.md](./WHY.md).
- **Cost coverage and profitability context:** [TREASURY.md](../../TREASURY.md) (project root).
