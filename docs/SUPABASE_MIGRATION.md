# Supabase Migration — Production-Grade Persistence

Move from PGLite (ephemeral) to Supabase Postgres so all runtime data and paper-bot features persist across redeploys. See [FEATURE-STORE.md](FEATURE-STORE.md) and [DEPLOY.md](DEPLOY.md) for related setup.

---

## What Changes

| Component | Before (PGLite) | After (Supabase Postgres) |
|-----------|------------------|---------------------------|
| ElizaOS tables | In container filesystem | Supabase `public` schema |
| plugin_vince.paper_bot_features | Lost on redeploy | Same Supabase DB |
| Memories, agents, rooms, cache | Ephemeral | Persistent |
| JSONL backup | Always kept locally | Still kept (dual-write) |

---

## Migration Checklist

### 1. Supabase project

- [ ] Create project at [Supabase Dashboard](https://supabase.com/dashboard) (or use existing).
- [ ] Note **Project URL** (Settings → API → Project URL) and **Service Role Key** (Settings → API → `service_role`).
- [ ] Note **Database** connection string (Settings → Database → Connection string → **Direct**, port 5432). Use format:
  ```
  postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
  ```
  Or **Direct** (recommended for migrations):
  ```
  postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require
  ```

### 2. Run bootstrap SQL (one-time)

In **Supabase Dashboard → SQL Editor**, run:

1. **`scripts/supabase-migrations-bootstrap.sql`** — creates `migrations` schema and `plugin_vince.paper_bot_features`. Required for ElizaOS migrations.
2. **`scripts/supabase-feature-store-bootstrap.sql`** — creates `public.vince_paper_bot_features` for Supabase client dual-write (ML queries).

### 3. Configure .env

```bash
# Direct connection (recommended; migrations work reliably)
POSTGRES_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require

# Supabase client (for feature-store dual-write and ML bucket)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_URL=https://[PROJECT_REF].supabase.co
```

**Note:** If you use the **pooler** URL (`pooler.supabase.com`), set `SUPABASE_URL` explicitly — it cannot be derived from the pooler host.

### 4. Optional: SSL fix

If you see "self-signed certificate in certificate chain":

```bash
POSTGRES_SSL_REJECT_UNAUTHORIZED=false
```

Use only when needed; prefer fixing certificate trust for production.

### 5. Backfill existing JSONL (optional)

If you have local feature files before enabling Postgres:

```bash
# Dry-run first
bun run scripts/sync-jsonl-to-supabase.ts --dry-run

# Sync to Supabase
bun run scripts/sync-jsonl-to-supabase.ts
```

### 6. Verify locally

```bash
bun start
```

Look for:

- `[start] Migration schema ready.`
- `[VinceFeatureStore] Supabase dual-write enabled for ML (table: vince_paper_bot_features)`

After some paper trades, check **Supabase → Table Editor**:

- `plugin_vince.paper_bot_features` — from runtime DB adapter
- `public.vince_paper_bot_features` — from Supabase client dual-write

### 7. Deploy to Cloud

`deploy-cloud.sh` passes `POSTGRES_URL` when set in `.env`:

```bash
bun run deploy:cloud
```

Cloud will use the same Supabase DB; data persists across redeploys.

---

## Verification Queries

In Supabase SQL Editor:

```sql
-- Paper-bot feature count
SELECT COUNT(*) FROM plugin_vince.paper_bot_features;
SELECT COUNT(*) FROM public.vince_paper_bot_features;

-- Recent ElizaOS data
SELECT COUNT(*) FROM public.memories;
SELECT COUNT(*) FROM public.agents;
```

---

## Rollback

To revert to PGLite:

1. Remove or comment out `POSTGRES_URL` in `.env`.
2. Restart; app uses embedded PGLite.
3. JSONL files remain under `.elizadb/vince-paper-bot/features/`.

---

## Related

- [FEATURE-STORE.md](FEATURE-STORE.md) — Feature storage (JSONL, Postgres, Supabase)
- [DEPLOY.md](DEPLOY.md) — Deploy env, POSTGRES_URL, Supabase keys
