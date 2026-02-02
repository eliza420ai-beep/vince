-- One-time bootstrap for ElizaOS plugin-sql migrations on Supabase
-- Run this in Supabase Dashboard → SQL Editor if you get:
--   "Failed query: CREATE SCHEMA IF NOT EXISTS migrations"
--
-- Steps:
-- 1) Open Supabase Dashboard → SQL Editor → New query
-- 2) Paste this ENTIRE file and click Run
-- 3) In .env set POSTGRES_URL=postgresql://postgres:PASSWORD@db.haotsmkpmlmxohbkrvaw.supabase.co:5432/postgres?sslmode=require
-- 4) bun start
--
-- If the app still fails after running this, the connection may be blocked (e.g. network).
-- Unblock: leave POSTGRES_URL empty in .env → app uses PGLite; Supabase still used for feature store (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).

CREATE SCHEMA IF NOT EXISTS migrations;

CREATE TABLE IF NOT EXISTS migrations._migrations (
  id SERIAL PRIMARY KEY,
  plugin_name TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS migrations._journal (
  plugin_name TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  dialect TEXT NOT NULL DEFAULT 'postgresql',
  entries JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS migrations._snapshots (
  id SERIAL PRIMARY KEY,
  plugin_name TEXT NOT NULL,
  idx INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(plugin_name, idx)
);

-- Optional: grant to anon/authenticated/service_role if you use them for DB access
-- GRANT USAGE ON SCHEMA migrations TO anon, authenticated, service_role;
-- GRANT ALL ON ALL TABLES IN SCHEMA migrations TO anon, authenticated, service_role;
