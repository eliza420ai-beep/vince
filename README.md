# VINCE

Unified data intelligence agent for ElizaOS: options, perps, memes, airdrops, DeFi, lifestyle, and NFT floors — with a **self-improving paper trading bot** at the core.

**Docs:** [FEATURE-STORE.md](FEATURE-STORE.md) (ML / paper bot storage) · [DEPLOY.md](DEPLOY.md) (Eliza Cloud deploy) · [CLAUDE.md](CLAUDE.md) (dev guide) · [src/plugins/plugin-vince/](src/plugins/plugin-vince/) (plugin README, WHAT/WHY/HOW, CLAUDE)

---

## Heart of VINCE: signals → trades → learning

The core of VINCE is a **multi-factor paper trading pipeline**: 10+ signal sources (CoinGlass, Binance, MarketRegime, News, Deribit, liquidations, Sanbase, Hyperliquid, etc.) feed the aggregator; every decision is stored with 40+ features and **decision drivers** (“WHY THIS TRADE”); and a Python training pipeline (`plugin-vince/scripts/train_models.py`) produces ONNX models plus an **improvement report** (feature importances, suggested signal factors). Confirm which sources contribute in logs: at startup see `[VINCE] 📡 Signal sources available:`; on each aggregation see `[VinceSignalAggregator] ASSET: N source(s) → M factors | Sources: ...`. To enable or fix sources, see [plugin-vince/SIGNAL_SOURCES.md](src/plugins/plugin-vince/SIGNAL_SOURCES.md).

## Star feature: self-improving paper trading bot

The most novel piece in this repo is the **paper trading bot that gets better over time** using machine learning:

1. **Paper trading** — Runs simulated perpetuals (Hyperliquid-style) with real signals, risk limits, session filters, and goal tracking ($/day, $/month).
2. **Feature store** — Records 40+ features per trading decision (market, session, signal, regime, news, execution, outcome) to JSONL and optionally Supabase for ML.
3. **Online adaptation** — Thompson Sampling (weight bandit) and signal-similarity lookup adjust behavior from live outcomes; a Bayesian parameter tuner refines thresholds.
4. **Offline ML** — A Python script (`plugin-vince/scripts/train_models.py`) trains XGBoost models (signal quality, position sizing, TP/SL) and exports to ONNX.
5. **ONNX at runtime** — The bot loads ONNX models for signal-quality and sizing decisions, with rule-based fallbacks when models aren’t trained yet.

**Closed loop:** paper trades → feature collection → Python training → ONNX deployment → online bandit/tuner/similarity. Day 1 it runs on rules; over time it leans on ML as enough data accumulates.

Implementation: [src/plugins/plugin-vince/](src/plugins/plugin-vince/) (feature store, weight bandit, signal similarity, ML inference, parameter tuner; actions: bot status, pause, trade, why-trade).

## Features

- **VINCE agent** — Unified orchestrator across 7 areas: OPTIONS, PERPS, MEMETICS, AIRDROPS, DEFI, LIFESTYLE, ART
- **Self-improving paper trading bot** — ML pipeline above; no live execution, suggest and inform only
- **Teammate context** — USER/SOUL/TOOLS/MEMORY files loaded every session so the agent behaves like a teammate, not a generic chatbot
- **Data sources** — Deribit, CoinGlass, Binance, DexScreener, Meteora, Nansen, Sanbase, OpenSea (with fallbacks when APIs are absent)
- **ElizaOS** — Character-driven, plugin-based; Postgres/Supabase for production

**Day reports:** We’re really stoked about the daily briefs. The **GM**, **OPTIONS**, and **PERPS** day reports are pure gold—they pull from all our signal sources and the quality is so good.

### Action status (honest take)

- **OPTIONS & PERPS day reports** — Pure gold; core value.
- **NEWS** — Great when fresh, but heavily dependent on [MandoMinutes](https://www.mandominutes.com/Latest). When that source isn't updated, data gets stale. A big future feature: our own news plugin and day report (likely needs ~$100/mo X API).
- **MEMES** — Not yet where we want it; not top priority. UI quick fix: bold styling looks messy and should be toned down.
- **TREADFI** — We're betting on farming all major perps DEXes and love their market-making bots. Figuring out the right settings to actually make money is complex; it's a core feature we want to keep if we can be profitable beyond the airdrop era.
- **LIFESTYLE** — Life is more than trading. The curated local hotel/restaurant/spa/health/fitness knowledge is worth more focus and improves IRL UX; we may migrate this to a dedicated CLAWDBOT.
- **NFTs** — Few care anymore (maybe 1K true fans on CT); we've spent a decade curating digital art and still value spotting gems on the floor (thin floor) from iconic collections. Solid base MVP; needs more work.
- **INTEL** — Solid output but feels redundant with what GM / Aloha already cover.
- **BOT** — Not good enough yet: not easy on the eyes and not consistent with the writing style of our other actions.
- **UPLOAD / knowledge folder** — We believe the knowledge base will become one of the most important parts of VINCE. Improving how we upload research (YouTube, long PDFs, long articles → RAG) deserves a lot of attention; it may also be a fit for a dedicated ClawdBot (Moltbot).

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

## Production with Supabase (Postgres)

Current prod (Eliza Cloud) runs and works; it still uses **PGLite** (no `POSTGRES_URL`). Migrating to Supabase Postgres is next so ElizaOS tables and the feature store (`plugin_vince.paper_bot_features`) share one DB. See [FEATURE-STORE.md](FEATURE-STORE.md).

We use **Postgres/Supabase** for production so the app and deploy use the same DB.

1. **In `.env`** set `POSTGRES_URL` to the **direct** Supabase connection (not the pooler):
   - Use **port 5432** (direct), not 6543 (pooler). Migrations fail on the pooler.
   - Add `?sslmode=verify-full` to avoid SSL warnings.
   - Example:  
     `POSTGRES_URL=postgresql://postgres:YOUR_PASSWORD@db.XXX.supabase.co:5432/postgres?sslmode=verify-full`
2. **Run locally:** `bun start` — the start script runs the migration bootstrap (creates `migrations` schema) when `POSTGRES_URL` is set, then starts the app.
3. **Deploy:** Use the same `POSTGRES_URL` (direct 5432) in your deploy env. See [DEPLOY.md](DEPLOY.md).

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
| [DEPLOY.md](DEPLOY.md) | Deploy to Eliza Cloud (PGLite vs Postgres), env vars, troubleshooting |
| [CLAUDE.md](CLAUDE.md) | ElizaOS project dev guide (character, plugins, env, testing) |
| [TREASURY.md](TREASURY.md) | Cost coverage and profitability mandate |
| [src/plugins/plugin-vince/README.md](src/plugins/plugin-vince/README.md) | Plugin overview; [WHAT.md](src/plugins/plugin-vince/WHAT.md) / [WHY.md](src/plugins/plugin-vince/WHY.md) / [HOW.md](src/plugins/plugin-vince/HOW.md) / [CLAUDE.md](src/plugins/plugin-vince/CLAUDE.md) for purpose, framework rationale, and development |

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
