#!/usr/bin/env bun
/**
 * One-off script: Sync local JSONL feature files to Supabase.
 *
 * Use when you have existing .elizadb/vince-paper-bot/features/*.jsonl and want
 * to backfill into Supabase (vince_paper_bot_features) for ML queries or after
 * enabling Supabase dual-write.
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (or env).
 * Run supabase-feature-store-bootstrap.sql in Supabase SQL Editor first.
 *
 * Usage:
 *   bun run scripts/sync-jsonl-to-supabase.ts
 *   bun run scripts/sync-jsonl-to-supabase.ts --dir .elizadb/vince-paper-bot/features
 *   bun run scripts/sync-jsonl-to-supabase.ts --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const TABLE = "vince_paper_bot_features";

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(import.meta.dir, "..", ".env");
  const out: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eq = trimmed.indexOf("=");
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          let val = trimmed.slice(eq + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
            val = val.slice(1, -1);
          out[key] = val;
        }
      }
    }
  }
  return out;
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dirIdx = args.indexOf("--dir");
  const dataDir =
    dirIdx >= 0 && args[dirIdx + 1]
      ? path.resolve(args[dirIdx + 1])
      : path.resolve(import.meta.dir, "..", ".elizadb", "vince-paper-bot", "features");

  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set in .env or environment.");
    process.exit(1);
  }

  if (!fs.existsSync(dataDir)) {
    console.error(`Data dir not found: ${dataDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.startsWith("features_") && f.endsWith(".jsonl"))
    .sort();

  const records: { id: string; created_at: string; payload: Record<string, unknown> }[] = [];

  for (const file of files) {
    const filepath = path.join(dataDir, file);
    const content = fs.readFileSync(filepath, "utf-8");
    for (const line of content.split("\n").filter((l) => l.trim())) {
      try {
        const r = JSON.parse(line) as { id?: string; timestamp?: number };
        const id = r.id ?? `synced-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const ts = r.timestamp ?? Date.now();
        records.push({
          id,
          created_at: new Date(ts).toISOString(),
          payload: r as unknown as Record<string, unknown>,
        });
      } catch {
        // skip malformed
      }
    }
  }

  console.log(`Found ${records.length} records in ${files.length} files.`);

  if (dryRun) {
    console.log("Dry-run: would upsert", records.length, "rows to", TABLE);
    return;
  }

  const supabase = createClient(url, key);
  const BATCH = 100;
  let ok = 0;
  let err = 0;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from(TABLE).upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH) + 1} error:`, error.message);
      err += batch.length;
    } else {
      ok += batch.length;
    }
  }
  console.log(`Synced ${ok} records to ${TABLE}.`);
  if (err) console.log(`Errors: ${err}`);
}

main();
