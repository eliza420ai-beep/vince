import type { Memory, State } from "@elizaos/core";
import {
  matchesPluginContext,
  type PluginKeywordPatterns,
} from "@/utils/plugin-context-matcher";

/**
 * Keyword patterns for OpenClaw plugin context activation.
 * AI-obsessed + OpenClaw: AI 2027, AGI, alignment, research agents, setup, gateway.
 */
export const openclawKeywordPatterns: PluginKeywordPatterns = {
  keywords: [
    "openclaw",
    "open claw",
    "claw",
    "openclaw setup",
    "install openclaw",
    "gateway setup",
    "gateway status",
    "gateway health",
    "claw setup",
    "openclaw status",
    "openclaw-agents",
    "clawterm",
    "clawdbot",
    "moltbot",
    "ai 2027",
    "ai-2027",
    "agi",
    "superhuman ai",
    "takeoff",
    "alignment",
    "misalignment",
    "research agent",
    "coding agent",
    "openbrain",
    "agent-1",
    "neuralese",
    "ida",
    "kokotajlo",
    "scott alexander",
    "ai timeline",
    "ai scenario",
    "nvda",
    "googl",
    "meta",
    "openai",
    "anthropic",
    "sndk",
    "sandisk",
    "amd",
    "mag7",
    "semis",
    "infotech",
    "robot",
    "spacex",
    "pltr",
    "msft",
    "aapl",
    "orcl",
    "intc",
    "mu",
    "hip3 ai",
    "hyperliquid ai",
    "ai perps",
    "ai assets",
  ],
  regexPatterns: [
    /openclaw\s+(?:setup|install|gateway|status)/i,
    /(?:gateway|claw)\s+(?:setup|status|health)/i,
    /@openclaw/i,
    /ai\s*2027|ai-2027/i,
    /agi\s*(?:timeline|forecast)?/i,
    /(?:superhuman|research)\s*(?:ai|agent)/i,
    /hip3\s*ai|hyperliquid\s*ai|ai\s*perps|ai\s*assets/i,
  ],
};

/**
 * Check if OpenClaw plugin should be active based on recent conversation
 */
export function shouldOpenclawPluginBeInContext(
  state?: State,
  message?: Memory,
): boolean {
  if (!state) return true;
  return matchesPluginContext(state, openclawKeywordPatterns, message);
}
