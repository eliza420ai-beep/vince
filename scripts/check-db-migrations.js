#!/usr/bin/env node
/**
 * Diagnose "Failed query: CREATE SCHEMA IF NOT EXISTS migrations" by
 * connecting with pg and running the same query. Prints the real error (e.g. SSL, permissions).
 *
 * Run from project root: node scripts/check-db-migrations.js
 * Or: bun scripts/check-db-migrations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root (minimal parser)
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
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
  console.error('POSTGRES_URL not set. Set it in .env or run from project root.');
  process.exit(1);
}

async function main() {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: postgresUrl });
  try {
    await client.connect();
    console.log('Connected. Running: CREATE SCHEMA IF NOT EXISTS migrations');
    await client.query('CREATE SCHEMA IF NOT EXISTS migrations');
    console.log('Success. Schema "migrations" exists. App migrations should work.');
  } catch (err) {
    console.error('Full error:', err.message);
    if (err.cause) console.error('Cause:', err.cause);
    if (err.code) console.error('Code:', err.code);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
