import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { PasteTradeClient } from "../pasteTradeClient.ts";

describe("PasteTradeClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("createSource posts JSON with bearer auth", async () => {
    const fetchMock = mock(async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({
          source_id: "abc",
          source_url: "https://example/s/abc",
          run_id: "r1",
        }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const c = new PasteTradeClient("https://pt.test", "secret");
    const r = await c.createSource({
      url: "https://x.com/a/1",
      title: "t",
      platform: "web",
      body_text: "hello",
    });
    expect(r.source_id).toBe("abc");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined,
    ];
    expect(url).toBe("https://pt.test/api/sources");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret");
  });

  test("postSourceEvent returns false on failure", async () => {
    const fetchMock = mock(async () => ({
      ok: false,
      text: async () => "nope",
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const c = new PasteTradeClient("https://pt.test", "secret");
    const ok = await c.postSourceEvent("sid", "status", { message: "x" });
    expect(ok).toBe(false);
  });
});
