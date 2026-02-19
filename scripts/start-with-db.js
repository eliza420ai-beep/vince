#!/usr/bin/env node
/**
 * Wrapper for `bun start`: when POSTGRES_URL is set, runs migration bootstrap
 * (CREATE SCHEMA + tables) first so ElizaOS migrations succeed, then starts the app.
 * When POSTGRES_URL is empty, starts the app (uses PGLite).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

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
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        )
          val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
}

const postgresUrl = process.env.POSTGRES_URL?.trim();
const sslReject =
  process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase();
const sslRelax =
  sslReject === "false" ||
  sslReject === "0" ||
  sslReject === "no" ||
  sslReject === "off";

async function runBootstrap() {
  if (!postgresUrl) return;
  const sqlPath = path.resolve(__dirname, "supabase-migrations-bootstrap.sql");
  if (!fs.existsSync(sqlPath)) return;
  let pg;
  try {
    pg = await import("pg");
  } catch {
    return;
  }
  const clientConfig = { connectionString: postgresUrl };
  if (sslRelax) clientConfig.ssl = { rejectUnauthorized: false };
  const client = new pg.Client(clientConfig);
  try {
    await client.connect();
    const sql = fs.readFileSync(sqlPath, "utf8");
    await client.query(sql);
    console.log("[start] Migration schema ready.");
  } catch (err) {
    console.error("[start] Bootstrap failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function main() {
  await runBootstrap();
  const env = { ...process.env };
  if (sslRelax) env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const elizaos = spawn("elizaos", ["start"], {
    stdio: "inherit",
    shell: false,
    env,
  });
  elizaos.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });
  elizaos.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main();
