/**
 * OpenClaw Service for VINCE - V2
 *
 * Provides:
 * - Agent spawning and result collection
 * - Cost tracking with budget alerts
 * - Caching layer
 * - Rate limiting
 * - Streaming support
 */

import { logger } from "@elizaos/core";
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

/**
 * Simulate agent execution with streaming (V2)
 * In production, this would call actual OpenClaw agents
 */
export async function executeAgentWithStreaming(
  agent: string,
  tokens: string,
  onUpdate: (update: StreamUpdate) => void
): Promise<{ result: string; cost: CostStats }> {
  // Start
  onUpdate({ type: "start", agent, message: `Starting ${agent} research for ${tokens}...` });
  
  // Simulate progress
  await sleep(500);
  onUpdate({ type: "progress", agent, message: "Connecting to data sources...", progress: 20 });
  
  await sleep(500);
  onUpdate({ type: "progress", agent, message: "Gathering market data...", progress: 40 });
  
  await sleep(500);
  onUpdate({ type: "progress", agent, message: "Analyzing sentiment...", progress: 60 });
  
  await sleep(500);
  onUpdate({ type: "progress", agent, message: "Compiling results...", progress: 80 });
  
  // Generate result based on agent type
  const results: Record<string, string> = {
    alpha: `**Alpha Analysis for ${tokens}**

📊 **Sentiment:** Mixed to Bullish
• Twitter/X sentiment score: 7.2/10
• KOL activity: High (12 mentions in 24h)
• Narrative strength: Moderate

🎯 **Key Signals:**
• @frankdegods: Bullish on ecosystem growth
• @pentosh1: Watching for breakout
• @cryptokoryo: Accumulation zone

📈 **Alpha Score:** 6.5/10
⏰ **Analysis Time:** ${new Date().toISOString()}`,

    market: `**Market Data for ${tokens}**

💰 **Price Action:**
• Current: $XX.XX
• 24h Change: +X.X%
• 7d Change: +X.X%

📊 **Volume & Liquidity:**
• 24h Volume: $XXM
• Market Cap: $XXB
• FDV: $XXB

📈 **Derivatives:**
• Funding Rate: 0.01%
• Open Interest: $XXM
• Long/Short Ratio: 1.2

⏰ **Data Time:** ${new Date().toISOString()}`,

    onchain: `**On-Chain Analysis for ${tokens}**

🐋 **Whale Activity:**
• Large transfers (24h): 15
• Net whale flow: +$2.5M
• Smart money: Accumulating

💹 **DEX Activity:**
• DEX volume (24h): $XXM
• Top pools: [Pool data]
• Liquidity depth: Strong

🔍 **Address Activity:**
• Active addresses: +12% (24h)
• New wallets: 1,234
• Holder distribution: Healthy

⏰ **Analysis Time:** ${new Date().toISOString()}`,

    news: `**News Summary for ${tokens}**

📰 **Headlines:**
• [Breaking] Major development announced
• [Analysis] Market outlook positive
• [Update] Partnership revealed

📊 **Sentiment:**
• News sentiment: Positive (8/10)
• Social mentions: +25% (24h)
• Fear/Greed: 55 (Neutral)

⏰ **Last Updated:** ${new Date().toISOString()}`,
  };
  
  const result = results[agent] || `Research complete for ${tokens}`;
  const cost = calculateCost(2500, 800); // Simulated token usage
  
  await sleep(500);
  onUpdate({ type: "complete", agent, message: "Research complete!", progress: 100, result });
  
  return { result, cost };
}

/**
 * Execute all agents in parallel with streaming
 */
export async function executeAllAgentsWithStreaming(
  tokens: string,
  onUpdate: (update: StreamUpdate) => void
): Promise<{ results: Record<string, string>; totalCost: CostStats }> {
  const agents = ["alpha", "market", "onchain", "news"];
  const results: Record<string, string> = {};
  let totalInput = 0;
  let totalOutput = 0;
  
  onUpdate({ type: "start", agent: "all", message: `Starting parallel research for ${tokens}...` });
  
  // Run all agents in parallel
  const promises = agents.map(async (agent, index) => {
    await sleep(index * 200); // Stagger starts slightly
    const { result, cost } = await executeAgentWithStreaming(agent, tokens, (update) => {
      onUpdate({ ...update, agent: `all:${agent}` });
    });
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
