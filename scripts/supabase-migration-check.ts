#!/usr/bin/env bun
/**
 * Supabase migration readiness check.
 *
 * Prints status of POSTGRES_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * and next steps from docs/FEATURE-STORE.md. Run with env loaded:
 *
 *   bun run supabase:check
 *   bunx dotenv-cli -e .env -- bun scripts/supabase-migration-check.ts
 */

const POSTGRES_URL = process.env.POSTGRES_URL ?? "";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const hasPostgres = POSTGRES_URL.length > 0 && !POSTGRES_URL.startsWith("file:");
const hasSupabaseUrl = SUPABASE_URL.length > 0;
const hasSupabaseKey = SUPABASE_SERVICE_ROLE_KEY.length > 0;

console.log("Supabase migration readiness\n");
console.log("  POSTGRES_URL:              ", hasPostgres ? "set" : "not set");
console.log("  SUPABASE_URL:              ", hasSupabaseUrl ? "set" : "not set");
console.log("  SUPABASE_SERVICE_ROLE_KEY: ", hasSupabaseKey ? "set" : "not set");
console.log("");

if (hasPostgres && hasSupabaseKey) {
  console.log("Ready for feature-store dual-write. After restart:");
  console.log("  - ElizaOS tables and plugin_vince.paper_bot_features use Postgres.");
  console.log("  - Features also dual-write to Supabase for 500+ row ML queries.");
  console.log("");
  console.log("If you haven't yet, run scripts/supabase-feature-store-bootstrap.sql in Supabase SQL Editor.");
} else {
  console.log("Next steps (see docs/FEATURE-STORE.md):");
  if (!hasPostgres) {
    if (hasSupabaseUrl || hasSupabaseKey) {
      console.log("  1. Get direct Postgres connection string: Supabase Dashboard → Settings → Database → Connection string (URI, port 5432; not pooler).");
      console.log("  2. Set POSTGRES_URL in .env (and deploy env).");
    } else {
      console.log("  1. Create a Supabase project; get direct connection string (port 5432, not pooler).");
      console.log("  2. Set POSTGRES_URL in .env (and deploy env).");
    }
    console.log("  3. Restart (or redeploy); verify plugin_vince.paper_bot_features exists.");
  }
  if (hasPostgres && !hasSupabaseKey) {
    console.log("  1. Run scripts/supabase-feature-store-bootstrap.sql in Supabase SQL Editor.");
    console.log("  2. Set SUPABASE_SERVICE_ROLE_KEY (and optionally SUPABASE_URL) in .env.");
  }
  console.log("");
}
