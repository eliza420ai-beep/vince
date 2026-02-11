/**
 * OpenClaw Service for VINCE
 *
 * Provides:
 * - Agent spawning and result collection
 * - Cost tracking
 * - Caching layer
 * - Rate limiting
 */

import { logger } from "@elizaos/core";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";

const CACHE_DIR = path.resolve(process.cwd(), ".openclaw-cache");
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

// Cost per 1M tokens (MiniMax-M2.1)
const COST_PER_MILLION = {
  input: 0.1,  // $0.10 per 1M input tokens
  output: 0.4, // $0.40 per 1M output tokens
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

// In-memory storage
const requestCache = new Map<string, CacheEntry>();
const rateLimitMap = new Map<string, RateLimitEntry>();
let dailyCost: CostStats = { inputTokens: 0, outputTokens: 0, estimatedCost: 0, timestamp: Date.now() };

/**
 * Initialize cache directory
 */
export function initCache(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
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
        // Add to memory cache
        requestCache.set(key, entry);
        return { result: entry.result, cached: true, cost: entry.tokens };
      }
    } catch (e) {
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
  const entry: CacheEntry = { key, result, timestamp: Date.now(), tokens };
  
  // Memory cache
  requestCache.set(key, entry);
  
  // Disk cache
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  writeFileSync(cachePath, JSON.stringify(entry, null, 2));
}

/**
 * Check rate limit for user/session
 */
export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, retryAfter: 0 };
  }
  
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
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
  
  // Update daily cost
  dailyCost.inputTokens += inputTokens;
  dailyCost.outputTokens += outputTokens;
  dailyCost.estimatedCost += stats.estimatedCost;
  
  return stats;
}

/**
 * Get daily cost summary
 */
export function getDailyCost(): CostStats {
  // Reset daily stats if it's a new day
  const now = Date.now();
  if (now - dailyCost.timestamp > 24 * 60 * 60 * 1000) {
    dailyCost = { inputTokens: 0, outputTokens: 0, estimatedCost: 0, timestamp: now };
  }
  return { ...dailyCost };
}

/**
 * Format cost as readable string
 */
export function formatCost(stats: CostStats): string {
  return `$${stats.estimatedCost.toFixed(4)} (${(stats.inputTokens / 1000).toFixed(1)}K in / ${(stats.outputTokens / 1000).toFixed(1)}K out)`;
}

/**
 * Clear all caches
 */
export function clearCache(): void {
  requestCache.clear();
  if (existsSync(CACHE_DIR)) {
    const files = require("fs").readdirSync(CACHE_DIR);
    files.forEach((f: string) => require("fs").unlinkSync(path.join(CACHE_DIR, f)));
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

export default {
  initCache,
  getCachedResult,
  cacheResult,
  checkRateLimit,
  calculateCost,
  getDailyCost,
  formatCost,
  clearCache,
  getCacheStats,
};
