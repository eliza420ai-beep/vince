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

**Docs:** [Deploy to Eliza Cloud](https://docs.elizaos.ai/guides/deploy-to-cloud) — `elizaos deploy --project-name <name>` with multiple `--env "KEY=VALUE"` for secrets. We deploy with **PGLite** by default (no `POSTGRES_URL`); add **`POSTGRES_URL`** only if you want Postgres. For a full migration checklist, see [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md).

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

## Bot status / agent replies not reaching the UI (local)

If you send **"bot status"** (or any message) and the UI stays on "Analyzing your request" and never shows the agent’s reply, check the **terminal** for these lines at **startup**:

```text
Error      [SERVICE:MESSAGE-BUS] Error fetching agent servers (error=fetch failed)
Error      [SERVICE:MESSAGE-BUS] Error fetching channels from server (messageServerId=..., error=fetch failed)
```

**What they mean:** The MESSAGE-BUS (from `@elizaos/plugin-elizacloud` or the core server) is trying to fetch the list of agent servers and channels so it can route the agent’s reply back to the right place. That fetch is failing, so when the agent produces a reply, the bus has no valid routing (it falls back to `messageServerId=00000000-0000-0000-0000-000000000000`) and the reply never reaches the chat UI.

**What to do:**

1. **Local run with Eliza Cloud plugin:** You have `ELIZAOS_API_KEY` set, so the plugin tries to talk to Eliza Cloud. The "fetch failed" usually means the request to the central API (e.g. `api.eliza.how` or the URL the plugin uses) failed — network, DNS, or wrong/base URL. Ensure the machine can reach the API and that the key is valid for that environment.
2. **Fully local (no Cloud):** If you intend to run only against `http://localhost:3000` with no Cloud, the message bus may still be trying to call a central URL. Check ElizaOS docs or env vars (e.g. a base URL or “use local” flag) so the bus uses the local server for server/channel listing instead of a remote API.
3. **After fixing:** Restart the app (`bun start`), open the chat at `http://localhost:5173`, and try "bot status" again. You should then see the reply in the UI (and no "Error sending response to central server" in the log if the bus can now route correctly).

The agent **is** running (you’ll see e.g. "Received message from central bus", "Discovered new channel", and paper trading logs); the break is in **sending the response** back to the client because the bus never got a valid server/channel list.

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
- **`SUPABASE_SERVICE_ROLE_KEY`** — When set, paper trades are dual-written to Supabase (`vince_paper_bot_features`). Create the table once: run **`scripts/supabase-feature-store-bootstrap.sql`** in Supabase Dashboard → SQL Editor (see [FEATURE-STORE.md](FEATURE-STORE.md)). **`bun run deploy:cloud`** passes it from `.env`; or add to deploy command:

```bash
  --env "SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d= -f2-)"
```

Add `--env "SUPABASE_URL=..."` only if the app doesn’t derive it from `POSTGRES_URL`; set it if needed. When using **`bun run deploy:cloud`**, the script passes both Supabase vars from `.env` automatically. Without Supabase keys, paper trades stay in **JSONL** (and in PGLite when you use PGLite).

You do **not** need Discord, Telegram, Twitter, EVM, Solana, etc. for the current VINCE agent unless you add those plugins.

## ML (ONNX) on Eliza Cloud — will it be active?

**Short answer: no, not on a fresh deploy.** The bot will still run; it will use **rule-based fallbacks** for signal quality, position sizing, and TP/SL instead of ONNX models.

**Why:** ONNX models live under `.elizadb/vince-paper-bot/models/`. The directory `.elizadb/` is in `.gitignore`, so it is **not** in the image when you deploy. The container starts with no `.onnx` files, so the ML Inference Service logs e.g. "Models directory not found" or "Model not found" and loads 0 models. All ML-driven logic then uses the built-in fallbacks (thresholds, rule-based sizing, ATR-based TP/SL).

**What still works on Cloud without ONNX:** Paper trading, signal aggregation, bandit weights, similarity (from in-memory state), improvement report consumption (from `training_metadata.json` if you had it), and all non-ML features. Only the **ONNX inference** (signal quality score, ML position multiplier, ML TP/SL multipliers) is inactive.

**ML training on Eliza Cloud (no extra redeploy):**

With **Supabase** configured (`SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL`), training can run **in the container** and models **persist across redeploys**:

1. **Create a Storage bucket** in Supabase (one-time) — see [One-time: Create the `vince-ml-models` bucket](#one-time-create-the-vince-ml-models-bucket) below.
2. **Deploy** with Supabase env vars set (e.g. `bun run deploy:cloud`). The image includes Python and the training script deps (`xgboost`, `onnxmltools`, etc.).
3. The bot collects features (dual-write to Supabase table `vince_paper_bot_features`). When there are **90+ complete trades**, the **TRAIN_ONNX_WHEN_READY** task runs the Python training script in the container, then **uploads** the resulting `.onnx` and `training_metadata.json` to the `vince-ml-models` bucket and **reloads** the ML service. No redeploy needed.
4. On a **future redeploy**, the container starts with an empty models dir; the ML service **downloads** the latest models from `vince-ml-models` and loads them. So you get updated ML without baking models into the image or paying to redeploy just for new models.

### One-time: Create the `vince-ml-models` bucket

Do this once in your Supabase project so the app can store and load ML models (no redeploy needed when training runs on Cloud).

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** and select your project.
2. In the left sidebar, click **Storage**.
3. Click **New bucket**.
4. **Name:** `vince-ml-models` (exactly).
5. **Public bucket:** leave **off** (private is fine; the app uses the service role key to read/write).
6. Click **Create bucket**.

No policies or extra settings are required; the service role key has full access. After this, deploy with `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` set so the app can upload models after training and download them on startup.

---

**To make ML active on Cloud (alternative — ship models in repo):**

1. **Train locally** (after you have 90+ closed trades or synthetic data), then copy the built models into the repo and deploy (see `src/plugins/plugin-vince/models/README.md`). The Dockerfile copies `src/plugins/plugin-vince/models/` into the container at build time.

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
