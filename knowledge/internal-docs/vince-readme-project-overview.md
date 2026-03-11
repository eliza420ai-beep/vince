---
title: "VINCE — Project overview and getting started"
category: internal-docs
source: repo://README.md
tags:
  - vince
  - project
  - essential
  - getting-started
  - aloha
  - paper-bot
  - ml
last_reviewed: 2026-02-15
---

# VINCE

Unified data intelligence agent for ElizaOS: options, perps, memes, airdrops, DeFi, lifestyle, and NFT floors — with a **self-improving paper trading bot** at the core.

**Docs:** [FEATURE-STORE.md](../../docs/FEATURE-STORE.md) (ML / paper bot storage) · [DEPLOY.md](../../docs/DEPLOY.md) (Eliza Cloud deploy) · [CLAUDE.md](../../CLAUDE.md) (dev guide) · [src/plugins/plugin-vince/](../../src/plugins/plugin-vince/) (plugin README, WHAT/WHY/HOW, CLAUDE)

---

## Current focus (Feb 2026)

- **ALOHA day report** – primary action. One command delivers the daily "vibe check": market temperature, PERPS posture, OPTIONS positioning, and whether the bot should even be trading.
- **Machine-learning paper trading** – every engineering sprint feeds the paper bot more signal coverage, cleaner feature collection, faster training, and better ONNX models.
- **Other actions** – still present, but supporting cast. If it doesn't improve the paper strategy or the daily ALOHA briefing, it's deliberately low priority.

If you only remember one thing: _ALOHA in, better ML out._

---

## Milestone: Full ML loop on Eliza Cloud (no redeploy tax)

The paper bot runs a **complete ML lifecycle in production** without paying per model update:

| What                           | How                                                                                                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature store**              | Paper trade features dual-write to Supabase table `vince_paper_bot_features`. Data persists across redeploys.                                                                                                                                         |
| **Training in prod**           | At 90+ complete trades, TRAIN_ONNX_WHEN_READY runs the Python pipeline inside the container. No local train-and-copy.                                                                                                                                 |
| **Models in Supabase Storage** | Trained .onnx + training_metadata.json upload to bucket `vince-ml-models`. ML service reloads so new thresholds apply immediately.                                                                                                                    |
| **One-time setup**             | Run scripts/supabase-feature-store-bootstrap.sql in Supabase; create Storage bucket vince-ml-models. Set SUPABASE_SERVICE_ROLE_KEY + SUPABASE_URL in .env. See [DEPLOY.md](../../docs/DEPLOY.md) and [FEATURE-STORE.md](../../docs/FEATURE-STORE.md). |

**TL;DR:** One deploy. Features and models live in Supabase. Training runs on Cloud. New models take effect without another redeploy.

---

## Heart of VINCE: signals → trades → learning

Multi-factor paper trading pipeline: 10+ signal sources (CoinGlass, Binance, MarketRegime, News, Deribit, liquidations, Sanbase, Hyperliquid, etc.) feed the aggregator; every decision is stored with 50+ features and decision drivers ("WHY THIS TRADE"); Python training pipeline (plugin-vince/scripts/train_models.py) produces ONNX models plus an improvement report. See plugin-vince/SIGNAL_SOURCES.md.

## Star feature: self-improving paper trading bot

1. **Paper trading** — Simulated perpetuals (Hyperliquid-style) with real signals, risk limits, session filters, goal tracking ($/day, $/month).
2. **Feature store** — 50+ features per decision: market (price, funding, OI, funding 8h delta, OI 24h change, DVOL, RSI, order-book imbalance, bid-ask spread, price vs SMA20), session, signal, regime, news, execution, outcome. JSONL + Supabase dual-write.
3. **Online adaptation** — Thompson Sampling (weight bandit), signal-similarity lookup, Bayesian parameter tuner.
4. **Offline ML** — train_models.py trains XGBoost (signal quality, position sizing, TP/SL) → ONNX.
5. **ONNX at runtime** — Bot loads ONNX for signal-quality and sizing; rule-based fallbacks when models aren't trained yet.

Implementation: src/plugins/plugin-vince/ (feature store, weight bandit, signal similarity, ML inference, parameter tuner; actions: bot status, pause, trade, why-trade).

## Features (what actually matters)

- **ALOHA** – single command; vibe check + PERPS pulse + OPTIONS posture + "should we even trade today?" This is the action we run every morning.
- **Self-improving paper bot** – ML loop above; every trade stored, learnt from, thresholds tightened.
- **Teammate context** – USER/SOUL/TOOLS/MEMORY keep responses in character.
- **Knowledge ingestion** – VINCE_UPLOAD pipes long-form research through summarize so PDF, podcast, or YouTube link ends up as structured knowledge under knowledge/.
- **Chat mode** – chat: <question> pulls from knowledge/ and trench frameworks.
- **Other actions** – exposed but backlog until they support ALOHA or the ML loop.

### Action status

- **ALOHA (includes PERPS & OPTIONS insights)** – Core value.
- **VINCE_PERPS / VINCE_OPTIONS** – Used inside ALOHA; still callable directly.
- **Everything else (NEWS, MEMES, TREADFI, LIFESTYLE, NFT, INTEL, BOT, UPLOAD)** – heritage, lightly maintained.

## Getting started

```bash
bun install
bun run build
cp .env.example .env   # add API keys

elizaos dev
# Or: bun start
```

## Configuration

| What                              | Where                                            |
| --------------------------------- | ------------------------------------------------ |
| VINCE character & agent           | src/agents/vince.ts                              |
| Paper bot, ML, actions, providers | src/plugins/plugin-vince/                        |
| Teammate context                  | knowledge/teammate/ — USER.md, SOUL.md, TOOLS.md |

## Documentation

| Doc                                                                                                                                                                                                                                                                         | Purpose                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [FEATURE-STORE.md](../../docs/FEATURE-STORE.md)                                                                                                                                                                                                                             | Paper bot feature storage, training, env flags   |
| [DEPLOY.md](../../docs/DEPLOY.md)                                                                                                                                                                                                                                           | Deploy to Eliza Cloud, env vars, troubleshooting |
| [CLAUDE.md](../../CLAUDE.md)                                                                                                                                                                                                                                                | ElizaOS project dev guide                        |
| [TREASURY.md](../../docs/TREASURY.md)                                                                                                                                                                                                                                       | Cost coverage and profitability mandate          |
| [plugin-vince README](../../src/plugins/plugin-vince/README.md), [WHAT.md](../../src/plugins/plugin-vince/WHAT.md), [WHY.md](../../src/plugins/plugin-vince/WHY.md), [HOW.md](../../src/plugins/plugin-vince/HOW.md), [CLAUDE.md](../../src/plugins/plugin-vince/CLAUDE.md) | Plugin purpose, rationale, development           |
| [models/README.md](../../src/plugins/plugin-vince/models/README.md)                                                                                                                                                                                                         | Ship ONNX models for Eliza Cloud                 |
