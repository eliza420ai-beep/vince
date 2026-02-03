# Deploy to Eliza Cloud

```
  ██╗   ██╗██╗███╗   ██╗ ██████╗███████╗
  ██║   ██║██║████╗  ██║██╔════╝██╔════╝
  ██║   ██║██║██╔██╗ ██║██║     █████╗  
  ╚██╗ ██╔╝██║██║╚██╗██║██║     ██╔══╝  
   ╚████╔╝ ██║██║ ╚████║╚██████╗███████╗
    ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
```

So you don’t burn $15 on a typo again.

**Docs:** [Deploy to Eliza Cloud](https://docs.elizaos.ai/guides/deploy-to-cloud) — `elizaos deploy --project-name <name>` with multiple `--env "KEY=VALUE"` for secrets. We deploy with **PGLite** by default (no `POSTGRES_URL`); add **`POSTGRES_URL`** only if you want Postgres.

**Purpose:** Deploy the VINCE app to Eliza Cloud: minimal vs full env, PGLite vs Postgres, troubleshooting. Feature-store: [FEATURE-STORE.md](FEATURE-STORE.md). Overview: [README.md](README.md).

**Quick reference:** PGLite (recommended) = leave `POSTGRES_URL` unset. Postgres = set `POSTGRES_URL` (port 5432, `?sslmode=verify-full`). Minimal deploy = `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` only; full = add API keys and optional `SUPABASE_SERVICE_ROLE_KEY`.

**Deploy with PGLite (recommended):** Leave `POSTGRES_URL` unset. The app uses embedded **PGLite**. **Paper trades** are always stored in **JSONL** under `.elizadb/vince-paper-bot/features/` (and in the PGLite table `plugin_vince.paper_bot_features`). No external DB required.

**Minimal (required only — PGLite, no Postgres):**

```bash
elizaos deploy --project-name vince2 \
  --env "ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' .env | cut -d= -f2-)" \
  --env "OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d= -f2-)"
```

**Full (PGLite + optional Supabase for feature store; no OpenRouter):**

```bash
elizaos deploy --project-name vince2 \
  --env "ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' .env | cut -d= -f2-)" \
  --env "OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d= -f2-)" \
  --env "SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d= -f2-)" \
  --env "COINGECKO_API_KEY=$(grep '^COINGECKO_API_KEY=' .env | cut -d= -f2-)" \
  --env "DISABLE_COINGECKO_MCP=$(grep '^DISABLE_COINGECKO_MCP=' .env | cut -d= -f2-)" \
  --env "COINGLASS_API_KEY=$(grep '^COINGLASS_API_KEY=' .env | cut -d= -f2-)" \
  --env "OPENSEA_API_KEY=$(grep '^OPENSEA_API_KEY=' .env | cut -d= -f2-)" \
  --env "NFT_API_RATE_LIMIT=$(grep '^NFT_API_RATE_LIMIT=' .env | cut -d= -f2-)" \
  --env "NFT_CACHE_TTL=$(grep '^NFT_CACHE_TTL=' .env | cut -d= -f2-)" \
  --env "XAI_API_KEY=$(grep '^XAI_API_KEY=' .env | cut -d= -f2-)" \
  --env "XAI_MODEL=$(grep '^XAI_MODEL=' .env | cut -d= -f2-)" \
  --env "XAI_MONTHLY_TOKEN_BUDGET=$(grep '^XAI_MONTHLY_TOKEN_BUDGET=' .env | cut -d= -f2-)" \
  --env "XAI_DAILY_TOKEN_BUDGET=$(grep '^XAI_DAILY_TOKEN_BUDGET=' .env | cut -d= -f2-)" \
  --env "XAI_CACHE_TTL_MS=$(grep '^XAI_CACHE_TTL_MS=' .env | cut -d= -f2-)" \
  --env "SANTIMENT_API_KEY=$(grep '^SANTIMENT_API_KEY=' .env | cut -d= -f2-)" \
  --env "DISABLE_DEFILLAMA_MCP=$(grep '^DISABLE_DEFILLAMA_MCP=' .env | cut -d= -f2-)" \
  --env "NANSEN_API_KEY=$(grep '^NANSEN_API_KEY=' .env | cut -d= -f2-)" \
  --env "MESSARI_API_KEY=$(grep '^MESSARI_API_KEY=' .env | cut -d= -f2-)" \
  --env "DUNE_API_KEY=$(grep '^DUNE_API_KEY=' .env | cut -d= -f2-)" \
  --env "TAVILY_API_KEY=$(grep '^TAVILY_API_KEY=' .env | cut -d= -f2-)" \
  --env "COINDESK_API_KEY=$(grep '^COINDESK_API_KEY=' .env | cut -d= -f2-)" \
  --env "COINCAP_API_KEY=$(grep '^COINCAP_API_KEY=' .env | cut -d= -f2-)" \
  --env "DEXSCREENER_API_URL=$(grep '^DEXSCREENER_API_URL=' .env | cut -d= -f2-)" \
  --env "DEXSCREENER_RATE_LIMIT_DELAY=$(grep '^DEXSCREENER_RATE_LIMIT_DELAY=' .env | cut -d= -f2-)" \
  --env "LOAD_DOCS_ON_STARTUP=$(grep '^LOAD_DOCS_ON_STARTUP=' .env | cut -d= -f2-)" \
  --env "KNOWLEDGE_PATH=$(grep '^KNOWLEDGE_PATH=' .env | cut -d= -f2-)" \
  --env "CTX_KNOWLEDGE_ENABLED=$(grep '^CTX_KNOWLEDGE_ENABLED=' .env | cut -d= -f2-)" \
  --env "TEXT_EMBEDDING_MODEL=$(grep '^TEXT_EMBEDDING_MODEL=' .env | cut -d= -f2-)" \
  --env "TEXT_PROVIDER=$(grep '^TEXT_PROVIDER=' .env | cut -d= -f2-)" \
  --env "TEXT_MODEL=$(grep '^TEXT_MODEL=' .env | cut -d= -f2-)"
```

(Optional: add `--env "SUPABASE_URL=$(grep '^SUPABASE_URL=' .env | cut -d= -f2-)"` if the app doesn’t derive it from `POSTGRES_URL`.)

Use **minimal** to confirm deploy works with **PGLite** (no Postgres). Paper trades are always written to **JSONL** in `.elizadb/vince-paper-bot/features/`; with PGLite they are also written to `plugin_vince.paper_bot_features`. Use **full** to add API keys and optionally **Supabase** for ML (paper-bot records dual-write to Supabase when `SUPABASE_SERVICE_ROLE_KEY` is set — see [FEATURE-STORE.md](FEATURE-STORE.md)). To add more vars from `.env`, add more `--env "KEY=$(grep '^KEY=' .env | cut -d= -f2-)"` lines (no need to pass `ELIZAOS_API_KEY` — that’s for the CLI only). **`SUPABASE_URL`** is optional. Add **`POSTGRES_URL`** only if you want Postgres instead of PGLite.

## The bug you hit

`--env "postgresql://..."` is **wrong** — the container never sees `POSTGRES_URL`.  
It must be:

```bash
--env "POSTGRES_URL=postgresql://..."
```

## Env vars for production

| Env | Required | Used by |
|-----|----------|--------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Claude (VINCE model) |
| `OPENAI_API_KEY` | ✅ Yes | Embeddings (plugin-sql / RAG) |
| `POSTGRES_URL` | No (PGLite default) | Persistent DB (plugin-sql). **Omit** to use **PGLite**; set to `postgresql://...` only if you want Postgres. |

**Paper trades / feature store:** Trades are always stored in **JSONL** under `.elizadb/vince-paper-bot/features/`. With PGLite they are also written to `plugin_vince.paper_bot_features`. No extra env needed for JSONL or PGLite.

### Will trading data persist and be used after a redeploy?

| Setup | After redeploy |
|--------|-----------------|
| **PGLite only** (no `POSTGRES_URL`, no Supabase) | **No.** The container is new; `.elizadb/` and PGLite live on the container filesystem and are lost. New instance = empty features and DB. |
| **Postgres** (`POSTGRES_URL` set, e.g. Supabase) | **Yes.** Data in `plugin_vince.paper_bot_features` (and all ElizaOS tables) lives in your external DB and is reused. |
| **Supabase dual-write** (`SUPABASE_SERVICE_ROLE_KEY` set) | **Yes.** Features are also written to `vince_paper_bot_features` in Supabase; that data persists across redeploys and can be used for training or analysis. |

**Summary:** In the **current state** (PGLite, no Postgres, no Supabase keys), redeploying to Eliza Cloud gives a **fresh container** — trading data is **not** stored or used after redeploy. To keep and use trading data across redeploys, set **`POSTGRES_URL`** (and optionally **`SUPABASE_SERVICE_ROLE_KEY`** for the feature table). ML ONNX models must still be [copied into the repo and committed](#ml-onnx-on-eliza-cloud--will-it-be-active) to be active on Cloud.

Optional (plugin-vince features):

| Env | Used by |
|-----|--------|
| `BIRDEYE_API_KEY` | Top traders / Birdeye |
| `COINGLASS_API_KEY` | Funding / OI (CoinGlass) |
| `SANTIMENT_API_KEY` | Sanbase on-chain |
| `NANSEN_API_KEY` | Nansen smart money |
| `OPENSEA_API_KEY` | NFT floors (OpenSea fallback) |
| `XAI_API_KEY` | X.ai model fallback |

**Supabase (optional — for ML feature store):**

- **`SUPABASE_URL`** — Optional. Add `--env "SUPABASE_URL=..."` only if you want the feature store and the app does not derive it from `POSTGRES_URL` doesn’t work.
- **`SUPABASE_SERVICE_ROLE_KEY`** — Optional. **Only if you want paper trades dual-write to Supabase** for ML (see [FEATURE-STORE.md](FEATURE-STORE.md)). Paper trades are always in **JSONL** and in PGLite when using PGLite; Supabase is an extra sync target. Add to deploy command:

```bash
  --env "SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d= -f2-)"
```

Add `--env "SUPABASE_URL=..."` only if the app doesn’t derive it from `POSTGRES_URL`. Without these, deploy still works; paper trades stay in **JSONL** (and in PGLite when you use PGLite).

You do **not** need Discord, Telegram, Twitter, EVM, Solana, etc. for the current VINCE agent unless you add those plugins.

## ML (ONNX) on Eliza Cloud — will it be active?

**Short answer: no, not on a fresh deploy.** The bot will still run; it will use **rule-based fallbacks** for signal quality, position sizing, and TP/SL instead of ONNX models.

**Why:** ONNX models live under `.elizadb/vince-paper-bot/models/`. The directory `.elizadb/` is in `.gitignore`, so it is **not** in the image when you deploy. The container starts with no `.onnx` files, so the ML Inference Service logs e.g. "Models directory not found" or "Model not found" and loads 0 models. All ML-driven logic then uses the built-in fallbacks (thresholds, rule-based sizing, ATR-based TP/SL).

**What still works on Cloud without ONNX:** Paper trading, signal aggregation, bandit weights, similarity (from in-memory state), improvement report consumption (from `training_metadata.json` if you had it), and all non-ML features. Only the **ONNX inference** (signal quality score, ML position multiplier, ML TP/SL multipliers) is inactive.

**To make ML active on Cloud:**

1. **Train locally** (after you have 90+ closed trades or synthetic data):
   ```bash
   python3 src/plugins/plugin-vince/scripts/train_models.py \
     --data .elizadb/vince-paper-bot/features \
     --output .elizadb/vince-paper-bot/models \
     --min-samples 90
   ```
2. **Copy the built models into the repo** (so the image includes them):
   ```bash
   cp .elizadb/vince-paper-bot/models/signal_quality.onnx    src/plugins/plugin-vince/models/
   cp .elizadb/vince-paper-bot/models/position_sizing.onnx   src/plugins/plugin-vince/models/
   cp .elizadb/vince-paper-bot/models/tp_optimizer.onnx       src/plugins/plugin-vince/models/
   cp .elizadb/vince-paper-bot/models/sl_optimizer.onnx       src/plugins/plugin-vince/models/
   cp .elizadb/vince-paper-bot/models/training_metadata.json src/plugins/plugin-vince/models/
   git add src/plugins/plugin-vince/models/*.onnx src/plugins/plugin-vince/models/training_metadata.json
   git commit -m "chore: ship ONNX models for Cloud ML"
   ```
3. **Deploy.** The Dockerfile copies `src/plugins/plugin-vince/models/` into `.elizadb/vince-paper-bot/models/` at build time, so the container will have the ONNX files and ML will be active. See `src/plugins/plugin-vince/models/README.md` for details.

## One-time setup

1. In `.env` set at least:
   - `ANTHROPIC_API_KEY=...`
   - `OPENAI_API_KEY=...`
2. **PGLite (default):** Leave `POSTGRES_URL` unset or empty. The app uses embedded PGLite. **Paper trades** are stored in **JSONL** under `.elizadb/vince-paper-bot/features/` and in the PGLite table `plugin_vince.paper_bot_features`. No external DB required.
3. **Optional Postgres:** If you want Postgres instead, set `POSTGRES_URL=postgresql://user:password@host:5432/dbname?sslmode=verify-full`. The app’s `bun start` runs the migration bootstrap when `POSTGRES_URL` is set, so migrations work locally and in prod. If you still see “CREATE SCHEMA IF NOT EXISTS migrations” failed, see [Supabase: migration schema failed](#supabase-migration-schema-failed) below.
4. **Optional Supabase:** For ML, add `SUPABASE_SERVICE_ROLE_KEY` (and optionally `SUPABASE_URL`) so paper trades are also synced to Supabase; see [FEATURE-STORE.md](FEATURE-STORE.md). **JSONL** and PGLite storage do not require Supabase.

### Supabase / Postgres: migration schema failed

If you see:

```text
Failed to run database migrations (error=Failed query: CREATE SCHEMA IF NOT EXISTS migrations
```

Supabase can block schema creation when the app connects. Fix it once:

1. **Use direct connection** in `.env`: Port **5432** (direct), not 6543 (pooler). Add `?sslmode=verify-full`:  
   `POSTGRES_URL=postgresql://postgres:PASSWORD@db.XXX.supabase.co:5432/postgres?sslmode=verify-full`
2. **Run `bun start`** — the start script runs the migration bootstrap (creates `migrations` schema) when `POSTGRES_URL` is set. If that still fails, pre-create the schema: open **Supabase Dashboard → SQL Editor**, run **`scripts/supabase-migrations-bootstrap.sql`**, then run `bun start` again.

For **PGLite-only** deploy, leave `POSTGRES_URL` unset; no migration bootstrap is needed.

## Deploy (recommended)

```bash
bun run deploy:cloud
```

This runs `scripts/deploy-cloud.sh`, which reads `.env` and passes `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and optionally **`POSTGRES_URL`** (if set) to `elizaos deploy`. For **PGLite** deploy, ensure `POSTGRES_URL` is not set in `.env` (or that the script only passes it when present). Paper trades are stored in **JSONL** and in PGLite.

## Deploy (manual)

**PGLite (no Postgres):**

```bash
elizaos deploy --project-name vince \
  --env "ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' .env | cut -d= -f2-)" \
  --env "OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d= -f2-)"
```

**With Postgres:** add `--env "POSTGRES_URL=$(grep '^POSTGRES_URL=' .env | cut -d= -f2-)"`. The value must be **`POSTGRES_URL=postgresql://...`**, not just the URL.

## Stack already exists (500: Stack [...] already exists)

If deploy fails with:

```text
API request failed (500): Stack [elizaos-44feb837-dd61-4549-a8b6-274462e1bbe8-vince] already exists
```

the CloudFormation stack exists on Eliza Cloud/AWS but the CLI tried to **create** again (e.g. no container record was found for “vince”). You can fix it in one of these ways.

### Option A: Deploy with a new project name (fastest)

Use a different project name so a **new** stack is created (the old one stays until you or support delete it):

```bash
# One-off deploy with new name
elizaos deploy --project-name vince2 \
  --env "ANTHROPIC_API_KEY=..." \
  --env "OPENAI_API_KEY=..." \
  --env "POSTGRES_URL=..."
```

Or with the script: temporarily change `vince` to `vince2` in `scripts/deploy-cloud.sh` (both the `--project-name` and the echo URL), run `bun run deploy:cloud`, then change back if you want to keep using “vince” later after the old stack is removed.

### Option B: Delete the stack in AWS (if you have access)

If your Eliza Cloud account is linked to AWS or you have access to the correct account:

1. Open **AWS Console → CloudFormation**.
2. Find the stack **`elizaos-44feb837-dd61-4549-a8b6-274462e1bbe8-vince`**.
3. Delete the stack (and retain or delete resources as you prefer).
4. Run deploy again with `--project-name vince`.

### Option C: Delete via CLI (only if the container shows in list)

If the container still exists in the API, you can delete it by **container ID**:

```bash
elizaos containers list
# If you see a container for vince, note its id, then:
elizaos containers delete --container-id <id>
```

If `containers list` shows “No container found” for vince, this option won’t work; use A or B (or ask Eliza Cloud support to remove the orphan stack).

---

## After deploy

- URL: `https://44feb837-vince.containers.elizacloud.ai`
- Logs: `elizaos containers logs --project-name vince --tail 100`
- Health: `curl -s https://44feb837-vince.containers.elizacloud.ai/api/server/health | jq .`

---

## Deployment timed out (44 min)

If you see **"Deployment timed out after 44 minutes"**, the stack is waiting for the container to become healthy and it never does. Common causes:

### 1. **Verify the image locally first**

Run the same image that ECS runs. If it fails or never returns 200 on health, fix that before redeploying.

```bash
# Build
docker build -t vince:local .

# Run with minimal env (use your real POSTGRES_URL)
docker run --rm -e ANTHROPIC_API_KEY=sk-xxx -e OPENAI_API_KEY=sk-xxx -e POSTGRES_URL="postgresql://..." -p 3000:3000 vince:local
```

In another terminal:

```bash
# Lightweight check (server README: always 200)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/healthz

# Or full health (may 503 until agents ready)
curl -s http://localhost:3000/api/server/health | jq .
```

If `curl` never gets 200, the app is either not listening yet (very slow startup) or crashing. Check the container logs in the first terminal.

### 2. **Check container logs in the cloud**

See why the container might not be passing health checks:

```bash
elizaos containers logs --project-name vince --tail 200
```

Look for:

- **DB errors** – Only if you set `POSTGRES_URL`: wrong URL or DB unreachable (e.g. network/SSL from ECS). With PGLite (no `POSTGRES_URL`) the embedded DB is used and paper trades go to **JSONL** + PGLite table.
- **OOM / crash** – process restarts; may need more memory in the task definition.
- **Never “listening”** – server only starts after all plugins/agents init; plugin-vince starts many services (Meteora, Deribit, NFT, etc.), so startup can be slow on a small container.

### 3. **Health check path**

Eliza server exposes:

- `GET /healthz` – lightweight, returns 200 when the server is up.
- `GET /health` or `GET /api/server/health` – full health (can 503 until agents ready).

If the load balancer is configured to use `/api/server/health` and your app returns 503 until agents are ready, the deployment can time out. Prefer **`/healthz`** for “is the process up?” so deployment succeeds even while agents are still initializing.

### 4. **Slow startup (VINCE + plugin-vince)**

VINCE loads many services (DB, Meteora, Deribit, DexScreener, NFT floor, etc.). On a small ECS task (e.g. 512 MB / 0.25 vCPU), startup can take several minutes. Options:

- **Increase task CPU/memory** in the Eliza Cloud / ECS task definition so init finishes sooner.
- **Increase deployment timeout** in the deploy/CloudFormation config if the app does eventually become healthy but after 45+ minutes (not ideal; better to fix startup or resources).
- **Confirm DB is reachable** – Only if using Postgres: wrong `POSTGRES_URL` or unreachable DB can hang plugin-sql init. With PGLite (no `POSTGRES_URL`) there is no external DB; paper trades are stored in JSONL and in the PGLite table.

---

## Related docs

- [README.md](README.md) — Project overview, getting started, configuration
- [FEATURE-STORE.md](FEATURE-STORE.md) — Paper bot feature storage (JSONL, PGLite/Postgres, Supabase)
- [CLAUDE.md](CLAUDE.md) — ElizaOS dev guide for this project

### 5. **CLI troubleshooting (from the error message)**

- `elizaos containers list` – see container status.
- `elizaos containers logs --project-name vince` – view logs.
- CloudFormation: https://console.aws.amazon.com/cloudformation – see stack events and which resource is stuck.
