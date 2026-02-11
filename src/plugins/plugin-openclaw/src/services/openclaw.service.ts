/**
 * OpenClaw Service for VINCE - V2
 *
 * Provides:
 * - Agent spawning and result collection
 * - Cost tracking with budget alerts
 * - Caching layer
 * - Rate limiting
 * - Streaming support
 * - Real market data via Hyperliquid + LLM prose (ALOHA-style)
 */

import { logger, ModelType, type IAgentRuntime } from "@elizaos/core";
import { getOrCreateHyperliquidService } from "../../../plugin-vince/src/services/fallbacks";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";
import { EventEmitter } from "events";

const CACHE_DIR = path.resolve(process.cwd(), ".openclaw-cache");
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

// Cost per 1M tokens (MiniMax-M2.1)
const COST_PER_MILLION = {
  input: 0.1,  // $0.10 per 1M input tokens
  output: 0.4, // $0.40 per 1M output tokens
};

// Budget limits
const BUDGET_LIMITS = {
  perQuery: 0.10,   // $0.10 per query warning
  daily: 5.00,      // $5.00 daily warning
  dailyHard: 10.00, // $10.00 daily hard limit
};

interface CostStats {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  timestamp: number;
}

interface CacheEntry {
  key: string;
  result: string;
  timestamp: number;
  tokens: CostStats;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface BudgetAlert {
  type: "warning" | "limit";
  message: string;
  current: number;
  limit: number;
}

interface StreamUpdate {
  type: "start" | "progress" | "complete" | "error";
  agent: string;
  message: string;
  progress?: number;
  result?: string;
}

// In-memory storage
const requestCache = new Map<string, CacheEntry>();
const rateLimitMap = new Map<string, RateLimitEntry>();
let dailyCost: CostStats = { inputTokens: 0, outputTokens: 0, estimatedCost: 0, timestamp: Date.now() };

// Event emitter for streaming
export const streamEmitter = new EventEmitter();

/**
 * Initialize cache directory
 */
export function initCache(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  // Reset daily cost if new day
  const now = Date.now();
  if (now - dailyCost.timestamp > 24 * 60 * 60 * 1000) {
    dailyCost = { inputTokens: 0, outputTokens: 0, estimatedCost: 0, timestamp: now };
  }
}

/**
 * Generate cache key from request
 */
function generateCacheKey(agent: string, tokens: string): string {
  const input = `${agent}:${tokens.toLowerCase().trim().split(" ").sort().join(",")}`;
  return crypto.createHash("md5").update(input).digest("hex");
}

/**
 * Check cache for existing result
 */
export function getCachedResult(agent: string, tokens: string): { result: string; cached: boolean; cost: CostStats } | null {
  const key = generateCacheKey(agent, tokens);
  
  // Check memory cache first
  const memEntry = requestCache.get(key);
  if (memEntry && Date.now() - memEntry.timestamp < CACHE_TTL) {
    return { result: memEntry.result, cached: true, cost: memEntry.tokens };
  }
  
  // Check disk cache
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  if (existsSync(cachePath)) {
    try {
      const entry: CacheEntry = JSON.parse(readFileSync(cachePath, "utf-8"));
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        requestCache.set(key, entry);
        return { result: entry.result, cached: true, cost: entry.tokens };
      }
    } catch {
      // Ignore corrupt cache
    }
  }
  
  return null;
}

/**
 * Store result in cache
 */
export function cacheResult(agent: string, tokens: string, result: string, cost: CostStats): void {
  const key = generateCacheKey(agent, tokens);
  const entry: CacheEntry = { key, result, timestamp: Date.now(), tokens: cost };
  
  requestCache.set(key, entry);
  
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  try {
    writeFileSync(cachePath, JSON.stringify(entry, null, 2));
  } catch {
    // Ignore write errors
  }
}

/**
 * Check rate limit for user/session
 */
export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, retryAfter: 0 };
  }
  
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }
  
  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count, retryAfter: 0 };
}

/**
 * Calculate cost from token usage
 */
export function calculateCost(inputTokens: number, outputTokens: number): CostStats {
  const inputCost = (inputTokens / 1_000_000) * COST_PER_MILLION.input;
  const outputCost = (outputTokens / 1_000_000) * COST_PER_MILLION.output;
  
  const stats: CostStats = {
    inputTokens,
    outputTokens,
    estimatedCost: inputCost + outputCost,
    timestamp: Date.now(),
  };
  
  dailyCost.inputTokens += inputTokens;
  dailyCost.outputTokens += outputTokens;
  dailyCost.estimatedCost += stats.estimatedCost;
  
  return stats;
}

/**
 * Get daily cost summary
 */
export function getDailyCost(): CostStats {
  const now = Date.now();
  if (now - dailyCost.timestamp > 24 * 60 * 60 * 1000) {
    dailyCost = { inputTokens: 0, outputTokens: 0, estimatedCost: 0, timestamp: now };
  }
  return { ...dailyCost };
}

/**
 * Check budget and return alerts
 */
export function checkBudget(queryCost: number): BudgetAlert | null {
  const daily = getDailyCost();
  
  // Hard limit check
  if (daily.estimatedCost >= BUDGET_LIMITS.dailyHard) {
    return {
      type: "limit",
      message: `🚫 Daily budget limit reached ($${BUDGET_LIMITS.dailyHard.toFixed(2)}). Research paused until tomorrow.`,
      current: daily.estimatedCost,
      limit: BUDGET_LIMITS.dailyHard,
    };
  }
  
  // Daily warning
  if (daily.estimatedCost >= BUDGET_LIMITS.daily) {
    return {
      type: "warning",
      message: `⚠️ Daily budget warning: $${daily.estimatedCost.toFixed(2)} / $${BUDGET_LIMITS.daily.toFixed(2)}`,
      current: daily.estimatedCost,
      limit: BUDGET_LIMITS.daily,
    };
  }
  
  // Per-query warning
  if (queryCost >= BUDGET_LIMITS.perQuery) {
    return {
      type: "warning",
      message: `⚠️ This query is expensive: $${queryCost.toFixed(4)}`,
      current: queryCost,
      limit: BUDGET_LIMITS.perQuery,
    };
  }
  
  return null;
}

/**
 * Format cost as readable string
 */
export function formatCost(stats: CostStats): string {
  return `$${stats.estimatedCost.toFixed(4)} (${(stats.inputTokens / 1000).toFixed(1)}K in / ${(stats.outputTokens / 1000).toFixed(1)}K out)`;
}

/**
 * Emit stream update
 */
export function emitStreamUpdate(update: StreamUpdate): void {
  streamEmitter.emit("update", update);
  logger.info(`[OpenClawService] Stream: ${update.type} - ${update.agent} - ${update.message}`);
}

/** Format a number for display (price, change, market cap) */
function formatPrice(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

export interface MarketDataPoint {
  symbol: string;
  price: number;
  change24h: number | null;
  marketCap: number | null;
  volume24h: number | null;
}

/**
 * Fetch real market data for tokens. Uses Hyperliquid for price data (no CoinGecko).
 * Only returns data for assets supported by Hyperliquid perps.
 */
export async function fetchRealMarketData(
  runtime: IAgentRuntime,
  tokens: string,
): Promise<{ dataContext: string; dataPoints: MarketDataPoint[] }> {
  const symbols = tokens
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const dataPoints: MarketDataPoint[] = [];

  const hlService = getOrCreateHyperliquidService(runtime);
  if (hlService?.getMarkPriceAndChange) {
    for (const sym of symbols) {
      try {
        const result = await hlService.getMarkPriceAndChange(sym);
        if (result != null && result.price > 0) {
          dataPoints.push({
            symbol: sym,
            price: result.price,
            change24h: result.change24h,
            marketCap: null,
            volume24h: null,
          });
        }
      } catch (e) {
        logger.debug({ err: String(e), symbol: sym }, "[OpenClawService] Hyperliquid fetch failed for symbol");
      }
    }
  }

  // Build data context string
  const lines: string[] = ["=== MARKET DATA ==="];
  for (const d of dataPoints) {
    lines.push(`\n${d.symbol}:`);
    lines.push(`  Price: $${d.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}`);
    if (d.change24h != null) {
      lines.push(`  24h Change: ${d.change24h >= 0 ? "+" : ""}${d.change24h.toFixed(2)}%`);
    }
    if (d.marketCap != null) lines.push(`  Market Cap: ${formatPrice(d.marketCap)}`);
    if (d.volume24h != null) lines.push(`  24h Volume: ${formatPrice(d.volume24h)}`);
  }
  if (dataPoints.length === 0) {
    lines.push("\nNo price data available. Check token symbols.");
  }

  return { dataContext: lines.join("\n"), dataPoints };
}

const ALOHA_STYLE_PROMPT = `You are writing a market research briefing. Write like you're explaining to a smart friend over coffee, not presenting to a board.

STYLE RULES:
- Flow naturally between thoughts. No bullet lists unless briefly summarizing.
- Weave numbers in naturally: "BTC sitting at 98k" not "Current: $98,121.38"
- Vary sentence length. Mix short punchy takes with longer explanations.
- Have a personality. If the market is boring, say it. If something stands out, say why.
- Don't hedge everything. Take positions when the data supports it.
- Around 150-250 words per section. Don't pad.

AVOID:
- "Interestingly", "notably", "it's worth noting"
- Generic observations that could apply to any day
- Starting every sentence with the asset name
- Repeating the same sentence structure`;

/**
 * Generate ALOHA-style prose from data context using LLM
 */
async function generateResearchProse(
  runtime: IAgentRuntime,
  dataContext: string,
  tokens: string,
  agent: string,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const sectionMap: Record<string, string> = {
    alpha: "Alpha / sentiment (what CT and KOLs are saying, narrative strength)",
    market: "Market data (prices, volume, market cap, derivatives if available)",
    onchain: "On-chain (whale activity, smart money, DEX flows – use market data as proxy if no on-chain)",
    news: "News and sentiment (headlines, fear/greed, recent developments)",
  };
  const sectionGuide = sectionMap[agent] || "relevant analysis";

  const prompt = `${ALOHA_STYLE_PROMPT}

Here is the data for ${tokens}:

${dataContext}

Write a brief ${sectionGuide} section. Use the actual numbers from the data. If a field is missing, don't invent it—focus on what we have. Write the briefing:`;

  const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
  const text = typeof response === "string" ? response : (response as { text?: string })?.text ?? "";
  const inputTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(text.length / 4);
  return { text: text.trim(), inputTokens, outputTokens };
}

/**
 * Execute research with real data and LLM prose. Pass runtime for real pipeline.
 */
export async function executeAgentWithStreaming(
  agent: string,
  tokens: string,
  onUpdate: (update: StreamUpdate) => void,
  runtime?: IAgentRuntime,
): Promise<{ result: string; cost: CostStats }> {
  onUpdate({ type: "start", agent, message: `Starting ${agent} research for ${tokens}...` });
  await sleep(300);
  onUpdate({ type: "progress", agent, message: "Connecting to data sources...", progress: 20 });

  if (runtime) {
    try {
      onUpdate({ type: "progress", agent, message: "Gathering market data...", progress: 40 });
      const { dataContext } = await fetchRealMarketData(runtime, tokens);

      onUpdate({ type: "progress", agent, message: "Writing briefing...", progress: 70 });
      const { text, inputTokens, outputTokens } = await generateResearchProse(
        runtime,
        dataContext,
        tokens,
        agent,
      );

      const cost = calculateCost(inputTokens, outputTokens);
      await sleep(200);
      onUpdate({ type: "complete", agent, message: "Research complete!", progress: 100, result: text });
      return { result: text, cost };
    } catch (err) {
      logger.warn({ err, agent, tokens }, "[OpenClawService] Real research failed, using fallback");
    }
  }

  // Fallback: minimal prose from template (no placeholders)
  await sleep(300);
  onUpdate({ type: "progress", agent, message: "Compiling results...", progress: 80 });

  const fallbackText = `Research for ${tokens} (${agent}): Data sources unavailable. For full market research with real data and ALOHA-style briefing, ensure plugin-vince (Hyperliquid) is loaded.`;
  const cost = calculateCost(500, 100);
  onUpdate({ type: "complete", agent, message: "Research complete!", progress: 100, result: fallbackText });
  return { result: fallbackText, cost };
}

/**
 * Execute all agents in parallel with streaming. Pass runtime for real data + LLM prose.
 */
export async function executeAllAgentsWithStreaming(
  tokens: string,
  onUpdate: (update: StreamUpdate) => void,
  runtime?: IAgentRuntime,
): Promise<{ results: Record<string, string>; totalCost: CostStats }> {
  const agents = ["alpha", "market", "onchain", "news"];
  const results: Record<string, string> = {};
  let totalInput = 0;
  let totalOutput = 0;

  onUpdate({ type: "start", agent: "all", message: `Starting parallel research for ${tokens}...` });

  const promises = agents.map(async (agent, index) => {
    await sleep(index * 200);
    const { result, cost } = await executeAgentWithStreaming(
      agent,
      tokens,
      (update) => onUpdate({ ...update, agent: `all:${agent}` }),
      runtime,
    );
    results[agent] = result;
    totalInput += cost.inputTokens;
    totalOutput += cost.outputTokens;
  });

  await Promise.all(promises);

  const totalCost = calculateCost(totalInput, totalOutput);
  onUpdate({ type: "complete", agent: "all", message: "All agents complete!", progress: 100 });

  return { results, totalCost };
}

/**
 * Clear all caches
 */
export function clearCache(): void {
  requestCache.clear();
  if (existsSync(CACHE_DIR)) {
    try {
      const fs = require("fs");
      const files = fs.readdirSync(CACHE_DIR);
      files.forEach((f: string) => fs.unlinkSync(path.join(CACHE_DIR, f)));
    } catch {
      // Ignore errors
    }
  }
  logger.info("[OpenClawService] Cache cleared");
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; dailyCost: string; rateLimits: number } {
  return {
    size: requestCache.size,
    dailyCost: formatCost(getDailyCost()),
    rateLimits: rateLimitMap.size,
  };
}

/**
 * Helper: sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  initCache,
  getCachedResult,
  cacheResult,
  checkRateLimit,
  calculateCost,
  getDailyCost,
  checkBudget,
  formatCost,
  emitStreamUpdate,
  executeAgentWithStreaming,
  executeAllAgentsWithStreaming,
  clearCache,
  getCacheStats,
  streamEmitter,
};
