/**
 * Research Autopilot — X sentiment and price-target enrichment as a reusable structured object.
 * Callers can plug in runtime X services; default is placeholder per ticker.
 */

import type { TickerXEnrichment } from "./types";

export type EnrichmentFetcher = (
  ticker: string,
) => Promise<Partial<TickerXEnrichment>>;

/**
 * Build enrichment for each ticker. If fetcher is provided, use it; otherwise return placeholder.
 */
export async function enrichTickers(
  tickers: string[],
  fetcher?: EnrichmentFetcher,
): Promise<TickerXEnrichment[]> {
  const out: TickerXEnrichment[] = [];
  for (const symbol of tickers) {
    const base: TickerXEnrichment = {
      symbol,
      xSentimentScore: undefined,
      xSentimentLabel: undefined,
      dominantNarratives: undefined,
      keyAccounts: undefined,
      contrarianFlags: undefined,
      priceTargetLow: undefined,
      priceTargetBase: undefined,
      priceTargetHigh: undefined,
      targetConfidence: undefined,
      targetCitations: undefined,
    };
    if (fetcher) {
      try {
        const partial = await fetcher(symbol);
        out.push({ ...base, ...partial, symbol });
      } catch {
        out.push(base);
      }
    } else {
      out.push(base);
    }
  }
  return out;
}
