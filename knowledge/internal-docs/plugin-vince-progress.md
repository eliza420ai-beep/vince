---
title: "Plugin-Vince progress tracker — completed, priority, backlog"
category: internal-docs
source: repo://src/plugins/plugin-vince/progress.txt
tags:
  - plugin-vince
  - progress
  - essential
  - ml
  - paper-bot
  - services
  - actions
last_reviewed: 2026-02-15
---

# VINCE Plugin Progress Tracker

Last updated: 2026-02-03 (Supabase dual-write + ML training on Eliza Cloud, no redeploy). Update after every feature completion or session end.

---

## COMPLETED

### Core Architecture

- Plugin structure: 27 services, 20 actions, 2 providers, 1 evaluator
- Fallback service pattern (external plugins → built-in API clients)
- ASCII dashboard on startup with live market prices
- Service source tracking (external vs fallback logging)

### Services – Data Sources (18)

CoinGlass, CoinGecko, MarketData, SignalAggregator, TopTraders, NewsSentiment, DexScreener, Meteora, NFTFloor, Lifestyle, Deribit, Nansen, Sanbase, Binance, BinanceLiquidation, MarketRegime, HIP3, Watchlist, Alert.

### Services – Paper Trading Bot (5)

PaperTrading, PositionManager, RiskManager, TradeJournal, GoalTracker.

### Services – Self-Improving (2)

ParameterTuner, ImprovementJournal.

### Services – ML Layer (4)

FeatureStore, WeightBandit, SignalSimilarity, MLInference.

### Fallback Services (7)

deribit, hyperliquid, opensea, nansen, xai, browser, puppeteer.

### Actions – Focus (11)

GM, Aloha, Options, Perps, Memes, Airdrops, Lifestyle, NftFloor, Intel, News, HIP3.

### Actions – Paper Bot (4)

BotStatus, BotPause, WhyTrade, Bot (execute trade).

### Actions – Utilities (5)

Upload (knowledge; URLs/YouTube via summarize), GrokExpert, MemeDeepDive, Watchlist, Alerts.

### Providers & Evaluators

vinceContextProvider, trenchKnowledgeProvider; tradePerformanceEvaluator.

### Key milestones

- **Paper trading algo:** More market data in live logic and feature store (order-book imbalance, price vs SMA20, funding 8h delta, DVOL); book-imbalance filter; confidence boost when trend and funding reversal align; DVOL size cap; 23 unit tests (extended-snapshot), 100% coverage.
- **Stale P&L fix:** Mark price refreshed via coingecko in getEnrichedContext and refreshMarkPrices(); cache TTL 1 min; status trigger words include upnl/pnl. See STALE_PNL_INVESTIGATION.md.
- **Knowledge ingestion:** UPLOAD + summarize (bunx); batch scripts; extract-only, YouTube slides, Firecrawl, language, timeout; dual-write frontmatter (ingestedWith: summarize | vince-upload | ingest-urls).
- **ML:** ONNX export (onnxmltools); similarity "avoid" filter; bandit outcome feedback (contributingSources → recordOutcome); TRAIN_ONNX_WHEN_READY on Cloud; models in Supabase Storage (vince-ml-models); download on startup if local empty.
- **Supabase:** POSTGRES_URL = main app DB (ElizaOS tables). SUPABASE_SERVICE_ROLE_KEY/SUPABASE_URL = feature store (vince_paper_bot_features) + Storage bucket vince-ml-models for ONNX.

---

## PRIORITY

- **Real-time data for paper algo:** Ensure Binance, MarketRegime, News, Deribit, BinanceLiquidations, Sanbase, Hyperliquid contribute factors. Use LOG_LEVEL=debug; see SIGNAL_SOURCES.md. Populate MandoMinutes cache; tune thresholds so more sources contribute.
- **Eliza Cloud logs:** Filterable levels, structured context, less noise; 451 cooldown (DONE); optional dashboard-style summary.

---

## IN PROGRESS

- More trades for Thompson Sampling / ML (VINCE_PAPER_AGGRESSIVE=true, VINCE_PAPER_ASSETS=BTC).
- Feature store 90+ trades → ONNX training (auto or manual).
- Increase real-time signal factors (see PRIORITY).
- Michelin knowledge: target quality not fully achieved; exploring plugin-based fixes (plugin-knowledge, plugin-browser) — preference over ClawdBot. See [todo-michelin-crawlee.md](../../docs/todo-michelin-crawlee.md) and [PLUGIN-KNOWLEDGE-EVAL.md](../../docs/PLUGIN-KNOWLEDGE-EVAL.md).

---

## THINGS TO DO NEXT (high impact)

1. **Use new market features in algo:** bookImbalance, priceVsSma20, fundingDelta, dvol, rsi14 in aggregator/evaluateAndTrade (book filter, trend confirmation, funding reversal factor, DVOL cap). See DATA_LEVERAGE.md.
2. **Add NASDAQ 24h / macro to news features:** Slots exist (news.nasdaqChange, etfFlowBtc, macroRiskEnvironment); add one free/cheap source.
3. **Use improvement report to tune weights:** suggested_signal_factors, feature_importances → align dynamicConfig.
4. **Retrain and ship ONNX** after new features have enough samples (90–200+).
5. **Optional:** DVOL/regime in position cap (reduce size when dvol > 70 or volatilityRegime high).

---

## NEXT / BACKLOG

- Migrate prod to Supabase Postgres; feature store in same DB as ElizaOS tables.
- Train ONNX when 90+ trades (task + Cloud path documented).
- More NFT collections; ClawdBot integration; Telegram/Discord alerts; more meme tokens; Kelly sizing; correlation limits; trailing stop.
- Product: NEWS own plugin; MEMES UI fix; BOT polish; INTEL merge/differentiate; UPLOAD batch; LIFESTYLE→ClawdBot; NFT thin-floor.

---

## KNOWN ISSUES / LIMITATIONS

- XAI/Grok requires API key. Nansen 100 credits/mo; Sanbase 1K/mo.
- Paper bot circuit breakers not yet validated with real trading.
- ONNX active when .onnx in models dir; install onnxmltools, run train_models.py.
- Eliza Cloud deploy timeout (15 min) possible; 15 credits deducted on failure; check /health.

---

## SUPABASE / STORAGE

- **POSTGRES_URL** = main app database (ElizaOS: conversations, memory, entities, rooms, embeddings). Required for persistent deploy.
- **SUPABASE_SERVICE_ROLE_KEY / SUPABASE_URL** = (1) Feature store table vince_paper_bot_features (bootstrap SQL); (2) Storage bucket vince-ml-models for .onnx + training_metadata.json (train on Cloud, download on startup). See [FEATURE-STORE.md](../../docs/FEATURE-STORE.md) and [DEPLOY.md](../../docs/DEPLOY.md).

---

## DEPLOYMENT (Eliza Cloud)

- Current prod works; still PGLite. Next: migrate to Supabase Postgres.
- vince2 timeout (2026-02-02): 15 credits deducted; check containers list, logs, /health; contact support for credit restoration if needed.

---

## BRANDING & CHANNELS

- Frontend: internal use only; not on brand yet; do not promote.
- Discord first, Telegram second. X (Twitter) not prioritized (ban risk); revisit only with low-risk path.
