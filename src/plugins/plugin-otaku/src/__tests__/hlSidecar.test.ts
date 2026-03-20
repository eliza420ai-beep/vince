import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { IAgentRuntime } from "@elizaos/core";
import {
  getHlSidecarBaseUrl,
  isHlSidecarConfigured,
  probeHlSidecarHealth,
  submitHlSidecarPerpsOrder,
  fetchHlSidecarReconcile,
  HL_SIDECAR_SCHEMA_VERSION,
} from "../lib/hlSidecar";

const mockRuntime = (settings: Record<string, string | undefined>) =>
  ({
    getSetting: (k: string) => settings[k],
  }) as unknown as IAgentRuntime;

describe("hlSidecar", () => {
  const origFetch = globalThis.fetch;
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    process.env = { ...origEnv };
  });

  it("getHlSidecarBaseUrl reads runtime setting", () => {
    const rt = mockRuntime({ OTAKU_HL_SIDECAR_URL: "http://localhost:9999" });
    expect(getHlSidecarBaseUrl(rt)).toBe("http://localhost:9999");
  });

  it("getHlSidecarBaseUrl falls back to process.env", () => {
    process.env.OTAKU_HL_SIDECAR_URL = "http://env-only:1";
    const rt = mockRuntime({});
    expect(getHlSidecarBaseUrl(rt)).toBe("http://env-only:1");
  });

  it("isHlSidecarConfigured is false when unset", () => {
    const rt = mockRuntime({});
    delete process.env.OTAKU_HL_SIDECAR_URL;
    expect(isHlSidecarConfigured(rt)).toBe(false);
  });

  it("submitHlSidecarPerpsOrder posts JSON and parses orderId", async () => {
    const rt = mockRuntime({ OTAKU_HL_SIDECAR_URL: "http://hl.test" });
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ orderId: "oid-42" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const out = await submitHlSidecarPerpsOrder(rt, {
      coin: "BTC",
      isBuy: true,
      size: "0.01",
      orderType: "market",
      correlationId: "corr-1",
    });

    expect(out.ok).toBe(true);
    expect(out.orderId).toBe("oid-42");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://hl.test/v1/perps/orders",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(body.schemaVersion).toBe(HL_SIDECAR_SCHEMA_VERSION);
    expect(body.correlationId).toBe("corr-1");
    expect(body.coin).toBe("BTC");
  });

  it("probeHlSidecarHealth tries /healthz", async () => {
    const rt = mockRuntime({ OTAKU_HL_SIDECAR_URL: "http://hl.test" });
    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.endsWith("/healthz")) {
        return new Response("ok", { status: 200 });
      }
      return new Response("no", { status: 404 });
    }) as unknown as typeof fetch;

    const out = await probeHlSidecarHealth(rt);
    expect(out.ok).toBe(true);
  });

  it("fetchHlSidecarReconcile prefers JSON summary", async () => {
    const rt = mockRuntime({ OTAKU_HL_SIDECAR_URL: "http://hl.test" });
    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.includes("/v1/reconcile")) {
        return new Response(
          JSON.stringify({ summary: "1 position, 0 orders" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      return new Response("no", { status: 404 });
    }) as unknown as typeof fetch;

    const out = await fetchHlSidecarReconcile(rt);
    expect(out.ok).toBe(true);
    expect(out.text).toContain("1 position");
  });
});
