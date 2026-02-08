/**
 * Close a crypto intel recommendation (Phase 4).
 * Triggers: "close recommendation TOKEN", "mark TOKEN as closed", "close rec TOKEN"
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { getMemoryDir } from "../memory/intelligenceLog";
import {
  getOpenRecommendations,
  updateRecommendation,
} from "../memory/recommendations";
import { appendTrackRecordEntry } from "../memory/trackRecord";
import type { VinceMarketDataService } from "../services/marketData.service";
import type { RecommendationEntry, ScenarioPlayedOut } from "../types/cryptoIntelMemory";

function parseCloseCommand(text: string): { ticker: string; scenario?: ScenarioPlayedOut } | null {
  const lower = text.toLowerCase().trim();
  const match = lower.match(
    /(?:close\s+recommendation|mark\s+.*?\s+as\s+closed|close\s+rec)\s+\$?(\w+)(?:\s+(bull|base|bear))?/i,
  );
  if (!match) return null;
  const scenario = match[2]?.toLowerCase() as ScenarioPlayedOut | undefined;
  if (scenario && !["bull", "base", "bear"].includes(scenario)) return null;
  return { ticker: match[1].toUpperCase(), scenario };
}

export const closeRecommendationAction: Action = {
  name: "CLOSE_RECOMMENDATION",
  similes: ["CLOSE_REC", "MARK_RECOMMENDATION_CLOSED"],
  description: "Close an open crypto intel recommendation by ticker and optionally record scenario (bull/base/bear)",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.trim() || "";
    return parseCloseCommand(text) !== null;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    const text = message.content.text?.trim() || "";
    const parsed = parseCloseCommand(text);
    if (!parsed) {
      await callback({
        text: "Use: close recommendation TOKEN or mark TOKEN as closed. Optionally add bull, base, or bear for scenario played out.",
        actions: ["CLOSE_RECOMMENDATION"],
      });
      return;
    }

    const memoryDir = getMemoryDir(runtime);
    const openRecs = await getOpenRecommendations(memoryDir);
    const rec = openRecs.find(
      (r) => r.ticker.toUpperCase() === parsed.ticker,
    );
    if (!rec) {
      await callback({
        text: `No open recommendation found for ${parsed.ticker}. Check spelling or list open recommendations.`,
        actions: ["CLOSE_RECOMMENDATION"],
      });
      return;
    }

    let currentPrice = rec.price;
    const marketData = runtime.getService(
      "VINCE_MARKET_DATA_SERVICE",
    ) as VinceMarketDataService | null;
    if (marketData?.getEnrichedContext) {
      try {
        const ctx = await marketData.getEnrichedContext(rec.ticker);
        if (ctx?.currentPrice) currentPrice = ctx.currentPrice;
      } catch {
        // keep entry price
      }
    }

    const pnl =
      rec.action === "buy"
        ? ((currentPrice - rec.price) / rec.price) * 100
        : ((rec.price - currentPrice) / rec.price) * 100;
    const closeDate = new Date().toISOString().slice(0, 10);

    const updated: Partial<RecommendationEntry> = {
      status: "closed",
      close_date: closeDate,
      current_price: currentPrice,
      pnl,
      close_reason: "User closed via chat",
      scenario_played_out: parsed.scenario,
    };

    const ok = await updateRecommendation(memoryDir, rec.ticker, updated);
    if (!ok) {
      await callback({
        text: `Failed to update recommendation for ${rec.ticker}.`,
        actions: ["CLOSE_RECOMMENDATION"],
      });
      return;
    }

    await appendTrackRecordEntry(memoryDir, {
      ticker: rec.ticker,
      action: rec.action,
      open_date: rec.date,
      close_date: closeDate,
      pnl,
      scenario_played_out: parsed.scenario,
      close_reason: updated.close_reason,
    });

    logger.info(
      { ticker: rec.ticker, pnl, scenario: parsed.scenario },
      "[CLOSE_REC] Recommendation closed",
    );
    await callback({
      text: `Closed ${rec.ticker} (${rec.action}). Entry $${rec.price.toFixed(2)} → current $${currentPrice.toFixed(2)}. PnL: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%${parsed.scenario ? ` (scenario: ${parsed.scenario})` : ""}.`,
      actions: ["CLOSE_RECOMMENDATION"],
    });
  },
};
