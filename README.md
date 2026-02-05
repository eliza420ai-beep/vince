# VINCE

```
  ██╗   ██╗██╗███╗   ██╗ ██████╗███████╗
  ██║   ██║██║████╗  ██║██╔════╝██╔════╝
  ██║   ██║██║██╔██╗ ██║██║     █████╗  
  ╚██╗ ██╔╝██║██║╚██╗██║██║     ██╔══╝  
   ╚████╔╝ ██║██║ ╚████║╚██████╗███████╗
    ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
```

> **Push, not pull.** Unified data intelligence for options, perps, memes, airdrops, DeFi, lifestyle, and NFT floors — with a **self-improving paper trading bot** at the core.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  QUICK LINKS                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  [FEATURE-STORE](FEATURE-STORE.md)   ML & paper bot · feature store          │
│  [SUPABASE_MIGRATION](SUPABASE_MIGRATION.md)  Production persistence checklist │
│  [DEPLOY](DEPLOY.md)                 Eliza Cloud · env · troubleshooting     │
│  [CLAUDE](CLAUDE.md)                 Dev guide (character, plugins, tests)   │
│  [plugin-vince/](src/plugins/plugin-vince/)  README · WHAT · WHY · HOW       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONTENTS                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  [North Star](#north-star)             Proactive agent, push not pull        │
│  [Current focus](#-current-focus-feb-2026)   ALOHA, ML paper trading         │
│  [Milestone](#-milestone-full-ml-loop-on-eliza-cloud-no-redeploy-tax)  Shipped │
│  [Heart of VINCE](#heart-of-vince-signals--trades--learning)  Pipeline      │
│  [Star feature](#star-feature-self-improving-paper-trading-bot)  ML bot      │
│  [Features](#features-what-actually-matters)  What matters + actions          │
│  [Getting started](#getting-started)  Install, dev, production               │
│  [Development](#development)          Commands, testing                      │
│  [Production](#production-with-supabase-postgres)  Supabase, ML on Cloud      │
│  [Testing](#testing)                   Component + E2E                        │
│  [Configuration](#configuration)       Where things live                      │
│  [Documentation](#documentation)        Doc index                             │
│  [Alternatives: Honcho](#alternatives-considered-honcho)  Why we don’t use it │
│  [Troubleshooting](#troubleshooting)   DB migration, SSL                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**At a glance:** One command (**ALOHA**) → daily vibe check + PERPS + OPTIONS + “trade today?”. Paper bot runs in prod, trains when ready, stores models in Supabase — **no redeploy to improve ML.** Supabase Postgres for production persistence. `elizaos dev` to run.

---

```
  ◆  NORTH STAR
```

## North Star

**You never have to "chat" with VINCE — he pings you.** The goal is a proactive agent that sends what you need on **Discord or Slack**: day report (ALOHA), his trades and reasoning, close results and overall PnL, and optionally thin-floor NFT alerts. Chat remains for deep dives; the default experience is push, not pull. Full vision and gap vs today: [knowledge/internal-docs/vince-north-star.md](knowledge/internal-docs/vince-north-star.md).

**Why we built this:** Stay in the game without 12+ hours on screens—treat crypto to live well, not be consumed. [Mindset (why VINCE + Eliza)](knowledge/internal-docs/why-vince-eliza-mindset.md).

---

```
  🎯  CURRENT FOCUS (Feb 2026)
```

## 🎯 Current focus (Feb 2026)

- **ALOHA day report** – our primary action. One command delivers the daily “vibe check”: market temperature, PERPS posture, OPTIONS positioning, and whether the bot should even be trading.
- **Machine-learning paper trading** – every engineering sprint feeds the paper bot more signal coverage, cleaner feature collection, faster training, and better ONNX models. Everything else is backlog polish.
- **Other actions** – still present, but treated as supporting cast. If it doesn’t improve the paper strategy or the daily ALOHA briefing, it’s deliberately low priority.

> **If you only remember one thing:** _ALOHA in, better ML out._

---

```
  🚀  MILESTONE: Full ML loop on Eliza Cloud (no redeploy tax)
```

## 🚀 Milestone: Full ML loop on Eliza Cloud (no redeploy tax)

**We shipped it.** The paper bot now runs a **complete ML lifecycle in production** without paying $15 per model update:

| What | How |
|------|-----|
| **Feature store** | Paper trade features dual-write to Supabase table `vince_paper_bot_features`. Data **persists across redeploys** — no more losing history when the container is recreated. |
| **Training in prod** | At 90+ complete trades, **TRAIN_ONNX_WHEN_READY** runs the Python pipeline **inside the container** (Dockerfile: Python + xgboost, onnxmltools, etc.). No local train-and-copy. |
| **Models in Supabase Storage** | Trained `.onnx` + `training_metadata.json` upload to bucket **`vince-ml-models`**. ML service **reloads** so new thresholds apply **immediately**. Next redeploy: app pulls latest from the bucket — **updated ML without another deploy**. |
| **One-time setup** | Run `scripts/supabase-feature-store-bootstrap.sql` in Supabase; create Storage bucket `vince-ml-models`. Set `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` in `.env`, then `bun run deploy:cloud` and you’re set. See [DEPLOY.md](DEPLOY.md) and [FEATURE-STORE.md](FEATURE-STORE.md). |

> **TL;DR:** One deploy. Features and models live in Supabase. Training runs on Cloud. New models take effect **without** another $15 redeploy.

---

```
  ═══  HEART OF VINCE: signals → trades → learning  ═══
```

## Heart of VINCE: signals → trades → learning

The core of VINCE is a **multi-factor paper trading pipeline**: 10+ signal sources (CoinGlass, Binance, MarketRegime, News, Deribit, liquidations, Sanbase, Hyperliquid, etc.) feed the aggregator; every decision is stored with 50+ features and **decision drivers** (“WHY THIS TRADE”); and a Python training pipeline (`plugin-vince/scripts/train_models.py`) produces ONNX models plus an **improvement report** (feature importances, suggested signal factors). The feature store and training script are aligned with the expanded signal set: **hasFundingExtreme** covers Binance and Hyperliquid funding extremes, **hasOICap** records Hyperliquid perps-at-OI-cap; the training script uses optional **signal_hasOICap** when present, and synthetic data (`generate_synthetic_features.py`) uses a 10-source pool so ML sees the same variety as production.

**News sentiment (MandoMinutes) is now trading-bot ready:** asset-specific sentiment, risk-event dampening, price-embedded headlines, category weighting, and headcount-calibrated confidence. **getVibeCheck()** — a 1–2 line "vibe check" (Risk-off/Risk-on/Mixed + salient phrases) — is wired into the paper bot context and "WHY THIS TRADE" so headlines flow into every decision. **NASDAQ 24h + macro** features (HIP-3 primary, Yahoo fallback) now feed the feature store; `news_nasdaqChange` is a top-5 signal-quality feature. **Real-time thresholds** relaxed (Binance L/S, News confidence, Deribit skew/P/C, MarketRegime, Sanbase) so more sources contribute more often. **Improvement weights** aligned with training metadata (NewsSentiment↑, CoinGlass↑, MarketRegime↑). See `progress.txt` § MandoMinutes, THINGS TO DO.

Confirm which sources contribute in logs: at startup see `[VINCE] 📡 Signal sources available:`; on each aggregation see `[VinceSignalAggregator] ASSET: N source(s) → M factors | Sources: ...`. To enable or fix sources, see [plugin-vince/SIGNAL_SOURCES.md](src/plugins/plugin-vince/SIGNAL_SOURCES.md).

```
  ★  STAR FEATURE: self-improving paper trading bot  ★
```

## Star feature: self-improving paper trading bot

The most novel piece in this repo is the **paper trading bot that gets better over time** using machine learning:

1. **Paper trading** — Runs simulated perpetuals (Hyperliquid-style) with real signals, risk limits, session filters, and goal tracking ($/day, $/month).
2. **Feature store** — Records **50+ features** per decision: market (price, funding, OI, **funding 8h delta**, **OI 24h change**, **DVOL**, **RSI**, **order-book imbalance**, **bid-ask spread**, **price vs SMA20**), session, signal (with **factor-derived sentiment**, **hasFundingExtreme** from Binance/Hyperliquid, **hasOICap** from Hyperliquid perps-at-OI-cap), regime, news (**sentiment score/direction**, **risk events**), execution, outcome. Data to JSONL and **Supabase** (dual-write to `vince_paper_bot_features`) so it **persists across redeploys**. See [plugin-vince/DATA_LEVERAGE.md](src/plugins/plugin-vince/DATA_LEVERAGE.md).
3. **Online adaptation** — Thompson Sampling (weight bandit) and signal-similarity lookup adjust behavior from live outcomes; a Bayesian parameter tuner refines thresholds.
4. **Offline ML** — A Python script (`plugin-vince/scripts/train_models.py`) trains XGBoost models (signal quality, position sizing, TP/SL) and exports to ONNX.
5. **ONNX at runtime** — The bot loads ONNX models for signal-quality and sizing decisions, with rule-based fallbacks when models aren’t trained yet.

**Data leverage:** We use funding history (8h delta), a rolling price window (SMA20), Binance futures depth (book imbalance & spread), Deribit DVOL/ATR/RSI, and **MandoMinutes news** (asset-specific sentiment, price-embedded headlines, risk events, category-weighted) so ML and the improvement report see the full picture—not just a few bars. See [plugin-vince/ALGO_ML_IMPROVEMENTS.md](src/plugins/plugin-vince/ALGO_ML_IMPROVEMENTS.md) (§ Leverage more data points).

**Closed loop:** paper trades → feature collection → Python training → ONNX deployment → online bandit/tuner/similarity. Day 1 it runs on rules; over time it leans on ML as enough data accumulates.

**Paper trading algo: improvements we can claim.** (1) Market data wired into live logic and ML feature store: order-book imbalance, price vs SMA20, funding 8h delta, DVOL, **NASDAQ 24h + macro** (news_nasdaqChange, news_macro_risk_on/off). (2) Book-imbalance filter, SMA20/funding confidence boost, DVOL size cap. (3) **MandoMinutes getVibeCheck()** wired to paper bot ("Headlines: {vibe}" in WHY THIS TRADE). (4) **Real-time thresholds** relaxed so Binance L/S, News, Deribit, MarketRegime, Sanbase contribute more often. (5) **Improvement weights** from training metadata: NewsSentiment, CoinGlass, MarketRegime boosted; weights persisted in tuned-config.json. (6) **Retrain pipeline** — train_models.py, run-improvement-weights.ts, FEATURE_TO_SOURCE mapping for news/macro features. Unit tests for extended-snapshot, news sentiment, phrase overrides. We do **not** yet claim improved P&L or win rate; that requires backtest or live results over time.

Implementation: [src/plugins/plugin-vince/](src/plugins/plugin-vince/) (feature store, weight bandit, signal similarity, ML inference, parameter tuner; actions: bot status, pause, trade, why-trade).

```
  ───  FEATURES (what actually matters)  ───
```

## Features (what actually matters)

- **ALOHA** – single command; returns vibe check + PERPS pulse + OPTIONS posture + “should we even trade today?” judgment. This is the action we run every morning.
- **Self-improving paper bot** – ML loop described above; no live execution, but every trade is stored, learnt from, and used to tighten thresholds.
- **Teammate context** – USER/SOUL/TOOLS/MEMORY keep the responses in character.
- **Knowledge ingestion** – the `VINCE_UPLOAD` action pipes long-form research through our fork of **summarize** (`IkigaiLabsETH/summarize`) so every PDF, podcast, or YouTube link we feed in ends up as structured knowledge under `knowledge/`. [1]
- **Chat mode** – `chat: <question>` pulls directly from `knowledge/` and the trench frameworks so you can pressure-test an idea without leaving VINCE.
- **Other actions** – still exposed, but they’re backlog fodder until they support ALOHA or the ML loop.

### Action status (trimmed-down reality)

- **ALOHA (includes PERPS & OPTIONS insights)** – ⭐ Core value.
- **VINCE_PERPS / VINCE_OPTIONS** – Used inside ALOHA; still callable directly, but treated as subcomponents not standalone experiences.
- **Everything else (NEWS, MEMES, TREADFI, LIFESTYLE, NFT, INTEL, BOT, UPLOAD)** – kept for heritage, lightly maintained, not a product focus right now.

---

```
  ─ ─ ─  RUN IT  ─ ─ ─   Getting started · Development · Production · Testing  ─ ─ ─
```

```
  ▶  GETTING STARTED
```

## Getting started

```bash
bun install
bun run build
cp .env.example .env   # add API keys (see .env.example)

# Development (hot-reload)
elizaos dev

# Or start once (uses Postgres when POSTGRES_URL is set)
bun start
```

```
  ▶  DEVELOPMENT
```

## Development

```bash
# Start development with hot-reloading (recommended)
elizaos dev

# OR start without hot-reloading (uses Postgres when POSTGRES_URL is set)
bun start
# Note: When using 'start', you need to rebuild after changes:
# bun run build

# Test the project
elizaos test
```

```
  ▶  PRODUCTION (Supabase / Postgres)
```

## Production with Supabase (Postgres)

**Supabase migration is ready.** Set `POSTGRES_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` in `.env`; ElizaOS tables and `plugin_vince.paper_bot_features` share one Supabase DB. Data **persists across redeploys**. Full checklist: [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md). Backfill local JSONL: `bun run sync:supabase`.

1. **In `.env`** set `POSTGRES_URL` to the **direct** Supabase connection (not the pooler):
   - Use **port 5432** (direct), not 6543 (pooler). Migrations fail on the pooler.
   - Add `?sslmode=verify-full` to avoid SSL warnings.
   - Example:  
     `POSTGRES_URL=postgresql://postgres:YOUR_PASSWORD@db.XXX.supabase.co:5432/postgres?sslmode=verify-full`
2. **Run locally:** `bun start` — the start script runs the migration bootstrap (creates `migrations` schema) when `POSTGRES_URL` is set, then starts the app.
3. **Deploy:** Use the same `POSTGRES_URL` (direct 5432) in your deploy env. See [DEPLOY.md](DEPLOY.md).

### ML on Eliza Cloud (ONNX models)

**Recommended: train on Cloud, models in Supabase.** With Supabase configured (and the `vince-ml-models` Storage bucket created once), the bot **trains in the container** when it has 90+ complete trades, **uploads** models to Supabase Storage, and **reloads** the ML service. On the next redeploy, the app **downloads** the latest models from the bucket — so ML improves **without** an extra deploy. See the [Milestone](#milestone-ml-trains-on-eliza-cloud-no-extra-redeploy) section above and [DEPLOY.md](DEPLOY.md).

**Alternative: ship models in the repo.** Train locally, copy `.onnx` + `training_metadata.json` into `src/plugins/plugin-vince/models/`, commit, and deploy; the Dockerfile copies that folder into the container. See [src/plugins/plugin-vince/models/README.md](src/plugins/plugin-vince/models/README.md) and [DEPLOY.md](DEPLOY.md#ml-onnx-on-eliza-cloud--will-it-be-active).

```
  ▶  TESTING
```

## Testing

ElizaOS employs a dual testing strategy:

1. **Component Tests** (`src/__tests__/*.test.ts`)

   - Run with Bun's native test runner
   - Fast, isolated tests using mocks
   - Perfect for TDD and component logic

2. **E2E Tests** (`src/__tests__/e2e/*.e2e.ts`)
   - Run with ElizaOS custom test runner
   - Real runtime with actual database (PGLite)
   - Test complete user scenarios

### Test Structure

```
src/
  __tests__/              # All tests live inside src
    *.test.ts            # Component tests (use Bun test runner)
    e2e/                 # E2E tests (use ElizaOS test runner)
      project-starter.e2e.ts  # E2E test suite
      README.md          # E2E testing documentation
  index.ts               # Export tests here: tests: [ProjectStarterTestSuite]
```

### Running Tests

- `elizaos test` - Run all tests (component + e2e)
- `elizaos test component` - Run only component tests
- `elizaos test e2e` - Run only E2E tests

### Writing Tests

Component tests use bun:test:

```typescript
// Unit test example (__tests__/config.test.ts)
describe('Configuration', () => {
  it('should load configuration correctly', () => {
    expect(config.debug).toBeDefined();
  });
});

// Integration test example (__tests__/integration.test.ts)
describe('Integration: Plugin with Character', () => {
  it('should initialize character with plugins', async () => {
    // Test interactions between components
  });
});
```

E2E tests use ElizaOS test interface:

```typescript
// E2E test example (e2e/project.test.ts)
export class ProjectTestSuite implements TestSuite {
  name = 'project_test_suite';
  tests = [
    {
      name: 'project_initialization',
      fn: async (runtime) => {
        // Test project in a real runtime
      },
    },
  ];
}

export default new ProjectTestSuite();
```

The test utilities in `__tests__/utils/` provide helper functions to simplify writing tests.

[1]: https://github.com/IkigaiLabsETH/summarize

```
  ─ ─ ─  REFERENCE  ─ ─ ─   Configuration · Documentation · Troubleshooting  ─ ─ ─
```

```
  ▶  CONFIGURATION  ·  DOCUMENTATION  ·  TROUBLESHOOTING
```

## Configuration

| What | Where |
|------|--------|
| VINCE character & agent | `src/agents/vince.ts` — knowledge dirs, system prompt, plugins |
| Paper bot, ML, actions, providers | `src/plugins/plugin-vince/` |
| Teammate context (loaded every session) | `knowledge/teammate/` — USER.md, SOUL.md, TOOLS.md |

## Documentation

| Doc | Purpose |
|-----|---------|
| [FEATURE-STORE.md](FEATURE-STORE.md) | Paper bot feature storage (JSONL, PGLite/Postgres, Supabase), training, env flags |
| [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md) | Production persistence checklist, bootstrap SQL, backfill script |
| [DEPLOY.md](DEPLOY.md) | Deploy to Eliza Cloud (PGLite vs Postgres), env vars, troubleshooting |
| [CLAUDE.md](CLAUDE.md) | ElizaOS project dev guide (character, plugins, env, testing) |
| [TREASURY.md](TREASURY.md) | Cost coverage and profitability mandate |
| [src/plugins/plugin-vince/README.md](src/plugins/plugin-vince/README.md) | Plugin overview; [WHAT.md](src/plugins/plugin-vince/WHAT.md) / [WHY.md](src/plugins/plugin-vince/WHY.md) / [HOW.md](src/plugins/plugin-vince/HOW.md) / [CLAUDE.md](src/plugins/plugin-vince/CLAUDE.md) for purpose, framework rationale, and development |
| [src/plugins/plugin-vince/models/README.md](src/plugins/plugin-vince/models/README.md) | Ship ONNX models for Eliza Cloud (copy trained `.onnx` + `training_metadata.json` into this folder, then deploy) |

```
  ◇  ALTERNATIVES CONSIDERED: HONCHO
```

## Alternatives considered: Honcho

**[Honcho](https://docs.honcho.dev)** is an open-source memory library for stateful agents (Peers, Sessions, representations from reasoning over messages). We evaluated it for VINCE and **do not use it**; this section records why and when it might be relevant.

| Honcho | VINCE / ElizaOS today |
|--------|------------------------|
| Peers + Sessions | Entities, rooms, participants |
| Representations (reasoning over messages) | Evaluators (facts, reflection) + memory |
| Managed or self-hosted memory service | DB adapter (Postgres/PGLite) + Supabase feature store |

**Why we don’t add Honcho here:** Eliza already gives us memories, embeddings, search, evaluators (facts/reflection), entities, and relationships. The paper bot and ML pipeline use the **feature store** (Supabase); that’s the right place for trading state. Adding Honcho would duplicate “what we know” and add sync/maintenance cost without a clear gap being filled.

**When Honcho could make sense:** (1) You need formal reasoning over conversations (premises → conclusions → representations) beyond what our evaluators do, (2) you want a managed memory service for a new product, or (3) you’re prototyping a separate agent and want to try Honcho from scratch. For those cases, the [Honcho agent skills](https://docs.honcho.dev/v3/documentation/introduction/vibecoding#agent-skills) (e.g. `honcho-integration`) are useful; we’d still keep them out of the main VINCE runtime unless we have a concrete use case.

```
  ⚠  TROUBLESHOOTING
```

## Troubleshooting

### Database migration failed (`CREATE SCHEMA IF NOT EXISTS migrations`)

If you see:

```text
Failed to run database migrations (error=Failed query: CREATE SCHEMA IF NOT EXISTS migrations
```

**Fix (Supabase / Postgres for prod):** In `.env`, set `POSTGRES_URL` to the **direct** connection: **port 5432** (not 6543). Add `?sslmode=verify-full`, e.g.  
`POSTGRES_URL=postgresql://postgres:PASSWORD@db.XXX.supabase.co:5432/postgres?sslmode=verify-full`  
Then run **`bun start`** — the start script runs the migration bootstrap first.

**Local-only (no Postgres):** Leave `POSTGRES_URL` empty in `.env` and run `bun start` to use PGLite.

**"self-signed certificate in certificate chain":** If bootstrap or the app fails with this SSL error, add to `.env`:  
`POSTGRES_SSL_REJECT_UNAUTHORIZED=false` (opt-in; use only if needed).

See [DEPLOY.md](DEPLOY.md) for full deploy options, bootstrap SQL, and troubleshooting.

**Quick deploy (PGLite, minimal env):** `bun run deploy:cloud` or the minimal command in [DEPLOY.md](DEPLOY.md#minimal-required-only--pglite-no-postgres).

---

```
╭─────────────────────────────────────────────────────────────────────────────╮
│  QUICK REFERENCE                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Run locally    elizaos dev          │  Deploy       bun run deploy:cloud    │
│  Test           elizaos test         │  Supabase     See SUPABASE_MIGRATION  │
│  Backfill JSONL bun run sync:supabase│  ML bucket    vince-ml-models         │
│  Feature store  vince_paper_bot_features │  Postgres    port 5432 (not 6543)  │
╰─────────────────────────────────────────────────────────────────────────────╯
```
