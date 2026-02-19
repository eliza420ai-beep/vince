/**
 * AlphaVantageService — Stock quotes and news for Solus offchain watchlist (Alpha Vantage REST API).
 * Use alongside or as fallback to Finnhub. Free tier: 25 req/day; cache aggressively.
 * For Cursor/IDE ad-hoc research, use the Alpha Vantage MCP: https://mcp.alphavantage.co/
 */

import { logger, Service, type IAgentRuntime } from "@elizaos/core";
import {
  SOLUS_OFFCHAIN_STOCKS,
  isSolusOffchainTicker,
  getSectorForTicker,
} from "../constants/solusStockWatchlist";

const AV_BASE = "https://www.alphavantage.co/query";
const QUOTE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 min (free tier limit)

/** Normalized quote shape for provider (same as Finnhub-style). */
export interface AlphaVantageQuoteNormalized {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
}

/** Alpha Vantage GLOBAL_QUOTE response. */
interface AVGlobalQuoteResponse {
  "Global Quote"?: {
    "01. symbol"?: string;
    "05. price"?: string;
    "09. change"?: string;
    "10. change percent"?: string;
    [key: string]: string | undefined;
  };
}

/** Alpha Vantage NEWS_SENTIMENT item. */
export interface AlphaVantageNewsItem {
  title?: string;
  summary?: string;
  url?: string;
  time_published?: string;
  source?: string;
}

interface AVNewsResponse {
  feed?: AlphaVantageNewsItem[];
}

function getApiKey(runtime: IAgentRuntime): string | null {
  const key =
    (runtime.getSetting("ALPHA_VANTAGE_API_KEY") as string) ||
    process.env.ALPHA_VANTAGE_API_KEY;
  return key?.trim() || null;
}

function parsePercent(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = parseFloat(String(s).replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

export class AlphaVantageService extends Service {
  static serviceType = "ALPHA_VANTAGE_SERVICE" as const;
  capabilityDescription =
    "Stock quotes and news for Solus offchain watchlist (Alpha Vantage). MCP for Cursor: https://mcp.alphavantage.co/";

  private quoteCache = new Map<
    string,
    { data: AlphaVantageQuoteNormalized; ts: number }
  >();

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<AlphaVantageService> {
    return new AlphaVantageService(runtime);
  }

  async stop(): Promise<void> {
    this.quoteCache.clear();
  }

  isConfigured(): boolean {
    return Boolean(getApiKey(this.runtime));
  }

  /** Fetch quote; returns null if not configured or symbol not in watchlist. */
  async getQuote(symbol: string): Promise<AlphaVantageQuoteNormalized | null> {
    const key = getApiKey(this.runtime);
    if (!key) return null;
    const sym = symbol.trim().toUpperCase();
    if (!isSolusOffchainTicker(sym)) return null;

    const cached = this.quoteCache.get(sym);
    if (cached && Date.now() - cached.ts < QUOTE_CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn("[AlphaVantageService] quote not ok: " + res.status);
        return null;
      }
      const data = (await res.json()) as AVGlobalQuoteResponse;
      const gq = data["Global Quote"];
      if (!gq || gq["05. price"] == null) return null;

      const price = parseFloat(String(gq["05. price"]).trim());
      const change = parseFloat(String(gq["09. change"] ?? "0").trim());
      const changePercent = parsePercent(gq["10. change percent"]);
      if (!Number.isFinite(price)) return null;

      const normalized: AlphaVantageQuoteNormalized = {
        c: price,
        d: Number.isFinite(change) ? change : 0,
        dp: changePercent,
      };
      this.quoteCache.set(sym, { data: normalized, ts: Date.now() });
      return normalized;
    } catch (e) {
      logger.warn(
        "[AlphaVantageService] getQuote error: " + (e as Error).message,
      );
      return null;
    }
  }

  /** Fetch news for ticker (NEWS_SENTIMENT). Limit count to conserve quota. */
  async getNews(symbol: string, count = 5): Promise<AlphaVantageNewsItem[]> {
    const key = getApiKey(this.runtime);
    if (!key) return [];
    const sym = symbol.trim().toUpperCase();
    if (!isSolusOffchainTicker(sym)) return [];

    try {
      const url = `${AV_BASE}?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}&limit=${Math.min(count, 10)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = (await res.json()) as AVNewsResponse;
      const feed = data.feed;
      if (!Array.isArray(feed)) return [];
      return feed.slice(0, count);
    } catch (e) {
      logger.warn(
        "[AlphaVantageService] getNews error: " + (e as Error).message,
      );
      return [];
    }
  }

  /** Resolve message to requested tickers (same logic as Finnhub). */
  getRequestedTickers(messageText: string): {
    tickers: string[];
    sectors: string[];
  } {
    const text = (messageText || "").toLowerCase();
    const tickers = new Set<string>();
    const sectors = new Set<string>();

    for (const { ticker, sector } of SOLUS_OFFCHAIN_STOCKS) {
      if (text.includes(ticker.toLowerCase())) {
        tickers.add(ticker);
        sectors.add(sector);
      }
      if (text.includes(sector.toLowerCase())) {
        sectors.add(sector);
        tickers.add(ticker);
      }
    }
    return {
      tickers: [...tickers],
      sectors: [...sectors],
    };
  }

  getSectorForTicker(ticker: string): string | null {
    return getSectorForTicker(ticker);
  }
}
