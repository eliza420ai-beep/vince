/**
 * Proves the Hypersurface spot-prices flow: provider uses CoinGeckoService.getSimplePrices
 * and injects BTC, ETH, SOL, HYPE into state. Unit test with mock; e2e with real API.
 */

import { describe, it, expect, vi } from "vitest";
import { hypersurfaceSpotPricesProvider } from "../providers/hypersurfaceSpotPrices.provider";
import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";

function createMessage(text: string): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: uuidv4() as UUID,
    agentId: uuidv4() as UUID,
    content: { text, source: "test" },
    createdAt: Date.now(),
  };
}

function createRuntime(overrides: {
  getService?: (name: string) => unknown;
  getCache?: (key: string) => Promise<unknown>;
  setCache?: (key: string, value: unknown) => Promise<boolean>;
}): IAgentRuntime {
  return {
    agentId: uuidv4() as UUID,
    character: { name: "Solus" },
    getService: overrides.getService ?? (() => null),
    getCache: overrides.getCache ?? (async () => undefined),
    setCache: overrides.setCache ?? (async () => true),
  } as unknown as IAgentRuntime;
}

describe("SOLUS_HYPERSURFACE_SPOT_PRICES provider", () => {
  describe("unit (mock service)", () => {
    it("returns formatted text and values when service returns prices", async () => {
      const mockPrices = {
        bitcoin: 97_000,
        ethereum: 3_500.5,
        solana: 225.75,
        hyperliquid: 25.2,
      };
      const getService = vi.fn((name: string) =>
        name === "COINGECKO_SERVICE"
          ? { getSimplePrices: async () => ({ ...mockPrices }) }
          : null,
      );
      const setCache = vi.fn(async () => true);
      const runtime = createRuntime({
        getService,
        getCache: async () => undefined,
        setCache,
      });

      const result = await hypersurfaceSpotPricesProvider.get(
        runtime,
        createMessage("what strike for BTC?"),
      );

      expect(getService).toHaveBeenCalledWith("COINGECKO_SERVICE");
      expect(result?.text).toContain("[Hypersurface spot USD]");
      expect(result?.text).toMatch(/BTC \$97,000/);
      expect(result?.text).toMatch(/ETH \$3,500\.50/);
      expect(result?.text).toMatch(/SOL \$225\.75/);
      expect(result?.text).toMatch(/HYPE \$25\.20/);
      expect(result?.values?.hypersurfaceSpotPrices).toEqual(mockPrices);
      expect(setCache).toHaveBeenCalled();
    });

    it("returns empty when COINGECKO_SERVICE is missing", async () => {
      const runtime = createRuntime({ getService: () => null });

      const result = await hypersurfaceSpotPricesProvider.get(
        runtime,
        createMessage("strike ritual"),
      );

      expect(result?.text).toBeUndefined();
      expect(result?.values?.hypersurfaceSpotPrices).toBeUndefined();
    });

    it("uses cache when entry is fresh", async () => {
      const cached = {
        prices: { bitcoin: 1, ethereum: 2, solana: 3, hyperliquid: 4 },
        ts: Date.now() - 10_000,
      };
      const getSimplePrices = vi.fn(async () => ({}));
      const runtime = createRuntime({
        getService: (name) =>
          name === "COINGECKO_SERVICE" ? { getSimplePrices } : null,
        getCache: async () => cached,
      });

      const result = await hypersurfaceSpotPricesProvider.get(
        runtime,
        createMessage("optimal strike"),
      );

      expect(result?.text).toContain("[Hypersurface spot USD]");
      expect(result?.text).toContain("BTC $1");
      expect(getSimplePrices).not.toHaveBeenCalled();
    });
  });

  describe("e2e (real CoinGecko public API)", () => {
    it("fetches real BTC, ETH, SOL, HYPE from CoinGecko simple/price and provider injects them", async () => {
      const ids = ["bitcoin", "ethereum", "solana", "hyperliquid"];
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
        { headers: { Accept: "application/json" } },
      );
      expect(res.ok).toBe(true);
      const data = (await res.json()) as Record<string, { usd?: number }>;
      const prices: Record<string, number> = {};
      for (const id of ids) {
        const usd = data[id]?.usd;
        if (typeof usd === "number" && Number.isFinite(usd)) prices[id] = usd;
      }
      expect(Object.keys(prices).length).toBeGreaterThanOrEqual(2);
      expect(typeof prices.bitcoin).toBe("number");
      expect(typeof prices.ethereum).toBe("number");
      expect(prices.bitcoin).toBeGreaterThan(1000);
      expect(prices.ethereum).toBeGreaterThan(100);

      const runtime = createRuntime({
        getService: (name: string) =>
          name === "COINGECKO_SERVICE"
            ? { getSimplePrices: async () => prices }
            : null,
        getCache: async () => undefined,
        setCache: async () => true,
      });
      const result = await hypersurfaceSpotPricesProvider.get(
        runtime,
        createMessage("strike ritual"),
      );

      expect(result?.text).toContain("[Hypersurface spot USD]");
      expect(result?.text).toMatch(/BTC \$/);
      expect(result?.text).toMatch(/ETH \$/);
      expect(result?.values?.hypersurfaceSpotPrices).toEqual(prices);
    }, 15_000);
  });
});
