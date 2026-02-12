import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { PolymarketService } from "../services/polymarket.service";
import { DEFAULT_GAMMA_API_URL } from "../constants";
import type { IAgentRuntime } from "@elizaos/core";

const GAMMA_TAGS_PATH = "/tags";
const GAMMA_EVENTS_PATH = "/events";

describe("PolymarketService", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getMarketsByPreferredTags returns deduplicated, volume-sorted list respecting totalLimit", async () => {
    const tagId = "1";
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes(GAMMA_TAGS_PATH)) {
        return new Response(
          JSON.stringify([
            { id: tagId, label: "Bitcoin", slug: "bitcoin" },
            { id: "2", label: "Ethereum", slug: "ethereum" },
          ])
        );
      }
      if (url.includes(GAMMA_EVENTS_PATH)) {
        const events = [
          {
            conditionId: "0xaaa",
            id: "0xaaa",
            markets: [
              {
                conditionId: "0xaaa",
                question: "BTC above 100k?",
                volume: "500000",
                outcomes: '["Yes","No"]',
                clobTokenIds: '["tid1","tid2"]',
                outcomePrices: '["0.6","0.4"]',
              },
            ],
          },
          {
            conditionId: "0xbbb",
            id: "0xbbb",
            markets: [
              {
                conditionId: "0xbbb",
                question: "ETH above 5k?",
                volume: "1000000",
                outcomes: '["Yes","No"]',
                clobTokenIds: '["tid3","tid4"]',
                outcomePrices: '["0.5","0.5"]',
              },
            ],
          },
        ];
        return new Response(JSON.stringify(events));
      }
      return new Response(JSON.stringify({}), { status: 404 });
    };

    const mockRuntime = {
      getSetting: (key: string) => {
        if (key === "POLYMARKET_GAMMA_API_URL") return DEFAULT_GAMMA_API_URL;
        if (key === "POLYMARKET_CLOB_API_URL") return "https://clob.polymarket.com";
        return undefined;
      },
      agentId: "test-agent",
    } as unknown as IAgentRuntime;

    const service = await PolymarketService.start(mockRuntime);
    const result = await service.getMarketsByPreferredTags({
      tagSlugs: ["bitcoin"],
      limitPerTag: 10,
      totalLimit: 5,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(5);
    if (result.length >= 2) {
      const vol0 = Number(result[0].volume ?? result[0].liquidity ?? 0);
      const vol1 = Number(result[1].volume ?? result[1].liquidity ?? 0);
      expect(vol0).toBeGreaterThanOrEqual(vol1);
    }
    const ids = result.map((m) => m.conditionId ?? (m as any).condition_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("getMarketsByPreferredTags respects totalLimit", async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes(GAMMA_TAGS_PATH)) {
        return new Response(JSON.stringify([{ id: "1", label: "Bitcoin", slug: "bitcoin" }]));
      }
      if (url.includes(GAMMA_EVENTS_PATH)) {
        const markets = Array.from({ length: 10 }, (_, i) => ({
          conditionId: `0x${i}`,
          id: `0x${i}`,
          markets: [
            {
              conditionId: `0x${i}`,
              question: `Market ${i}`,
              volume: String(1000000 - i * 10000),
              outcomes: '["Yes","No"]',
              clobTokenIds: '["a","b"]',
              outcomePrices: '["0.5","0.5"]',
            },
          ],
        }));
        return new Response(JSON.stringify(markets));
      }
      return new Response(JSON.stringify({}), { status: 404 });
    };

    const mockRuntime = {
      getSetting: () => undefined,
      agentId: "test-agent",
    } as unknown as IAgentRuntime;

    const service = await PolymarketService.start(mockRuntime);
    const result = await service.getMarketsByPreferredTags({
      tagSlugs: ["bitcoin"],
      limitPerTag: 20,
      totalLimit: 3,
    });

    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("getMarketsByPreferredTags resolves fed-rates when Gamma has slug fed_rates and label Fed Rates", async () => {
    const tagIdFed = "10";
    const tagIdEconomy = "20";
    let requestedTagIds: string[] = [];
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes(GAMMA_TAGS_PATH)) {
        return new Response(
          JSON.stringify([
            { id: tagIdFed, label: "Fed Rates", slug: "fed_rates" },
            { id: tagIdEconomy, label: "Economy", slug: "economy" },
          ])
        );
      }
      if (url.includes(GAMMA_EVENTS_PATH)) {
        const tagIdMatch = url.match(/tag_id=(\d+)/);
        if (tagIdMatch) requestedTagIds.push(tagIdMatch[1]);
        const events = [
          {
            conditionId: "0xfeed",
            id: "0xfeed",
            markets: [
              {
                conditionId: "0xfeed",
                question: "Fed rate cut?",
                volume: "100000",
                outcomes: '["Yes","No"]',
                clobTokenIds: '["a","b"]',
                outcomePrices: '["0.7","0.3"]',
              },
            ],
          },
        ];
        return new Response(JSON.stringify(events));
      }
      return new Response(JSON.stringify({}), { status: 404 });
    };

    const mockRuntime = {
      getSetting: (key: string) => {
        if (key === "POLYMARKET_GAMMA_API_URL") return DEFAULT_GAMMA_API_URL;
        if (key === "POLYMARKET_CLOB_API_URL") return "https://clob.polymarket.com";
        return undefined;
      },
      agentId: "test-agent",
    } as unknown as IAgentRuntime;

    const service = await PolymarketService.start(mockRuntime);
    const result = await service.getMarketsByPreferredTags({
      tagSlugs: ["fed-rates", "economy"],
      limitPerTag: 5,
      totalLimit: 10,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(requestedTagIds).toContain(tagIdFed);
    expect(requestedTagIds).toContain(tagIdEconomy);
    expect(requestedTagIds.length).toBe(2);
  });

  it("getEventsByTag resolves pre-market when Gamma has slug pre_market", async () => {
    const tagId = "30";
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes(GAMMA_TAGS_PATH)) {
        return new Response(
          JSON.stringify([{ id: tagId, label: "Pre-market", slug: "pre_market" }])
        );
      }
      if (url.includes(GAMMA_EVENTS_PATH)) {
        const events = [
          {
            conditionId: "0xpre",
            id: "0xpre",
            markets: [
              {
                conditionId: "0xpre",
                question: "Pre-market move?",
                volume: "50000",
                outcomes: '["Yes","No"]',
                clobTokenIds: '["x","y"]',
                outcomePrices: '["0.5","0.5"]',
              },
            ],
          },
        ];
        return new Response(JSON.stringify(events));
      }
      return new Response(JSON.stringify({}), { status: 404 });
    };

    const mockRuntime = {
      getSetting: (key: string) => {
        if (key === "POLYMARKET_GAMMA_API_URL") return DEFAULT_GAMMA_API_URL;
        if (key === "POLYMARKET_CLOB_API_URL") return "https://clob.polymarket.com";
        return undefined;
      },
      agentId: "test-agent",
    } as unknown as IAgentRuntime;

    const service = await PolymarketService.start(mockRuntime);
    const result = await service.getEventsByTag("pre-market", 10);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].question).toBe("Pre-market move?");
  });
});
