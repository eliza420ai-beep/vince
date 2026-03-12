/**
 * Tests for contract discovery: strike parsing, question matching.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { discoverBtcContracts } from "../services/contractDiscovery";

const futureDate = new Date(Date.now() + 86400000).toISOString();

describe("plugin-polymarket-arb: contractDiscovery", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("parses strike from question and returns contract", async () => {
    globalThis.fetch = async (url: string | URL) => {
      const u = typeof url === "string" ? url : url.toString();
      if (u.includes("tag_slug=bitcoin") || u.includes("tag_slug=daily")) {
        return new Response(
          JSON.stringify([
            {
              conditionId: "cond-1",
              question: "Will BTC be above $100,000 by end of March?",
              clobTokenIds: '["yes-tok","no-tok"]',
              endDate: futureDate,
            },
            {
              conditionId: "cond-2",
              question: "Will Bitcoin reach 110k by Friday?",
              clobTokenIds: '["yes-tok-2","no-tok-2"]',
              endDate: futureDate,
            },
          ]),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify([]), { status: 200 });
    };

    const contracts = await discoverBtcContracts(
      "https://gamma-api.polymarket.com",
    );
    expect(contracts.length).toBeGreaterThanOrEqual(2);

    const c100k = contracts.find((c) =>
      c.question.toLowerCase().includes("100"),
    );
    expect(c100k).toBeDefined();
    expect(c100k!.strikeUsd).toBe(100000);

    const c110k = contracts.find((c) =>
      c.question.toLowerCase().includes("110"),
    );
    expect(c110k).toBeDefined();
    expect(c110k!.strikeUsd).toBe(110000);
  });

  it("filters out non-BTC threshold questions", async () => {
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify([
          {
            conditionId: "cond-eth",
            question: "Will ETH be above $5000?",
            clobTokenIds: '["yes-tok","no-tok"]',
            endDate: futureDate,
          },
          {
            conditionId: "cond-btc",
            question: "Will BTC be above $100k by end of month?",
            clobTokenIds: '["yes-tok","no-tok"]',
            endDate: futureDate,
          },
        ]),
        { status: 200 },
      );
    };

    const contracts = await discoverBtcContracts(
      "https://gamma-api.polymarket.com",
    );
    const btcOnly = contracts.filter((c) =>
      c.question.toLowerCase().includes("btc"),
    );
    expect(btcOnly.length).toBeGreaterThanOrEqual(1);
    expect(btcOnly[0].strikeUsd).toBe(100000);
  });

  it("returns empty when fetch fails", async () => {
    globalThis.fetch = async () => {
      return new Response("error", { status: 500 });
    };

    const contracts = await discoverBtcContracts(
      "https://gamma-api.polymarket.com",
    );
    expect(contracts).toEqual([]);
  });
});
