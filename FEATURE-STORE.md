# VINCE Paper Bot Feature Store (ML)

**Purpose:** Where paper-bot trade features (40+ per decision) are stored and how to use them for ML training. For deploy and env setup, see [DEPLOY.md](DEPLOY.md). For the rest of the repo, see [README.md](README.md).

**When to read:** Setting up Supabase/PGLite for features, running the training script, or syncing existing JSONL to Supabase.

---

## Storage at a glance

Feature records from vince-paper-bot trades are used for ML training (e.g. 90+ for ONNX, 500+ for larger runs). They can be stored in up to three places:

| Storage | When used | Purpose |
|--------|------------|---------|
| **Local JSONL** | Always | `.elizadb/vince-paper-bot/features/features_*.jsonl` – backup, offline, export |
| **PGLite / Postgres** | When using ElizaOS DB | Table `plugin_vince.paper_bot_features` – same DB as agent (PGLite or Postgres) |
| **Supabase** | Optional (when keys set) | Table `vince_paper_bot_features` – query 500+ in one place for ML |

## Current deployment state

- **Prod (Eliza Cloud):** Repo is deployed to production with Eliza Cloud and everything works. The app is still using **PGLite** (no `POSTGRES_URL`), so runtime data and feature-store DB writes use the local PGLite instance in the container.
- **Supabase Postgres:** Not yet in use. When you set `POSTGRES_URL` to your Supabase direct connection (port 5432), ElizaOS will use that for all framework tables (agents, cache, memories, entities, rooms, etc.). Plugin-vince’s runtime migrations will then create **`plugin_vince.paper_bot_features`** in that **same** database, so your jsonl training data lives alongside ElizaOS tables in one Postgres instance.

## ElizaOS tables vs feature store (where to put jsonl training data)

ElizaOS auto-creates tables in the main schema (e.g. `public`): `agents`, `cache`, `memories`, `entities`, `rooms`, `participants`, `relationships`, `tasks`, `worlds`, `embeddings`, `logs`, etc. Those are for **runtime** (conversations, agent memory, embeddings). They are not designed for bulk ML feature rows.

We **do not** store feature-store jsonl rows inside those tables. Instead:

- **Feature store** = one row per trading decision / closed trade, with a **payload** (JSONB) holding the full feature record for ML.
- **Where it lives:** (1) Always: local `.elizadb/vince-paper-bot/features/*.jsonl`. (2) When the app has a DB: table **`plugin_vince.paper_bot_features`** in the **same** DB as ElizaOS (PGLite or Postgres). The plugin registers a Drizzle schema so runtime migrations create the `plugin_vince` schema and this table. (3) Optional: Supabase table **`vince_paper_bot_features`** (in `public`) when `SUPABASE_SERVICE_ROLE_KEY` is set, for querying 500+ rows for ML scripts.

So the “combo” with ElizaOS tables is: **same database, different schema/table**. When you move to Supabase Postgres, set `POSTGRES_URL`; then both framework tables and `plugin_vince.paper_bot_features` live in that one Postgres. We have not found a clean way to store the same jsonl rows inside core ElizaOS tables (e.g. `memories`) without bending their schema; the plugin table is the right place.

## Current behavior

- **Local**: Every flush (e.g. every 1 min) appends records to `features_YYYY-MM-DD_<ts>.jsonl` under `.elizadb/vince-paper-bot/features/`.
- **PGLite/Postgres**: If the runtime has a DB connection (PGLite when no `POSTGRES_URL`, or Postgres when set), the same records are **also** upserted into `plugin_vince.paper_bot_features`. The table is created automatically at startup via plugin-vince’s Drizzle schema (runtime migrations).
- **Supabase**: **Only if** `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`) is set, the same records are **also** upserted into Supabase so you can run your ML script against 500+ rows in one query.

Without Supabase keys, **Supabase does not record these trades** – local JSONL and (when available) PGLite/Postgres do.

## Enable Supabase dual-write (recommended for ML; persists across redeploys)

Features are written to Supabase in addition to local JSONL (and PGLite/Postgres). That data **persists across Eliza Cloud redeploys** and can be used for training and future reads.

### 1. Create the table in Supabase (one-time)

In **Supabase Dashboard → SQL Editor**, run the bootstrap script:

- **Option A:** Open `scripts/supabase-feature-store-bootstrap.sql` in this repo, copy its contents, paste into a new query, and click **Run**.
- **Option B:** Or run the SQL from the script directly; it creates `public.vince_paper_bot_features` and indexes.

### 2. Set env (local and deploy)

In **`.env`** (and for Cloud, the deploy script will pass these when set):

| Variable | Required | Where to get it |
|---------|----------|------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase Dashboard → **Settings → API** → `service_role` (secret). |
| `SUPABASE_URL` | Optional | `https://YOUR_PROJECT_REF.supabase.co`. If you use Supabase Postgres (`POSTGRES_URL=...@db.XXX.supabase.co:5432/...`), the app derives this; set only if you use a different URL. |

Example in `.env`:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://abcdefgh.supabase.co
```

### 3. Restart (local) or redeploy (Cloud)

- **Local:** Restart the app (`bun start`). On startup you should see:  
  `[VinceFeatureStore] Supabase dual-write enabled for ML (table: vince_paper_bot_features)`
- **Eliza Cloud:** Run `bun run deploy:cloud` (or `./scripts/deploy-cloud.sh`). The script reads `.env` and passes `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` when set, so the deployed app will dual-write to Supabase.

### 4. Verify

After some paper trades, open **Supabase Dashboard → Table Editor → `vince_paper_bot_features`**. You should see rows with `id`, `created_at`, and `payload` (full feature record). Use this table for ML training (e.g. 500+ rows) or future reads.

### 5. ML models on Cloud (training without redeploy)

To have **training run on Eliza Cloud** and persist models so you don’t need to redeploy (e.g. $15/redeploy):

1. **Create a Storage bucket** in Supabase (one-time): [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Storage** → **New bucket** → Name: **`vince-ml-models`** → leave **Public bucket** off → **Create bucket**. Full steps: [DEPLOY.md#one-time-create-the-vince-ml-models-bucket](DEPLOY.md#one-time-create-the-vince-ml-models-bucket).
2. Deploy with `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` set. The container has Python + training deps; when there are 90+ complete trades, the **TRAIN_ONNX_WHEN_READY** task runs, uploads `.onnx` and `training_metadata.json` to this bucket, and reloads the ML service.
3. On the next deploy, the app downloads the latest models from `vince-ml-models` so ML stays up to date without baking models into the image. See [DEPLOY.md](DEPLOY.md) § “ML training on Eliza Cloud”.

## Aggressive paper trading ($210 take profit, 10x leverage)

To close at ~$210 profit and use higher leverage (e.g. like Hyperliquid 10x):

- **Env:** In `.env` set `VINCE_PAPER_AGGRESSIVE=true`, then restart.
- **Or in code:** In `src/agents/vince.ts`, set `vince_paper_aggressive: true` in the character `settings` object.

When enabled, the position manager uses `TAKE_PROFIT_USD_AGGRESSIVE` (210) and the risk manager uses `AGGRESSIVE_RISK_LIMITS` (max leverage 10).

## Paper bot: focus on one asset (e.g. BTC only)

To run the paper bot only on BTC (most sources and factors), then add ETH/SOL/HYPE later:

- **Env:** In `.env` set `VINCE_PAPER_ASSETS=BTC`, then restart.
- **Or in code:** In `src/agents/vince.ts`, set `vince_paper_assets: "BTC"` in the character `settings` object.

Use a comma-separated list to add more later, e.g. `VINCE_PAPER_ASSETS=BTC,ETH`.

## When training runs (90+ trades)

- **Automatic**: The plugin registers a recurring task `TRAIN_ONNX_WHEN_READY`. When the feature store has **90+ complete trades** (records with `outcome` and `labels`), the task runs the Python training script (at most once per 24h). Models are written to `.elizadb/vince-paper-bot/models/`; the ML Inference Service loads them on next use.
- **Manual**: From repo root:
  ```bash
  python3 src/plugins/plugin-vince/scripts/train_models.py \
    --data .elizadb/vince-paper-bot/features \
    --output .elizadb/vince-paper-bot/models \
    --min-samples 90
  ```
- **Requires**: Python 3, `pip install -r src/plugins/plugin-vince/scripts/requirements.txt` (xgboost, skl2onnx, onnx, etc.).

## ML script (500+ records)

Query Supabase for training data:

```sql
select payload
from public.vince_paper_bot_features
order by created_at
limit 1000;
```

Or use the Supabase client / REST API and filter by `payload->>'asset'`, `payload->'outcome'` IS NOT NULL, etc., until you have 500+ complete records for training.

## Sync existing local JSONL to Supabase

If you already have many `.jsonl` files locally and want them in Supabase, run a one-off script that:

1. Reads each `features_*.jsonl` under `.elizadb/vince-paper-bot/features/`.
2. Parses each line as JSON and upserts into `vince_paper_bot_features` (id, created_at from timestamp, payload = full object).

Use the same `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as above.

---

## Related docs

- [README.md](README.md) — Project overview and getting started
- [DEPLOY.md](DEPLOY.md) — Deploy env (PGLite, Postgres, Supabase keys)
- [src/plugins/plugin-vince/HOW.md](src/plugins/plugin-vince/HOW.md) — Paper bot dev and ML layer
- [src/plugins/plugin-vince/scripts/README.md](src/plugins/plugin-vince/scripts/README.md) — Training script usage
