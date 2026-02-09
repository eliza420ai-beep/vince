/**
 * Optional cron script: run one X vibe check for a single asset and write result
 * to the same cache file used by VinceXSentimentService. Use to stagger X API
 * calls via crontab and avoid rate limits (e.g. every 16 min with round-robin).
 *
 * Usage:
 *   bun run scripts/x-vibe-check.ts [BTC|ETH|SOL|HYPE]
 *   (no arg: derive asset from timestamp; crontab every 16 min gives round-robin)
 *
 * Requires X_BEARER_TOKEN in .env. Cache: .elizadb/vince-paper-bot/x-sentiment-cache.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { search as xSearch, type Tweet } from "../skills/x-research/lib/api";

const CORE_ASSETS = ["BTC", "ETH", "SOL", "HYPE"] as const;
const STAGGER_WINDOW_MS = 15 * 60 * 1000; // align with VinceXSentimentService default
const CACHE_DIR = ".elizadb/vince-paper-bot";
const CACHE_FILENAME = "x-sentiment-cache.json";
const MIN_TWEETS_FOR_CONFIDENCE = 3;

const BULLISH_WORDS = [
  "bullish", "moon", "pump", "buy", "long", "great", "love", "bull",
  "growth", "profit", "accumulate", "bottom",
];
const BEARISH_WORDS = [
  "bearish", "dump", "sell", "short", "bad", "hate", "bear", "crash", "fud", "top",
];
const RISK_WORDS = ["rug", "scam", "exploit", "hack", "drain", "stolen"];

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

function simpleSentiment(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of BULLISH_WORDS) if (lower.includes(w)) score += 1;
  for (const w of BEARISH_WORDS) if (lower.includes(w)) score -= 1;
  return score === 0 ? 0 : Math.max(-1, Math.min(1, score / 5));
}

function hasRiskKeyword(text: string): boolean {
  return RISK_WORDS.some((w) => text.toLowerCase().includes(w));
}

interface CachedEntry {
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  hasHighRiskEvent: boolean;
  updatedAt: number;
}

function computeSentiment(tweets: Tweet[]): CachedEntry {
  const now = Date.now();
  if (tweets.length < MIN_TWEETS_FOR_CONFIDENCE) {
    return { sentiment: "neutral", confidence: 0, hasHighRiskEvent: false, updatedAt: now };
  }
  let sumSentiment = 0;
  let weightedSum = 0;
  let totalWeight = 0;
  let hasRisk = false;
  for (const t of tweets) {
    const s = simpleSentiment(t.text);
    if (hasRiskKeyword(t.text)) hasRisk = true;
    const weight = 1 + Math.log10(1 + (t.metrics?.likes ?? 0));
    sumSentiment += s;
    weightedSum += s * weight;
    totalWeight += weight;
  }
  const avgRaw = sumSentiment / tweets.length;
  const avgWeighted = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const avgSentiment = avgWeighted !== 0 ? avgWeighted : avgRaw;
  let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
  if (avgSentiment > 0.15) sentiment = "bullish";
  else if (avgSentiment < -0.15) sentiment = "bearish";
  const strength = Math.min(1, Math.abs(avgSentiment) * 2 + tweets.length / 50);
  const confidence = Math.round(Math.min(100, strength * 70));
  return { sentiment, confidence, hasHighRiskEvent: hasRisk, updatedAt: now };
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

async function main(): Promise<number> {
  loadEnv();
  if (!process.env.X_BEARER_TOKEN?.trim()) {
    console.error("X_BEARER_TOKEN not set. Add to .env.");
    return 1;
  }
  const asset = getAssetFromArg();
  const query = asset === "HYPE" ? "HYPE crypto -is:retweet" : `$${asset} -is:retweet`;
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
  const entry = computeSentiment(tweets);
  const filePath = getCachePath();
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  let data: Record<string, CachedEntry> = {};
  if (existsSync(filePath)) {
    try {
      data = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, CachedEntry>;
    } catch {
      // ignore
    }
  }
  data[asset] = entry;
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`x-vibe-check: ${asset} -> ${entry.sentiment} (${entry.confidence})`);
  return 0;
}

main().then((code) => process.exit(code));
