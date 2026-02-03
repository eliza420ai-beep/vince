-- One-time bootstrap: create the Supabase table for VINCE paper-bot feature dual-write.
-- Use this so paper trade features persist across redeploys and can be queried for ML.
--
-- Steps:
-- 1) Open Supabase Dashboard → SQL Editor → New query
-- 2) Paste this file and click Run
-- 3) In .env set SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API → service_role)
--    and optionally SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co (or leave unset if POSTGRES_URL is Supabase; URL is derived)
-- 4) Restart the app; you should see: [VinceFeatureStore] Supabase dual-write enabled for ML (table: vince_paper_bot_features)
--
-- See FEATURE-STORE.md and DEPLOY.md for full setup.

create table if not exists public.vince_paper_bot_features (
  id text primary key,
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists idx_vince_paper_bot_features_created_at
  on public.vince_paper_bot_features (created_at);
create index if not exists idx_vince_paper_bot_features_payload_asset
  on public.vince_paper_bot_features using gin ((payload->'asset'));

-- Optional: index for filtering by outcome (for ML training queries)
create index if not exists idx_vince_paper_bot_features_payload_outcome
  on public.vince_paper_bot_features using gin ((payload->'outcome'));
