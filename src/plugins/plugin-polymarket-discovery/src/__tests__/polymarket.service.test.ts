import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { PolymarketService } from "../services/polymarket.service";
import { DEFAULT_GAMMA_API_URL, DEFAULT_CLOB_API_URL } from "../constants";
import type { IAgentRuntime } from "@elizaos/core";

const GAMMA_TAGS_PATH = "/tags";
const GAMMA_EVENTS_PATH = "/events";
const GAMMA_MARKETS_PATH = "/markets";
const CLOB_BOOK_PATH = "/book";

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

  it("getMarketPrices returns CLOB orderbook best-ask prices and last_updated", async () => {
    const conditionId = "0xprice123";
    const yesTokenId = "tid-yes";
    const noTokenId = "tid-no";
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes(GAMMA_MARKETS_PATH) && url.includes("limit=500")) {
        const markets = [
          {
            conditionId,
            question: "Test market?",
            outcomes: '["Yes","No"]',
            clobTokenIds: `["${yesTokenId}","${noTokenId}"]`,
            outcomePrices: '["0.6","0.4"]',
          },
        ];
        return new Response(JSON.stringify(markets));
      }
      if (url.includes(CLOB_BOOK_PATH)) {
        const isYes = url.includes(yesTokenId);
        const orderbook = {
          timestamp: Date.now(),
          market: conditionId,
          asset_id: isYes ? yesTokenId : noTokenId,
          bids: [] as any[],
          asks: isYes
            ? [{ price: "0.65", size: "100" }]
            : [{ price: "0.35", size: "100" }],
        };
        return new Response(JSON.stringify(orderbook));
      }
      return new Response(JSON.stringify({}), { status: 404 });
    };

    const mockRuntime = {
      getSetting: (key: string) => {
        if (key === "POLYMARKET_GAMMA_API_URL") return DEFAULT_GAMMA_API_URL;
        if (key === "POLYMARKET_CLOB_API_URL") return DEFAULT_CLOB_API_URL;
        return undefined;
      },
      agentId: "test-agent",
    } as unknown as IAgentRuntime;

    const service = await PolymarketService.start(mockRuntime);
    const prices = await service.getMarketPrices(conditionId);

    expect(prices.condition_id).toBe(conditionId);
    expect(prices.yes_price).toBe("0.65");
    expect(prices.no_price).toBe("0.35");
    expect(prices.yes_price_formatted).toContain("65");
    expect(prices.no_price_formatted).toContain("35");
    expect(prices.spread).toBeDefined();
    expect(typeof prices.last_updated).toBe("number");
    expect(prices.last_updated).toBeGreaterThan(0);
  });

  it("getPricesFromMarketPayload returns MarketPrices from tokens when present", async () => {
    const mockRuntime = {
      getSetting: () => undefined,
      agentId: "test-agent",
    } as unknown as IAgentRuntime;

    const service = await PolymarketService.start(mockRuntime);

    const marketWithTokens = {
      conditionId: "0xpayload",
      condition_id: "0xpayload",
      question: "Payload market?",
      tokens: [
        { token_id: "t1", outcome: "Yes", price: 0.6 },
        { token_id: "t2", outcome: "No", price: 0.4 },
      ],
    } as any;

    const prices = service.getPricesFromMarketPayload(marketWithTokens);
    expect(prices).not.toBeNull();
    expect(prices!.condition_id).toBe("0xpayload");
    expect(prices!.yes_price).toBe("0.6");
    expect(prices!.no_price).toBe("0.4");
    expect(prices!.last_updated).toBeGreaterThan(0);
  });

  it("getPricesFromMarketPayload returns MarketPrices from outcomePrices array when tokens lack price", async () => {
    const mockRuntime = {
      getSetting: () => undefined,
      agentId: "test-agent",
    } as unknown as IAgentRuntime;

    const service = await PolymarketService.start(mockRuntime);

    const marketWithOutcomePrices = {
      conditionId: "0xoutcome",
      condition_id: "0xoutcome",
      question: "Outcome market?",
      outcomePrices: ["0.72", "0.28"],
    } as any;

    const prices = service.getPricesFromMarketPayload(marketWithOutcomePrices);
    expect(prices).not.toBeNull();
    expect(prices!.condition_id).toBe("0xoutcome");
    expect(prices!.yes_price).toBe("0.72");
    expect(prices!.no_price).toBe("0.28");
  });

  it("getPricesFromMarketPayload returns null when no usable prices", async () => {
    const mockRuntime = {
      getSetting: () => undefined,
      agentId: "test-agent",
    } as unknown as IAgentRuntime;

    const service = await PolymarketService.start(mockRuntime);

    const marketNoPrices = {
      conditionId: "0xnone",
      question: "No prices?",
      tokens: [],
    } as any;

    const prices = service.getPricesFromMarketPayload(marketNoPrices);
    expect(prices).toBeNull();
  });

  it("getMarketPrices returns 0.50/0.50 when CLOB orderbook has empty asks", async () => {
    const conditionId = "0xempty";
    const yesTokenId = "tid-yes-empty";
    const noTokenId = "tid-no-empty";
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes(GAMMA_MARKETS_PATH) && url.includes("limit=500")) {
        const markets = [
          {
            conditionId,
            question: "Empty book market?",
            outcomes: '["Yes","No"]',
            clobTokenIds: `["${yesTokenId}","${noTokenId}"]`,
            outcomePrices: '["0.5","0.5"]',
          },
        ];
        return new Response(JSON.stringify(markets));
      }
      if (url.includes(CLOB_BOOK_PATH)) {
        const orderbook = {
          timestamp: Date.now(),
          market: conditionId,
          asset_id: url.includes(yesTokenId) ? yesTokenId : noTokenId,
          bids: [],
          asks: [],
        };
        return new Response(JSON.stringify(orderbook));
      }
      return new Response(JSON.stringify({}), { status: 404 });
    };

    const mockRuntime = {
      getSetting: (key: string) => {
        if (key === "POLYMARKET_GAMMA_API_URL") return DEFAULT_GAMMA_API_URL;
        if (key === "POLYMARKET_CLOB_API_URL") return DEFAULT_CLOB_API_URL;
        return undefined;
      },
      agentId: "test-agent",
    } as unknown as IAgentRuntime;

    const service = await PolymarketService.start(mockRuntime);
    const prices = await service.getMarketPrices(conditionId);

    expect(prices.condition_id).toBe(conditionId);
    expect(prices.yes_price).toBe("0.50");
    expect(prices.no_price).toBe("0.50");
    expect(prices.yes_price_formatted).toContain("50");
    expect(prices.no_price_formatted).toContain("50");
  });
});
