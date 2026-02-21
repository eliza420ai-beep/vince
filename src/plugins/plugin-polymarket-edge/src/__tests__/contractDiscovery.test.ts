/**
 * Tests for discoverContracts: Gamma API fetch, tag filter, error/empty handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { discoverContracts } from "../services/contractDiscovery";

const ENV_DISCOVERY_TAGS = "EDGE_DISCOVERY_TAGS";
const futureExpiry = new Date(Date.now() + 86400000 * 30).toISOString();

function gammaRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    conditionId: "0xcond123",
    question: "Will BTC be above $70,000 on Jan 1, 2026?",
    clobTokenIds: '["token-yes","token-no"]',
    outcomes: '["Yes","No"]',
    endDateIso: futureExpiry,
    ...overrides,
  };
}

describe("plugin-polymarket-edge: contractDiscovery", () => {
  let originalFetch: typeof fetch;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalEnv = process.env[ENV_DISCOVERY_TAGS];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv !== undefined)
      process.env[ENV_DISCOVERY_TAGS] = originalEnv;
    else delete process.env[ENV_DISCOVERY_TAGS];
  });

  it("returns list of contracts when API returns valid payload", async () => {
    globalThis.fetch = async (url: string | URL) => {
      const u = typeof url === "string" ? url : url.toString();
      if (u.includes("tag_slug=") || u.includes("limit=500")) {
        return new Response(JSON.stringify([gammaRow()]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("[]", { status: 200 });
    };

    const result = await discoverContracts("https://gamma.example.com");
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].conditionId).toBe("0xcond123");
    expect(result[0].question).toContain("BTC");
    expect(result[0].yesTokenId).toBe("token-yes");
    expect(result[0].noTokenId).toBe("token-no");
    expect(result[0].strikeUsd).toBeGreaterThan(0);
    expect(result[0].expiryMs).toBeGreaterThan(Date.now());
  });

  it("returns empty array when API returns non-ok", async () => {
    globalThis.fetch = async () => new Response("error", { status: 404 });

    const result = await discoverContracts("https://gamma.example.com");
    expect(result).toEqual([]);
  });

  it("returns empty array when API returns empty array", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const result = await discoverContracts("https://gamma.example.com");
    expect(result).toEqual([]);
  });

  it("handles fetch throwing without throwing", async () => {
    globalThis.fetch = async () => {
      throw new Error("Network error");
    };

    const result = await discoverContracts("https://gamma.example.com");
    expect(result).toEqual([]);
  });

  it("uses EDGE_DISCOVERY_TAGS when set", async () => {
    process.env[ENV_DISCOVERY_TAGS] = "custom_tag";
    const requestedUrls: string[] = [];
    globalThis.fetch = async (url: string | URL) => {
      const u = typeof url === "string" ? url : url.toString();
      requestedUrls.push(u);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await discoverContracts("https://gamma.example.com");
    const tagRequest = requestedUrls.find((u) =>
      u.includes("tag_slug=custom_tag"),
    );
    expect(tagRequest).toBeDefined();
    expect(tagRequest).toContain("tag_slug=custom_tag");
  });

  it("accepts data wrapper format from Gamma", async () => {
    let callCount = 0;
    globalThis.fetch = async (url: string | URL) => {
      const u = typeof url === "string" ? url : url.toString();
      callCount++;
      if (u.includes("limit=500")) {
        return new Response(
          JSON.stringify({
            data: [
              gammaRow({
                conditionId: "0xwrap",
                question: "Will BTC be above $80,000?",
              }),
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const result = await discoverContracts("https://gamma.example.com");
    expect(callCount).toBeGreaterThan(0);
    if (result.length >= 1) {
      expect(result[0].conditionId).toBe("0xwrap");
    }
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
