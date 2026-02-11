import type { Memory, State } from "@elizaos/core";
import { matchesPluginContext, type PluginKeywordPatterns } from "@/utils/plugin-context-matcher";

/**
 * Keyword patterns for OpenClaw plugin context activation
 */
export const openclawKeywordPatterns: PluginKeywordPatterns = {
  keywords: [
    // Brand / explicit references
    "openclaw",
    "open claw",
    "research agent",
    "alpha research",
    "market research",
    "on-chain research",
    "crypto research",
    // Focused user intents
    "research token",
    "analyze token",
    "market sentiment",
    "KOL sentiment",
    "whale activity",
    "smart money",
    "DEX liquidity",
    "funding rate",
    "open interest",
    "crypto news",
    "token news",
  ],
  regexPatterns: [
    /(?:research|analyze)\s+(?:SOL|BTC|ETH|alpha|market)/i,
    /(?:alpha|market|on-chain|whale)\s+(?:research|analysis|report)/i,
    /(?:KOL|whale|smart\s+money)\s+(?:activity|tracking|flow)/i,
    /(?:funding|open\s+interest)\s+(?:rate|data)/i,
    /(?:DEX|liquidity)\s+(?:pool|volume)/i,
    /@openclaw/i,
  ],
};

/**
 * Check if OpenClaw plugin should be active based on recent conversation
 */
export function shouldOpenclawPluginBeInContext(state?: State, message?: Memory): boolean {
  if (!state) return true;
  return matchesPluginContext(state, openclawKeywordPatterns, message);
}
