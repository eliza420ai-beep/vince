/**
 * SOLUS_STOCK_PULSE — Injects quote + news for offchain watchlist when the message
 * mentions a sector or ticker. Uses Finnhub first; falls back to Alpha Vantage if Finnhub
 * is not configured. Returns empty when not relevant to avoid unnecessary API calls.
 * For Cursor/IDE ad-hoc research: Alpha Vantage MCP https://mcp.alphavantage.co/
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import type { FinnhubService } from "../services/finnhub.service";
import type { AlphaVantageService } from "../services/alphaVantage.service";

const MAX_TICKERS_IN_PULSE = 6;
const NEWS_PER_TICKER = 2;

function wantsStockContext(messageText: string): boolean {
  const t = (messageText || "").toLowerCase();
  const stockKeywords = [
    "stock",
    "stocks",
    "sector",
    "ionq",
    "nbis",
    "iren",
    "leu",
    "oklo",
    "ccj",
    "uuuu",
    "vst",
    "ceg",
    "pltr",
    "rklb",
    "asts",
    "amd",
    "nvda",
    "intc",
    "quantum",
    "nuclear",
    "defense",
    "robotics",
    "battery",
    "space",
    "copper",
    "rare earth",
    "semiconductor",
    "ai infrastructure",
    "ai energy",
  ];
  return stockKeywords.some((k) => t.includes(k));
}

export const solusStockPulseProvider: Provider = {
  name: "SOLUS_STOCK_PULSE",
  description:
    "Quote and recent news for Solus offchain watchlist (Finnhub or Alpha Vantage). Alpha Vantage MCP: https://mcp.alphavantage.co/",
  position: 10,

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    const text = message.content?.text || "";
    if (!wantsStockContext(text)) {
      return { text: "", values: {} };
    }

    const finnhub = runtime.getService("FINNHUB_SERVICE") as
      | FinnhubService
      | null
      | undefined;
    const alphaVantage = runtime.getService("ALPHA_VANTAGE_SERVICE") as
      | AlphaVantageService
      | null
      | undefined;

    const useFinnhub = finnhub?.isConfigured?.();
    const useAlphaVantage = alphaVantage?.isConfigured?.();

    if (!useFinnhub && !useAlphaVantage) {
      return {
        text: "[Stock pulse] Set FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY for offchain quotes and news. In Cursor/IDE you can use the Alpha Vantage MCP: https://mcp.alphavantage.co/",
        values: { solusStockPulse: null },
      };
    }

    const source = useFinnhub ? finnhub! : alphaVantage!;
    const { tickers } = source.getRequestedTickers(text);
    const uniq = [...new Set(tickers)].slice(0, MAX_TICKERS_IN_PULSE);
    if (uniq.length === 0) {
      return { text: "", values: {} };
    }

    const lines: string[] = [
      "[Offchain stock pulse — not tradeable on Hyperliquid]",
      useFinnhub ? "(Source: Finnhub)" : "(Source: Alpha Vantage)",
    ];
    for (const ticker of uniq) {
      const sector = source.getSectorForTicker(ticker);
      if (useFinnhub) {
        const [quote, news] = await Promise.all([
          finnhub!.getQuote(ticker),
          finnhub!.getCompanyNews(ticker, NEWS_PER_TICKER),
        ]);
        if (quote) {
          const ch = quote.dp >= 0 ? "+" : "";
          lines.push(
            `${ticker} (${sector || "?"}): $${quote.c?.toFixed(2) ?? "—"} (${ch}${quote.dp?.toFixed(2) ?? "—"}%)`,
          );
        } else {
          lines.push(`${ticker} (${sector || "?"}): no quote`);
        }
        if (news.length > 0) {
          for (const n of news.slice(0, 2)) {
            lines.push(`  • ${n.headline || n.summary?.slice(0, 80) || "—"}`);
          }
        }
      } else {
        const [quote, news] = await Promise.all([
          alphaVantage!.getQuote(ticker),
          alphaVantage!.getNews(ticker, NEWS_PER_TICKER),
        ]);
        if (quote) {
          const ch = quote.dp >= 0 ? "+" : "";
          lines.push(
            `${ticker} (${sector || "?"}): $${quote.c?.toFixed(2) ?? "—"} (${ch}${quote.dp?.toFixed(2) ?? "—"}%)`,
          );
        } else {
          lines.push(`${ticker} (${sector || "?"}): no quote`);
        }
        if (news.length > 0) {
          for (const n of news.slice(0, 2)) {
            lines.push(`  • ${n.title || n.summary?.slice(0, 80) || "—"}`);
          }
        }
      }
    }
    const pulseText = lines.join("\n");
    return {
      text: pulseText,
      values: { solusStockPulse: pulseText },
    };
  },
};
