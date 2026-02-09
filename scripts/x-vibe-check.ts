/**
 * Optional cron script: run one X vibe check for a single asset and write result
 * to the same cache file used by VinceXSentimentService. Use to stagger X API
 * calls via crontab—one asset per run, never burst (e.g. one per hour = 24 assets in 24h).
 *
 * Usage:
 *   bun run scripts/x-vibe-check.ts [BTC|ETH|SOL|HYPE]
 *   (no arg: derive asset from timestamp; crontab every 1h gives round-robin over 4 assets = full cycle every 4h)
 *
 * Requires X_BEARER_TOKEN in .env. Cache: .elizadb/vince-paper-bot/x-sentiment-cache.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import { search as xSearch, type Tweet } from "../skills/x-research/lib/api";
import { computeSentimentFromTweets } from "../src/plugins/plugin-vince/src/utils/xSentimentLogic";

const CORE_ASSETS = ["BTC", "ETH", "SOL", "HYPE"] as const;
const STAGGER_WINDOW_MS = 60 * 60 * 1000; // 1h — align with VinceXSentimentService default (one asset per hour)
const CACHE_DIR = ".elizadb/vince-paper-bot";
const CACHE_FILENAME = "x-sentiment-cache.json";

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
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
          val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

function getAssetFromArg(): string {
  const arg = process.argv[2]?.toUpperCase();
  if (arg && CORE_ASSETS.includes(arg as (typeof CORE_ASSETS)[number])) return arg;
  const slot = Math.floor(Date.now() / STAGGER_WINDOW_MS) % CORE_ASSETS.length;
  return CORE_ASSETS[slot];
}

function getCachePath(): string {
  return path.join(process.cwd(), CACHE_DIR, CACHE_FILENAME);
}

/** Same query shape as VinceXSentimentService buildSentimentQuery so cron and in-app vibe check are comparable. */
function buildSentimentQuery(asset: string): string {
  if (asset === "HYPE") return "HYPE crypto";
  const expanded: Record<string, string> = {
    BTC: "$BTC OR Bitcoin",
    ETH: "$ETH OR Ethereum",
    SOL: "$SOL OR Solana",
    DOGE: "$DOGE OR Dogecoin",
    PEPE: "$PEPE OR Pepe",
  };
  return expanded[asset] ?? `$${asset}`;
}

async function main(): Promise<number> {
  const startMs = Date.now();
  loadEnv();
  if (!process.env.X_BEARER_TOKEN?.trim()) {
    console.error("X_BEARER_TOKEN not set. Add to .env.");
    return 1;
  }
  const asset = getAssetFromArg();
  const baseQuery = buildSentimentQuery(asset);
  const query = baseQuery.includes("-is:retweet") ? baseQuery : `${baseQuery} -is:retweet`;
  let tweets: Tweet[];
  try {
    tweets = await xSearch(query, {
      maxResults: 30,
      pages: 1,
      sortOrder: "relevancy",
      since: "1d",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("X API error:", msg);
    return 1;
  }
  const entry = computeSentimentFromTweets(tweets);
  const filePath = getCachePath();
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  let data: Record<string, typeof entry> = {};
  if (existsSync(filePath)) {
    try {
      data = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, typeof entry>;
    } catch {
      // ignore
    }
  }
  data[asset] = entry;
  const tmpPath = `${filePath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  renameSync(tmpPath, filePath);
  const durationMs = Date.now() - startMs;
  console.log(`x-vibe-check: ${asset} -> ${entry.sentiment} (${entry.confidence})`);
  console.log(
    JSON.stringify({
      asset,
      sentiment: entry.sentiment,
      confidence: entry.confidence,
      durationMs,
      timestamp: new Date().toISOString(),
    }),
  );
  return 0;
}

main().then((code) => process.exit(code));
