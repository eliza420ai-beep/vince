# Deploy to Eliza Cloud

So you don’t burn $15 on a typo again.

**Docs:** [Deploy to Eliza Cloud](https://docs.elizaos.ai/guides/deploy-to-cloud) — `elizaos deploy --project-name <name>` with multiple `--env "KEY=VALUE"` for secrets. Official example uses `DATABASE_URL`; for ElizaOS use **`POSTGRES_URL`** (same value, correct variable name for the runtime).

**Minimal (required only):**

```bash
elizaos deploy --project-name vince2 \
  --env "ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' .env | cut -d= -f2-)" \
  --env "OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d= -f2-)" \
  --env "POSTGRES_URL=$(grep '^POSTGRES_URL=' .env | cut -d= -f2-)"
```

**Full (matches our .env: API keys + feature store; no OpenRouter):**

```bash
elizaos deploy --project-name vince2 \
  --env "ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' .env | cut -d= -f2-)" \
  --env "OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d= -f2-)" \
  --env "POSTGRES_URL=$(grep '^POSTGRES_URL=' .env | cut -d= -f2-)" \
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

Use **minimal** to confirm deploy works; use **full** so production has the same API keys as local and the **feature store** (paper-bot records upserted to Supabase for ML — see [FEATURE-STORE.md](FEATURE-STORE.md)). To add more vars from `.env`, add more `--env "KEY=$(grep '^KEY=' .env | cut -d= -f2-)"` lines (no need to pass `ELIZAOS_API_KEY` — that’s for the CLI only). **`SUPABASE_URL`** is optional (app derives it from `POSTGRES_URL`). **Add `SUPABASE_SERVICE_ROLE_KEY`** (and optionally `SUPABASE_URL`) to the deploy command only if you want the [feature store](FEATURE-STORE.md) in production.

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
| `POSTGRES_URL` | ✅ Yes | Persistent DB (plugin-sql); **must** be `POSTGRES_URL=postgresql://...` |

Optional (plugin-vince features):

| Env | Used by |
|-----|--------|
| `BIRDEYE_API_KEY` | Top traders / Birdeye |
| `COINGLASS_API_KEY` | Funding / OI (CoinGlass) |
| `SANTIMENT_API_KEY` | Sanbase on-chain |
| `NANSEN_API_KEY` | Nansen smart money |
| `OPENSEA_API_KEY` | NFT floors (OpenSea fallback) |
| `XAI_API_KEY` | X.ai model fallback |

**Supabase URL and feature store (important for deploy):**

- **`SUPABASE_URL`** — Optional. When `POSTGRES_URL` points to Supabase, the app derives it (e.g. `db.XXX.supabase.co` → `https://XXX.supabase.co`). Add `--env "SUPABASE_URL=..."` only if you need the feature store and derivation doesn’t work.
- **`SUPABASE_SERVICE_ROLE_KEY`** — **Required only if you want the feature store in production.** See [FEATURE-STORE.md](FEATURE-STORE.md). Then add it to the deploy command:

```bash
  --env "SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d= -f2-)"
```

Optionally add `--env "SUPABASE_URL=..."` if the app doesn’t derive it from `POSTGRES_URL`. Without these, deploy still works; conversation/memory use `POSTGRES_URL` only.

You do **not** need Discord, Telegram, Twitter, EVM, Solana, etc. for the current VINCE agent unless you add those plugins.

## One-time setup

1. In `.env` set at least:
   - `ANTHROPIC_API_KEY=...`
   - `OPENAI_API_KEY=...`
   - `POSTGRES_URL=postgresql://user:password@host:5432/dbname?sslmode=require`
2. **If using Supabase**: run the migration bootstrap once (see [Supabase: migration schema failed](#supabase-migration-schema-failed) below).
3. Run deploy **once** with the script (so all three are passed correctly).

### Supabase: migration schema failed

If you see:

```text
Failed to run database migrations (error=Failed query: CREATE SCHEMA IF NOT EXISTS migrations
```

Supabase can block schema creation when the app connects. Fix it once:

1. **Use SSL and direct connection** in `.env`:
   - Port **5432** (direct), not 6543 (pooler).
   - Add `?sslmode=require` to the URL:  
   `POSTGRES_URL=postgresql://postgres:PASSWORD@db.XXX.supabase.co:5432/postgres?sslmode=require`
2. **Pre-create the migrations schema** (once):
   - Open **Supabase Dashboard → SQL Editor**.
   - Run the **entire** **`scripts/supabase-migrations-bootstrap.sql`** (creates `migrations` schema and tables).
3. Restart the app (`elizaos start` or `bun start`). Migrations will see the schema/tables and proceed.

If you prefer to run without Supabase for now, leave `POSTGRES_URL` unset (or empty) in `.env`; the app will use local PGLite.

## Deploy (recommended)

```bash
bun run deploy:cloud
```

This runs `scripts/deploy-cloud.sh`, which reads `.env` and passes `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and **`POSTGRES_URL`** (with the variable name) to `elizaos deploy`. No copy-paste of secrets.

## Deploy (manual)

If you prefer to run the CLI yourself:

```bash
elizaos deploy --project-name vince \
  --env "ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' .env | cut -d= -f2-)" \
  --env "OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d= -f2-)" \
  --env "POSTGRES_URL=$(grep '^POSTGRES_URL=' .env | cut -d= -f2-)"
```

Important: the third `--env` must be **`POSTGRES_URL=...`**, not just the URL.

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

- **DB errors** – `POSTGRES_URL` wrong or DB unreachable (e.g. network/SSL from ECS).
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
- **Confirm DB is reachable** – wrong `POSTGRES_URL` or unreachable DB (e.g. not in same VPC or no SSL) will hang or fail during plugin-sql init/migrations and the server may never listen.

### 5. **CLI troubleshooting (from the error message)**

- `elizaos containers list` – see container status.
- `elizaos containers logs --project-name vince` – view logs.
- CloudFormation: https://console.aws.amazon.com/cloudformation – see stack events and which resource is stuck.
