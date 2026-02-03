# VINCE

Unified data intelligence agent for ElizaOS: options, perps, memes, airdrops, DeFi, lifestyle, and NFT floors — with a **self-improving paper trading bot** at the core.

## Star feature: self-improving paper trading bot

The most novel piece in this repo is the **paper trading bot that gets better over time** using machine learning:

1. **Paper trading** — Runs simulated perpetuals (Hyperliquid-style) with real signals, risk limits, session filters, and goal tracking ($/day, $/month).
2. **Feature store** — Records 40+ features per trading decision (market, session, signal, regime, news, execution, outcome) to JSONL and optionally Supabase for ML.
3. **Online adaptation** — Thompson Sampling (weight bandit) and signal-similarity lookup adjust behavior from live outcomes; a Bayesian parameter tuner refines thresholds.
4. **Offline ML** — A Python script (`plugin-vince/scripts/train_models.py`) trains XGBoost models (signal quality, position sizing, TP/SL) and exports to ONNX.
5. **ONNX at runtime** — The bot loads ONNX models for signal-quality and sizing decisions, with rule-based fallbacks when models aren’t trained yet.

**Closed loop:** paper trades → feature collection → Python training → ONNX deployment → online bandit/tuner/similarity. Day 1 it runs on rules; over time it leans on ML as enough data accumulates.

See `src/plugins/plugin-vince/` for the implementation (services: feature store, weight bandit, signal similarity, ML inference, parameter tuner; actions: bot status, pause, trade, why-trade).

## Features

- **VINCE agent** — Unified orchestrator across 7 areas: OPTIONS, PERPS, MEMETICS, AIRDROPS, DEFI, LIFESTYLE, ART
- **Self-improving paper trading bot** — ML pipeline above; no live execution, suggest and inform only
- **Teammate context** — USER/SOUL/TOOLS/MEMORY files loaded every session so the agent behaves like a teammate, not a generic chatbot
- **Data sources** — Deribit, CoinGlass, Binance, DexScreener, Meteora, Nansen, Sanbase, OpenSea (with fallbacks when APIs are absent)
- **ElizaOS** — Character-driven, plugin-based; Postgres/Supabase for production

## Getting Started

```bash
# Install and build
bun install
bun run build

# Copy env and add API keys (see .env.example)
cp .env.example .env

# Start VINCE (development with hot-reload)
elizaos dev

# Or start without hot-reload (uses Postgres when POSTGRES_URL is set)
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

- `src/agents/vince.ts` — VINCE character and agent; knowledge dirs, system prompt, plugins
- `src/plugins/plugin-vince/` — Paper bot, ML services, actions, providers
- `knowledge/teammate/` — USER.md, SOUL.md, TOOLS.md (loaded every session)

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

See [DEPLOY.md](DEPLOY.md) for deploy and bootstrap SQL.

## Deploy

elizaos deploy --project-name vince2 \
  --env "ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' .env | cut -d= -f2-)" \
  --env "OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d= -f2-)" \
  --env "POSTGRES_URL=$(grep '^POSTGRES_URL=' .env | cut -d= -f2-)"
