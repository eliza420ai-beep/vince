/**
 * FinnhubService — Stock quotes, company profile, and company news for Solus offchain watchlist.
 * Free tier: 60 calls/min. Quotes cached 5 min; profile 1 hour; news per request with short window.
 */

import { logger, Service, type IAgentRuntime } from "@elizaos/core";
import {
  SOLUS_OFFCHAIN_STOCKS,
  isSolusOffchainTicker,
  getSectorForTicker,
} from "../constants/solusStockWatchlist";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const QUOTE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface FinnhubQuote {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number; // high
  l: number; // low
  o: number; // open
  pc: number; // previous close
  t: number; // timestamp
}

export interface FinnhubCompanyProfile {
  name: string;
  ticker: string;
  weburl?: string;
  logo?: string;
  finnhubIndustry?: string;
  marketCapitalization?: number;
}

export interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

function getApiKey(runtime: IAgentRuntime): string | null {
  const key =
    (runtime.getSetting("FINNHUB_API_KEY") as string) ||
    process.env.FINNHUB_API_KEY;
  return key?.trim() || null;
}

export class FinnhubService extends Service {
  static serviceType = "FINNHUB_SERVICE" as const;
  capabilityDescription =
    "Stock quotes, company profile, and company news for Solus offchain watchlist (Finnhub).";

  private quoteCache = new Map<string, { data: FinnhubQuote; ts: number }>();
  private profileCache = new Map<
    string,
    { data: FinnhubCompanyProfile; ts: number }
  >();

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<FinnhubService> {
    const svc = new FinnhubService(runtime);
    return svc;
  }

  async stop(): Promise<void> {
    this.quoteCache.clear();
    this.profileCache.clear();
  }

  isConfigured(): boolean {
    return Boolean(getApiKey(this.runtime));
  }

  /** Fetch quote; returns null if not configured or symbol not in watchlist. */
  async getQuote(symbol: string): Promise<FinnhubQuote | null> {
    const key = getApiKey(this.runtime);
    if (!key) return null;
    const sym = symbol.trim().toUpperCase();
    if (!isSolusOffchainTicker(sym)) return null;

    const cached = this.quoteCache.get(sym);
    if (cached && Date.now() - cached.ts < QUOTE_CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(sym)}&token=${key}`;
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn("[FinnhubService] quote not ok: " + res.status);
        return null;
      }
      const data = (await res.json()) as FinnhubQuote;
      if (data.c == null && data.d == null) return null;
      this.quoteCache.set(sym, { data, ts: Date.now() });
      return data;
    } catch (e) {
      logger.warn("[FinnhubService] getQuote error: " + (e as Error).message);
      return null;
    }
  }

  /** Fetch company profile; returns null if not configured or not in watchlist. */
  async getCompanyProfile(
    symbol: string,
  ): Promise<FinnhubCompanyProfile | null> {
    const key = getApiKey(this.runtime);
    if (!key) return null;
    const sym = symbol.trim().toUpperCase();
    if (!isSolusOffchainTicker(sym)) return null;

    const cached = this.profileCache.get(sym);
    if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const url = `${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${key}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = (await res.json()) as FinnhubCompanyProfile;
      if (!data?.name) return null;
      this.profileCache.set(sym, { data, ts: Date.now() });
      return data;
    } catch (e) {
      logger.warn(
        "[FinnhubService] getCompanyProfile error: " + (e as Error).message,
      );
      return null;
    }
  }

  /** Fetch company news (last 7 days). Limit count to avoid token explosion. */
  async getCompanyNews(symbol: string, count = 5): Promise<FinnhubNewsItem[]> {
    const key = getApiKey(this.runtime);
    if (!key) return [];
    const sym = symbol.trim().toUpperCase();
    if (!isSolusOffchainTicker(sym)) return [];

    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 7);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    try {
      const url = `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(sym)}&from=${fromStr}&to=${toStr}&token=${key}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const arr = (await res.json()) as FinnhubNewsItem[];
      if (!Array.isArray(arr)) return [];
      return arr.slice(0, count);
    } catch (e) {
      logger.warn(
        "[FinnhubService] getCompanyNews error: " + (e as Error).message,
      );
      return [];
    }
  }

  /** Get tickers for a sector (from watchlist). */
  getTickersForSector(sector: string): string[] {
    const norm = sector.trim();
    return SOLUS_OFFCHAIN_STOCKS.filter(
      (s) => s.sector.toLowerCase() === norm.toLowerCase(),
    ).map((s) => s.ticker);
  }

  /** Resolve message to requested tickers: explicit tickers + tickers for mentioned sectors. */
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
    if (tickers.size === 0 && sectors.size === 0) {
      return { tickers: [], sectors: [] };
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
