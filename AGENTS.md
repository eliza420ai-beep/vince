# AGENTS.md

## Cursor Cloud specific instructions

### Overview

VINCE is a multi-agent ElizaOS project with 10 AI agents (VINCE, Eliza, ECHO, Oracle, Solus, Otaku, Kelly, Sentinel, Naval, Clawterm). Package manager is **Bun** (lockfile: `bun.lock`). Runtime requires **Node.js 23.x**. See `CLAUDE.md` for full project guide, `README.md` for quick start, and `docs/CONFIGURATION.md` for env var reference.

### Key commands

Standard commands are documented in `package.json` scripts and `CLAUDE.md`. Quick reference:

- **Install deps:** `bun install` (postinstall auto-builds `plugin-personality` and `plugin-discovery`)
- **Build api-client** (needed before type-check): `npx tsc -p packages/api-client` then `bun install` again to pick up `dist/`
- **Type-check:** `bun run type-check`
- **Lint/format:** `bun run format:check` (Prettier)
- **Tests:** `bun test` (many tests skip gracefully when API keys are absent)
- **Build backend:** `bun run build`
- **Build frontend:** `bun run build:frontend`
- **Dev server:** `bun run dev` or `bun start` (starts backend on :3000 and Vite on :5173)

### Non-obvious gotchas

1. **api-client must be built before type-check passes.** The `@elizaos/api-client` package (`packages/api-client`) is a `file:` dependency. Its `dist/` directory must exist for TypeScript to resolve it. Run `npx tsc -p packages/api-client && bun install` to build it and re-link into `node_modules`. The root `build:api-client` script (`tsc -p packages/api-client`) handles the build.

2. **LLM API keys required for chat responses.** The backend starts and serves the UI without API keys, but agents cannot respond to messages without at least `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. The Leaderboard and market data features work without keys (they pull from free APIs). Set keys in `.env`.

3. **PGLite is the default database.** No external database setup needed. Data is stored in `.eliza/.elizadb` by default. Set `POSTGRES_URL` for production Postgres.

4. **Node.js 23.x is required.** The Dockerfile pins `node:23.3.0-slim`. Use `nvm install 23` if using nvm.

5. **Bun is the required package manager.** Do not use npm/yarn/pnpm. Install via `curl -fsSL https://bun.sh/install | bash`.

6. **Some test failures are expected without API keys.** Tests that require `OPENAI_API_KEY`, `X_BEARER_TOKEN`, or network access to specific services will fail or skip. Core unit tests pass without any keys.

7. **The `plugin-personality` build in postinstall may warn but is non-blocking.** It runs `cd node_modules/@elizaos/plugin-personality && bun run build || true`.

8. **Production API gating** uses `@elizaos/server`: set `ELIZA_SERVER_AUTH_TOKEN` to require `X-API-KEY` on `/api` and Socket.IO. Use **`/healthz`** or **`/health`** for load-balancer probes (not `/api/server/health`, which is gated). See [docs/API_SECURITY_AND_PRODUCTION.md](docs/API_SECURITY_AND_PRODUCTION.md) and `scripts/verify-api-gating.sh`.
