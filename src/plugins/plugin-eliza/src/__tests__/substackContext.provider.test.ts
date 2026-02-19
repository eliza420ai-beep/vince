/**
 * SubstackContextProvider tests.
 * Mocks fetch and runtime cache; asserts provider returns valid ProviderResult and does not throw.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { IAgentRuntime, Memory } from "@elizaos/core";
import { substackContextProvider } from "../providers/substackContext.provider";

const SAMPLE_RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Ikigai Studio</title>
    <item>
      <title>Test Post One</title>
      <link>https://ikigaistudio.substack.com/p/one</link>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
      <description>First post snippet.</description>
    </item>
    <item>
      <title>Test Post Two</title>
      <link>https://ikigaistudio.substack.com/p/two</link>
      <pubDate>Tue, 02 Jan 2024 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const SAMPLE_PROFILE_JSON = {
  results: [
    {
      identityHandle: "ikigaistudio",
      profileUrl: "https://substack.com/@ikigaistudio",
      followerCount: 1000,
      roughNumFreeSubscribers: 500,
      leaderboardStatus: { label: "Top in Technology", rank: 42 },
    },
  ],
};

function mockRuntime(overrides?: {
  getCache?: (key: string) => Promise<unknown>;
  setCache?: (key: string, value: unknown) => Promise<boolean>;
}): IAgentRuntime {
  return {
    agentId: "eliza-1",
    getCache: overrides?.getCache ?? (async () => undefined),
    setCache: overrides?.setCache ?? (async () => true),
  } as IAgentRuntime;
}

function mockMessage(): Memory {
  return {
    entityId: "user-1",
    content: { text: "What's our latest Substack post?" },
  } as Memory;
}

describe("SubstackContextProvider", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  it("returns valid ProviderResult with text and values", async () => {
    globalThis.fetch = async (url: string | URL) => {
      const u = typeof url === "string" ? url : url.toString();
      if (u.includes("substack.com/feed")) {
        return new Response(SAMPLE_RSS, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        });
      }
      return new Response("", { status: 404 });
    };

    const cache = new Map<string, unknown>();
    const runtime = mockRuntime({
      getCache: async (key) => cache.get(key),
      setCache: async (key, value) => {
        cache.set(key, value);
        return true;
      },
    });

    const result = await substackContextProvider.get(runtime, mockMessage());

    expect(result).toBeDefined();
    expect(typeof result.text).toBe("string");
    expect(result.values).toBeDefined();
    expect(Array.isArray(result.values?.substackRecentPosts)).toBe(true);
    const posts = result.values?.substackRecentPosts as {
      title: string;
      link: string;
    }[];
    expect(posts.length).toBeGreaterThanOrEqual(1);
    expect(posts[0].title).toBe("Test Post One");
    expect(posts[0].link).toContain("ikigaistudio.substack.com");
    expect(result.text).toContain("Recent Ikigai Studio Substack posts");
    expect(result.text).toContain("Test Post One");
  });

  it("does not throw when fetch fails", async () => {
    globalThis.fetch = async () => {
      throw new Error("Network error");
    };

    const runtime = mockRuntime({
      getCache: async () => undefined,
      setCache: async () => true,
    });

    const result = await substackContextProvider.get(runtime, mockMessage());

    expect(result).toBeDefined();
    expect(result.text).toBe("");
    expect(result.values?.substackRecentPosts).toEqual([]);
  });

  it("does not throw when RSS is malformed", async () => {
    globalThis.fetch = async (url: string | URL) => {
      const u = typeof url === "string" ? url : url.toString();
      if (u.includes("substack.com/feed")) {
        return new Response("<not>valid</rss>", { status: 200 });
      }
      return new Response("", { status: 404 });
    };

    const runtime = mockRuntime({
      getCache: async () => undefined,
      setCache: async () => true,
    });

    const result = await substackContextProvider.get(runtime, mockMessage());

    expect(result).toBeDefined();
    expect(result.values).toBeDefined();
  });

  it("includes profile when ELIZA_SUBSTACK_LINKEDIN_HANDLE is set", async () => {
    process.env.ELIZA_SUBSTACK_LINKEDIN_HANDLE = "johndoe";
    globalThis.fetch = async (url: string | URL) => {
      const u = typeof url === "string" ? url : url.toString();
      if (u.includes("substack.com/feed")) {
        return new Response(SAMPLE_RSS, { status: 200 });
      }
      if (u.includes("profile/search/linkedin")) {
        return new Response(JSON.stringify(SAMPLE_PROFILE_JSON), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("", { status: 404 });
    };

    const cache = new Map<string, unknown>();
    const runtime = mockRuntime({
      getCache: async (key) => cache.get(key),
      setCache: async (key, value) => {
        cache.set(key, value);
        return true;
      },
    });

    const result = await substackContextProvider.get(runtime, mockMessage());

    expect(result).toBeDefined();
    expect(result.text).toContain("Substack profile");
    expect(result.values?.substackProfile).toBeDefined();
    const profile = result.values?.substackProfile as {
      identityHandle?: string;
      followerCount?: number;
    };
    expect(profile?.identityHandle).toBe("ikigaistudio");
    expect(profile?.followerCount).toBe(1000);
  });
});
