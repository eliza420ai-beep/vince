/**
 * Live demo: one X search, print real tweet data.
 * Run from repo root with X_BEARER_TOKEN in .env:
 *   bun run scripts/x-research-live-demo.ts
 * If rate limited, wait for the reset window and run again.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { search } from "../skills/x-research/lib/api";

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
    console.error("X_BEARER_TOKEN not set. Add to .env and run from repo root.");
    process.exit(1);
  }

  console.log("Query: BTC OR bitcoin (max 5, last 7d)\n");
  try {
    const tweets = await search("BTC OR bitcoin", {
      maxResults: 5,
      pages: 1,
      sortOrder: "relevancy",
    });
    if (tweets.length === 0) {
      console.log("No tweets returned (empty result or filter).");
      process.exit(0);
    }
    console.log("Live results:\n");
    for (let i = 0; i < tweets.length; i++) {
      const t = tweets[i];
      console.log(`  ${i + 1}. @${t.username}: ${t.text.slice(0, 120)}${t.text.length > 120 ? "…" : ""}`);
      console.log(`     Likes: ${t.metrics.likes}  Retweets: ${t.metrics.retweets}  ${t.tweet_url}\n`);
    }
    console.log("OK — live X data received.");
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Error:", msg);
    if (msg.includes("Rate limited") || msg.includes("429")) {
      const match = msg.match(/Resets? in (\d+)s/);
      if (match) console.error(`Wait ${Math.ceil(parseInt(match[1], 10) / 60)} min and run again.`);
    }
    process.exit(1);
  }
}

main();
