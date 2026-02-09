/**
 * Live smoke test for X API (search + getTweet).
 * Run from repo root with X_BEARER_TOKEN in .env:
 *   bun run scripts/x-research-live-smoke.ts
 * Exits 0 if both search and getTweet succeed; exits 1 otherwise.
 * Use in CI only when X_BEARER_TOKEN is available (e.g. scheduled or manual workflow).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { search, getTweet } from "../skills/x-research/lib/api";

function loadEnv(): void {
  const root = process.cwd();
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
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
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

async function main(): Promise<void> {
  loadEnv();
  if (!process.env.X_BEARER_TOKEN?.trim()) {
    console.error("x-research-live-smoke: X_BEARER_TOKEN not set. Add to .env and run from repo root.");
    process.exit(1);
  }

  try {
    const tweets = await search("crypto", { maxResults: 10, pages: 1 });
    if (tweets.length === 0) {
      console.error("x-research-live-smoke: search returned no tweets (rate limit or empty result).");
      process.exit(1);
    }
    const tweetId = tweets[0].id;
    const single = await getTweet(tweetId);
    if (!single) {
      console.error("x-research-live-smoke: getTweet returned null for id", tweetId);
      process.exit(1);
    }
    console.log("x-research-live-smoke: OK (search + getTweet)");
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("x-research-live-smoke:", msg);
    process.exit(1);
  }
}

main();
