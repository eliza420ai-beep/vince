/**
 * POLYMARKET_VIBE — What do prediction markets say? (macro, stocks, crypto, BTC)
 *
 * Reads the Polymarket sentiment cache written by VincePolymarketSentimentService
 * and returns a short narrative for ECHO. No X API; file-based so ECHO can answer
 * without calling Vince/Oracle.
 */

import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";

const CACHE_DIR = "vince-paper-bot";
const CACHE_FILENAME = "polymarket-sentiment-cache.json";

function getCachePath(): string {
  return path.join(process.cwd(), ".elizadb", CACHE_DIR, CACHE_FILENAME);
}

interface SentimentEntry {
  score: number;
  label: string;
  confidence: number;
  marketCount: number;
}

interface CacheShape {
  updatedAt?: number;
  sentiment?: Record<string, SentimentEntry>;
}

function formatNarrative(sentiment: Record<string, SentimentEntry>): string {
  const lines: string[] = ["**Prediction markets (Polymarket)**"];
  const order = ["BTC", "ETH", "SOL", "macro", "stocks"];
  for (const key of order) {
    const e = sentiment[key];
    if (!e || e.marketCount === 0) continue;
    const pct = Math.round(e.score * 100);
    const dir =
      e.label === "bullish" ? "up" : e.label === "bearish" ? "down" : "neutral";
    lines.push(
      `• **${key}:** ${pct}% implied ${dir} (${e.marketCount} markets)`,
    );
  }
  if (lines.length <= 1) return "";
  return lines.join("\n");
}

export const polymarketVibeAction: Action = {
  name: "POLYMARKET_VIBE",
  description:
    "What do prediction markets say about BTC, macro, or stocks? Reads Polymarket odds (cache from Vince). Use when asked about prediction markets, Polymarket sentiment, or macro/crypto odds.",
  similes: [
    "GET_POLYMARKET_SENTIMENT",
    "PREDICTION_MARKET_VIBE",
    "POLYMARKET_SENTIMENT",
  ],

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("polymarket") ||
      text.includes("prediction market") ||
      text.includes("what do markets think") ||
      (text.includes("sentiment") &&
        (text.includes("macro") ||
          text.includes("btc") ||
          text.includes("odds")))
    );
  },

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const cachePath = getCachePath();
    if (!existsSync(cachePath)) {
      callback?.({
        text: "Prediction-market sentiment isn’t available yet (cache not populated). Vince’s Polymarket sentiment service fills it every 15–30 min when Polymarket discovery is enabled.",
        action: "POLYMARKET_VIBE",
      });
      return { success: true };
    }
    try {
      const raw = readFileSync(cachePath, "utf-8");
      const data = JSON.parse(raw) as CacheShape;
      const sentiment = data.sentiment ?? {};
      const narrative = formatNarrative(sentiment);
      if (!narrative) {
        callback?.({
          text: "No Polymarket sentiment buckets available yet. Check back after the next refresh (15–30 min).",
          action: "POLYMARKET_VIBE",
        });
        return { success: true };
      }
      const updated = data.updatedAt
        ? new Date(data.updatedAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "unknown";
      callback?.({
        text: `${narrative}\n\n_Updated ${updated}_`,
        action: "POLYMARKET_VIBE",
      });
      return { success: true };
    } catch {
      callback?.({
        text: "Could not read Polymarket sentiment cache. It may be empty or from an older format.",
        action: "POLYMARKET_VIBE",
      });
      return { success: true };
    }
  },
};
