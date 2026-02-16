/**
 * SOLUS_HYPERSURFACE_SPOT_PRICES — Injects real-time BTC, ETH, SOL, HYPE spot prices (USD) into state.
 * Uses plugin-coingecko CoinGeckoService.getSimplePrices. Cache TTL 60s to avoid rate limits.
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";

const HYPERSURFACE_COIN_IDS = ["bitcoin", "ethereum", "solana", "hyperliquid"] as const;
const CACHE_KEY = "solus:hypersurface_spot_prices";
const CACHE_TTL_MS = 60_000;

function formatPrices(prices: Record<string, number>): string {
  const btc = prices.bitcoin;
  const eth = prices.ethereum;
  const sol = prices.solana;
  const hype = prices.hyperliquid;
  const parts: string[] = [];
  if (typeof btc === "number") parts.push(`BTC $${btc.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
  if (typeof eth === "number") parts.push(`ETH $${eth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  if (typeof sol === "number") parts.push(`SOL $${sol.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  if (typeof hype === "number") parts.push(`HYPE $${hype.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  if (parts.length === 0) return "";
  return parts.join(", ");
}

export const hypersurfaceSpotPricesProvider: Provider = {
  name: "SOLUS_HYPERSURFACE_SPOT_PRICES",
  description:
    "Real-time spot prices (USD) for Hypersurface assets: BTC, ETH, SOL, HYPE. From CoinGecko via plugin-coingecko. Cached 60s.",
  position: -4,

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    const cacheEntry = await runtime.getCache<{ prices: Record<string, number>; ts: number }>(CACHE_KEY);
    if (cacheEntry && Date.now() - cacheEntry.ts < CACHE_TTL_MS && Object.keys(cacheEntry.prices).length > 0) {
      const text = formatPrices(cacheEntry.prices);
      if (text) {
        return {
          text: `[Hypersurface spot USD] ${text}`,
          values: { hypersurfaceSpotPrices: cacheEntry.prices },
        };
      }
    }

    const service = runtime.getService("COINGECKO_SERVICE") as unknown as { getSimplePrices: (ids: string[]) => Promise<Record<string, number>> } | null;
    if (!service?.getSimplePrices) {
      return {};
    }

    try {
      const prices = await service.getSimplePrices([...HYPERSURFACE_COIN_IDS]);
      await runtime.setCache(CACHE_KEY, { prices, ts: Date.now() });
      const text = formatPrices(prices);
      if (!text) return {};
      return {
        text: `[Hypersurface spot USD] ${text}`,
        values: { hypersurfaceSpotPrices: prices },
      };
    } catch (error) {
      logger.debug("[Solus] Hypersurface spot prices fetch failed: " + (error instanceof Error ? error.message : String(error)));
      return {};
    }
  },
};
