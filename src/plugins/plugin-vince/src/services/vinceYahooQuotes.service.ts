import type { Service } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { loadTop100FromMarkdown } from "../utils/top100Stocks";
import {
  readYahooQuoteFromCache,
  writeYahooQuoteToCache,
  type YahooQuoteEnvelope,
} from "../utils/yahooQuotesCache";
import * as fs from "node:fs";
import * as path from "node:path";

const YAHOO_ENDPOINT =
  "https://query1.finance.yahoo.com/v7/finance/quote?lang=en-US&region=US";

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

export class VinceYahooQuotesService implements Service {
  static serviceType = "VINCE_YAHOO_QUOTES_SERVICE" as const;
  readonly serviceType = VinceYahooQuotesService.serviceType;

  async refreshTop100Quotes(args?: {
    projectRoot?: string;
    ttlMs?: number;
  }): Promise<{
    requested: number;
    fetched: number;
    skippedFresh: number;
  }> {
    const projectRoot = args?.projectRoot ?? process.cwd();
    const ttlMs = args?.ttlMs ?? DEFAULT_TTL_MS;

    const { rows } = loadTop100FromMarkdown(projectRoot);
    const tickers = Array.from(
      new Set(rows.map((r) => r.ticker.toUpperCase().trim()).filter(Boolean)),
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
      return { requested: tickers.length, fetched: 0, skippedFresh };
    }

    const batchSize = 16;
    let fetched = 0;

    for (let i = 0; i < toFetch.length; i += batchSize) {
      const batch = toFetch.slice(i, i + batchSize);
      const url = `${YAHOO_ENDPOINT}&symbols=${encodeURIComponent(
        batch.join(","),
      )}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          logger.debug(
            `[VINCE][YahooQuotes] HTTP ${res.status} for batch ${batch.join(",")}`,
          );
          continue;
        }
        const body = (await res.json()) as any;
        const results: any[] = body?.quoteResponse?.result ?? [];
        const now = new Date().toISOString();
        for (const q of results) {
          const ticker = String(q.symbol ?? "")
            .toUpperCase()
            .trim();
          if (!ticker) continue;
          const env: YahooQuoteEnvelope = {
            ticker,
            price:
              typeof q.regularMarketPrice === "number"
                ? q.regularMarketPrice
                : undefined,
            change1dPct:
              typeof q.regularMarketChangePercent === "number"
                ? q.regularMarketChangePercent
                : undefined,
            marketCap:
              typeof q.marketCap === "number" ? q.marketCap : undefined,
            currency:
              typeof q.currency === "string"
                ? q.currency.toUpperCase()
                : undefined,
            avgVolume:
              typeof q.averageDailyVolume3Month === "number"
                ? q.averageDailyVolume3Month
                : undefined,
            updatedAt: now,
          };
          writeYahooQuoteToCache(projectRoot, env);
          fetched += 1;
        }
      } catch (e) {
        logger.debug(
          `[VINCE][YahooQuotes] fetch error for batch ${batch.join(",")}: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
    }

    return { requested: tickers.length, fetched, skippedFresh };
  }
}
