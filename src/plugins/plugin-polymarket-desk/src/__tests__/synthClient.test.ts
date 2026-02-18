import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getSynthForecast, type SynthForecast } from "../services/synthClient";

describe("plugin-polymarket-desk: synthClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SYNTH_API_KEY;
    delete process.env.SYNTH_API_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getSynthForecast", () => {
    it("returns mock forecast when SYNTH_API_KEY is not set", async () => {
      const result = await getSynthForecast("BTC");
      expect(result).toBeDefined();
      expect(result.source).toBe("synth_mock");
      expect(result.asset).toBe("BTC");
      expect(typeof result.probability).toBe("number");
      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(1);
    });

    it("returns mock forecast when apiKey is explicitly null", async () => {
      const result = await getSynthForecast("ETH", null);
      expect(result.source).toBe("synth_mock");
      expect(result.asset).toBe("ETH");
    });

    it("returns mock forecast when apiKey is empty string", async () => {
      const result = await getSynthForecast("SOL", "");
      expect(result.source).toBe("synth_mock");
    });

    it("mock probability is deterministic per asset (seed-based)", async () => {
      const a = await getSynthForecast("BTC");
      const b = await getSynthForecast("BTC");
      expect(a.probability).toBe(b.probability);
      const c = await getSynthForecast("ETH");
      expect(typeof c.probability).toBe("number");
    });

    it("calls Synth API when SYNTH_API_KEY is set and returns parsed probability", async () => {
      let fetchUrl = "";
      let fetchOpts: RequestInit = {};
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        fetchUrl = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
        fetchOpts = init ?? {};
        return new Response(JSON.stringify({ probability: 0.62 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const result = await getSynthForecast("BTC", "test-key");
      expect(result.source).toBe("synth");
      expect(result.probability).toBe(0.62);
      expect(result.asset).toBe("BTC");
      expect(fetchUrl).toContain("prediction-percentiles");
      expect(fetchUrl).toContain("asset=BTC");
      expect((fetchOpts.headers as Record<string, string>)?.Authorization).toBe("Apikey test-key");
    });

    it("falls back to mock when Synth API returns non-OK", async () => {
      globalThis.fetch = async () =>
        new Response("Unauthorized", { status: 401 });

      const result = await getSynthForecast("BTC", "bad-key");
      expect(result.source).toBe("synth_mock");
    });

    it("uses percentile50 when probability is missing in API response", async () => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ percentile50: 0.55 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      const result = await getSynthForecast("BTC", "key");
      expect(result.probability).toBe(0.55);
    });

    it("uses baseUrl parameter when provided", async () => {
      let fetchUrl = "";
      globalThis.fetch = async (input: RequestInfo | URL) => {
        fetchUrl = typeof input === "string" ? input : (input as Request).url;
        return new Response(JSON.stringify({ probability: 0.5 }), { status: 200 });
      };

      await getSynthForecast("BTC", "key", "https://custom.synth.api");
      expect(fetchUrl).toMatch(/^https:\/\/custom\.synth\.api/);
    });

    it("normalizes asset to uppercase in real API response", async () => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ probability: 0.5 }), { status: 200 });

      const result = await getSynthForecast("eth", "key");
      expect(result.asset).toBe("ETH");
    });
  });
});
