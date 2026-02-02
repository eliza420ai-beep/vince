# VINCE Paper Bot Feature Store (ML)

Feature records from vince-paper-bot trades are used for ML training (e.g. 500+ records for your script). They are stored in two places:

| Storage | When used | Purpose |
|--------|------------|---------|
| **Local JSONL** | Always | `.elizadb/vince-paper-bot/features/features_*.jsonl` – backup, offline, export |
| **Supabase** | Optional (when keys set) | Table `vince_paper_bot_features` – query 500+ in one place for ML |

## Current behavior

- **Local**: Every flush (e.g. every 1 min) appends records to `features_YYYY-MM-DD_<ts>.jsonl` under `.elizadb/vince-paper-bot/features/`.
- **Supabase**: **Only if** `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`) is set, the same records are **also** upserted into Supabase so you can run your ML script against 500+ rows in one query.

Without Supabase keys, **Supabase does not record these trades** – only the local JSONL files do.

## Enable Supabase recording (recommended for ML)

1. **Create the table** in Supabase (SQL Editor):

```sql
-- Run once in Supabase Dashboard → SQL Editor
create table if not exists public.vince_paper_bot_features (
  id text primary key,
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists idx_vince_paper_bot_features_created_at
  on public.vince_paper_bot_features (created_at);
create index if not exists idx_vince_paper_bot_features_payload_asset
  on public.vince_paper_bot_features using gin ((payload->'asset'));
```

2. **Set env** (in `.env` or deploy):

- `SUPABASE_SERVICE_ROLE_KEY` = your project’s **Service role** key (Dashboard → Settings → API).  
  Or `SUPABASE_ANON_KEY` if you prefer (ensure RLS allows insert if you use anon).
- `SUPABASE_URL` is optional if you use Supabase Postgres: it’s derived from `POSTGRES_URL` (e.g. `postgresql://...@db.XXX.supabase.co:5432/...` → `https://XXX.supabase.co`). Set it only if you use a different URL.

3. **Restart** the app. On startup you should see:

   `[VinceFeatureStore] Supabase dual-write enabled for ML (table: vince_paper_bot_features)`

4. **Verify**: After some paper trades, in Supabase Table Editor open `vince_paper_bot_features` – you should see rows with `id`, `created_at`, and `payload` (full feature record).

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
