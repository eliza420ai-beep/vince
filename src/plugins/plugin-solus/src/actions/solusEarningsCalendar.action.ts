/**
 * Solus Earnings Calendar Action — Upcoming earnings for watchlist stocks.
 */

import {
  type Action,
  type ActionExample,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from "@elizaos/core";
import { SOLUS_OFFCHAIN_STOCKS } from "../constants/solusStockWatchlist";
import { FMPService } from "../services/fmp.service";
import { FinnhubService } from "../services/finnhub.service";

export const solusEarningsCalendarAction: Action = {
  name: "SOLUS_EARNINGS_CALENDAR",
  description: "Get upcoming earnings dates for Solus watchlist stocks",
  examples: [
    [
      {
        name: "earnings calendar",
        content: { text: "What earnings are coming up this week?" },
      },
      {
        name: "earnings",
        content: { text: "Show me the earnings calendar" },
      },
      {
        name: "NVDA earnings",
        content: { text: "When is NVDA reporting earnings?" },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("earnings") || text.includes("calendar");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
  ): Promise<void> => {
    const text = message.content?.text || "";

    // Extract specific ticker if mentioned
    const tickerMatch = text.match(/\b([A-Z]{2,5})\b/);
    const specificTicker = tickerMatch ? tickerMatch[1] : null;

    const fmp = runtime.getService<FMPService>("FMP_SERVICE");

    if (!fmp || !fmp.isConfigured()) {
      console.log(
        "⚠️ FMP not configured — set FMP_API_KEY for earnings calendar",
      );
      return;
    }

    try {
      // Get all earnings in next 30 days
      const allEarnings = await fmp.getEarningsCalendar();

      if (specificTicker) {
        // Filter for specific ticker
        const filtered = allEarnings.filter((e) => e.symbol === specificTicker);
        if (filtered.length === 0) {
          console.log(`No upcoming earnings found for ${specificTicker}`);
          return;
        }
        console.log(`## 📅 Earnings for ${specificTicker}`);
        filtered.forEach((e) => {
          const isPast = new Date(e.date) <= new Date();
          console.log(`- **${e.date}** (${isPast ? "reported" : "upcoming"})`);
          console.log(
            `  EPS: $${e.eps?.toFixed(2) || "N/A"} (est: $${e.epsEstimate?.toFixed(2) || "N/A"})`,
          );
          console.log(
            `  Revenue: $${(e.revenue / 1e9).toFixed(1)}B (est: $${(e.revenueEstimate / 1e9).toFixed(1)}B)`,
          );
        });
      } else {
        // Show all watchlist earnings
        const watchlistSymbols = SOLUS_OFFCHAIN_STOCKS.map((s) => s.ticker);
        const watchlistEarnings = allEarnings.filter((e) =>
          watchlistSymbols.includes(e.symbol),
        );

        // Sort by date
        watchlistEarnings.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        if (watchlistEarnings.length === 0) {
          console.log("No upcoming earnings found for watchlist stocks");
          return;
        }

        console.log(`## 📅 Upcoming Earnings (Next 30 Days)`);
        console.log(
          `Found ${watchlistEarnings.length} earnings from watchlist\n`,
        );

        // Group by week
        const now = new Date();
        const thisWeek: typeof watchlistEarnings = [];
        const nextWeek: typeof watchlistEarnings = [];
        const later: typeof watchlistEarnings = [];

        watchlistEarnings.forEach((e) => {
          const date = new Date(e.date);
          const daysDiff = Math.floor(
            (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (daysDiff <= 0) {
            // Already reported - show as recent
            thisWeek.push(e);
          } else if (daysDiff <= 7) {
            thisWeek.push(e);
          } else if (daysDiff <= 14) {
            nextWeek.push(e);
          } else {
            later.push(e);
          }
        });

        if (thisWeek.length > 0) {
          console.log("### This Week");
          thisWeek.forEach((e) => {
            const isPast = new Date(e.date) <= now;
            console.log(
              `- **${e.symbol}** — ${e.date} ${isPast ? "(reported)" : ""}`,
            );
            console.log(
              `  EPS: $${e.eps?.toFixed(2) || "?"} (est: $${e.epsEstimate?.toFixed(2) || "?"})`,
            );
          });
        }

        if (nextWeek.length > 0) {
          console.log("\n### Next Week");
          nextWeek.forEach((e) => {
            console.log(`- **${e.symbol}** — ${e.date}`);
            console.log(`  EPS Est: $${e.epsEstimate?.toFixed(2) || "?"}`);
          });
        }

        if (later.length > 0) {
          console.log("\n### Later");
          later.forEach((e) => {
            console.log(`- **${e.symbol}** — ${e.date}`);
            console.log(`  EPS Est: $${e.epsEstimate?.toFixed(2) || "?"}`);
          });
        }
      }

      return;
    } catch (e) {
      logger.error("[SolusEarningsCalendar] Error: " + (e as Error).message);
      return;
    }
  },

  similes: ["EARNINGS_CALENDAR", "EARNINGS", "REPORTING_DATES"],
};
