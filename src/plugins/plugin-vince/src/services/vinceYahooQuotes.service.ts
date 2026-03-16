import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import YahooFinance from "yahoo-finance2";
import { loadDexterPortfolioAssets } from "../utils/dexterPortfolio";
import { writeProfileToCache } from "../utils/top100ProfileCache";
import {
  readYahooQuoteFromCache,
  writeYahooQuoteToCache,
  type YahooQuoteEnvelope,
} from "../utils/yahooQuotesCache";
import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getYahooCachePath(projectRoot: string, ticker: string): string {
  const dir = path.join(projectRoot, ".elizadb", "yahoo-quotes");
  return path.join(dir, `${ticker.toUpperCase().trim()}.json`);
}

function isFresh(projectRoot: string, ticker: string, ttlMs: number): boolean {
  try {
    const p = getYahooCachePath(projectRoot, ticker);
    const stat = fs.statSync(p);
    return Date.now() - stat.mtimeMs < ttlMs;
  } catch {
    return false;
  }
}

export class VinceYahooQuotesService extends Service {
  static serviceType = "VINCE_YAHOO_QUOTES_SERVICE" as const;
  readonly serviceType = VinceYahooQuotesService.serviceType;
  capabilityDescription =
    "Yahoo Finance quote cache for Top100 tickers (price, 1D, marketCap, avgVolume)";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceYahooQuotesService> {
    return new VinceYahooQuotesService(runtime);
  }

  async stop(): Promise<void> {}

  async refreshTop100Quotes(args?: {
    projectRoot?: string;
    ttlMs?: number;
    batchSize?: number;
    retryMisses?: boolean;
  }): Promise<{
    requested: number;
    fetched: number;
    skippedFresh: number;
    missed: string[];
  }> {
    const projectRoot = args?.projectRoot ?? process.cwd();
    const ttlMs = args?.ttlMs ?? DEFAULT_TTL_MS;
    const batchSize = args?.batchSize ?? 16;
    const retryMisses = args?.retryMisses !== false;

    const assets = loadDexterPortfolioAssets(projectRoot);
    const tickers = Array.from(
      new Set(assets.map((a) => a.ticker.toUpperCase().trim()).filter(Boolean)),
    );

    const toFetch: string[] = [];
    let skippedFresh = 0;
    for (const t of tickers) {
      if (
        isFresh(projectRoot, t, ttlMs) &&
        readYahooQuoteFromCache(projectRoot, t)
      ) {
        skippedFresh += 1;
        continue;
      }
      toFetch.push(t);
    }

    if (!toFetch.length) {
      return {
        requested: tickers.length,
        fetched: 0,
        skippedFresh,
        missed: [],
      };
    }

    let fetched = 0;
    const fetchedTickers = new Set<string>();

    const yahooFinance = new YahooFinance();
    const now = new Date().toISOString();

    const doBatch = async (batch: string[]): Promise<string[]> => {
      const missed: string[] = [];
      await Promise.all(
        batch.map(async (ticker) => {
          try {
            const q = await yahooFinance.quote(ticker);
            if (!q) {
              missed.push(ticker);
              return;
            }
            const sym = String((q as Record<string, unknown>).symbol ?? ticker)
              .toUpperCase()
              .trim();
            const reg = q as Record<string, unknown>;
            const env: YahooQuoteEnvelope = {
              ticker: sym,
              price:
                typeof reg.regularMarketPrice === "number"
                  ? reg.regularMarketPrice
                  : undefined,
              change1dPct:
                typeof reg.regularMarketChangePercent === "number"
                  ? reg.regularMarketChangePercent
                  : undefined,
              marketCap:
                typeof reg.marketCap === "number" ? reg.marketCap : undefined,
              currency:
                typeof reg.currency === "string"
                  ? (reg.currency as string).toUpperCase()
                  : undefined,
              avgVolume:
                typeof reg.averageDailyVolume3Month === "number"
                  ? reg.averageDailyVolume3Month
                  : undefined,
              updatedAt: now,
            };
            writeYahooQuoteToCache(projectRoot, env);
            if (typeof env.marketCap === "number") {
              writeProfileToCache(projectRoot, {
                ticker: env.ticker,
                marketCap: env.marketCap,
                currency: env.currency,
                avgVolume: env.avgVolume,
                updatedAt: env.updatedAt,
              });
            }
            fetched += 1;
            fetchedTickers.add(sym);
          } catch (e) {
            logger.debug(
              `[VINCE][YahooQuotes] fetch error for ${ticker}: ${
                e instanceof Error ? e.message : String(e)
              }`,
            );
            missed.push(ticker);
          }
        }),
      );
      return missed;
    };

    for (let i = 0; i < toFetch.length; i += batchSize) {
      const batch = toFetch.slice(i, i + batchSize);
      await doBatch(batch);
    }

    let stillMissing = toFetch.filter(
      (t) =>
        !fetchedTickers.has(t) &&
        (!readYahooQuoteFromCache(projectRoot, t) ||
          !isFresh(projectRoot, t, ttlMs)),
    );

    if (retryMisses && stillMissing.length > 0 && stillMissing.length <= 50) {
      for (const t of stillMissing) {
        await doBatch([t]);
      }
    }

    const missed = tickers.filter(
      (t) =>
        !readYahooQuoteFromCache(projectRoot, t) ||
        !isFresh(projectRoot, t, ttlMs),
    );

    return {
      requested: tickers.length,
      fetched,
      skippedFresh,
      missed,
    };
  }
}
