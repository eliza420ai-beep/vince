#!/usr/bin/env node
/**
 * One-time bootstrap for ElizaOS migrations when you see:
 *   "Failed query: CREATE SCHEMA IF NOT EXISTS migrations"
 *
 * Requires: POSTGRES_URL in .env (and pg installed: bun add -d pg)
 * Run from project root: bun run db:bootstrap  (or node scripts/db-bootstrap.js)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
          val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
}

const postgresUrl = process.env.POSTGRES_URL;
if (!postgresUrl) {
  console.error("POSTGRES_URL not set in .env. Set it (e.g. Supabase) or leave it empty to use local PGLite.");
  process.exit(1);
}
const sslReject = process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase();
const sslRelax =
  sslReject === "false" || sslReject === "0" || sslReject === "no" || sslReject === "off";

const sqlPath = path.resolve(__dirname, "supabase-migrations-bootstrap.sql");
if (!fs.existsSync(sqlPath)) {
  console.error("Missing scripts/supabase-migrations-bootstrap.sql");
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");

async function main() {
  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error("Install pg: bun add -d pg");
    process.exit(1);
  }
  const clientConfig = { connectionString: postgresUrl };
  if (sslRelax) clientConfig.ssl = { rejectUnauthorized: false };
  const client = new pg.Client(clientConfig);
  try {
    await client.connect();
    console.log("Running migration bootstrap SQL...");
    await client.query(sql);
    console.log("Done. Schema 'migrations' and tables created. You can run: bun start");
  } catch (err) {
    console.error("Bootstrap failed:", err.message);
    if (err.code) console.error("Code:", err.code);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
