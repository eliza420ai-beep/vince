import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Memory } from "@elizaos/core";
import fs from "node:fs";
import {
  aihfSecondOpinionProvider,
  __resetAihfSecondOpinionProviderCacheForTests,
} from "../providers/aihfSecondOpinion.provider";

function createMemory(text: string): Memory {
  return {
    id: "test",
    entityId: "e1" as any,
    roomId: "r1" as any,
    agentId: "a1" as any,
    content: { text, source: "test" } as any,
    createdAt: Date.now(),
  };
}

describe("aihfSecondOpinionProvider", () => {
  const prev = process.env;

  beforeEach(async () => {
    process.env = { ...prev };
    vi.resetAllMocks();
    // In case other tests set it.
    delete process.env.AIHF_BASE_URL;
    delete process.env.AIHF_LAST_SECOND_OPINION_ENDPOINT;
    delete process.env.AIHF_SECOND_OPINION_READ_TIMEOUT_MS;
    delete process.env.AIHF_SECOND_OPINION_CACHE_TTL_MS;
    delete process.env.AIHF_LAST_SECOND_OPINION_FILE;
    delete process.env.AIHF_ARTIFACT_ROOT;
    delete process.env.AIHF_LAST_SECOND_OPINION_MAX_AGE_MS;
    delete process.env.VINCE_AIH_F_SECOND_OPINION_HTTP_ENABLED;
    __resetAihfSecondOpinionProviderCacheForTests();
  });

  afterEach(() => {
    process.env = prev;
    vi.restoreAllMocks();
  });

  it("does not fetch when message does not mention AIHF/committee/second-opinion", async () => {
    const fetchMock = vi.fn();
    // @ts-expect-error - stub global
    globalThis.fetch = fetchMock;

    process.env.AIHF_BASE_URL = "http://example.com";
    process.env.VINCE_AIH_F_SECOND_OPINION_HTTP_ENABLED = "true";
    const runtime = { agentId: "vince" } as any;

    const res = await aihfSecondOpinionProvider.get(
      runtime,
      createMemory("status update please"),
      { values: {}, data: {}, text: "" } as any,
    );
    expect(res).toEqual({});
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it("fetches and returns cached values when keywords are present", async () => {
    const payload = {
      summary: { overall_direction: "neutral" },
      agree_buckets: { bullish: ["AMZN"] },
      disagree_buckets: { bearish: ["MSTR"] },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    // @ts-expect-error - stub global
    globalThis.fetch = fetchMock;

    process.env.AIHF_BASE_URL = "http://example.com";
    process.env.AIHF_LAST_SECOND_OPINION_ENDPOINT =
      "/api/v1/second-opinion/last";
    process.env.AIHF_SECOND_OPINION_READ_TIMEOUT_MS = "2000";
    process.env.AIHF_SECOND_OPINION_CACHE_TTL_MS = "100000";
    process.env.VINCE_AIH_F_SECOND_OPINION_HTTP_ENABLED = "true";

    const runtime = { agentId: "vince" } as any;
    const message = createMemory("What does the AIHF committee think?");

    const res1 = await aihfSecondOpinionProvider.get(runtime, message, {
      values: {},
      data: {},
      text: "",
    } as any);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((res1 as any)?.values?.aihfSecondOpinion).toEqual(payload);

    const res2 = await aihfSecondOpinionProvider.get(runtime, message, {
      values: {},
      data: {},
      text: "",
    } as any);
    expect(fetchMock).toHaveBeenCalledTimes(1); // cached
    expect((res2 as any)?.values?.aihfSecondOpinion).toEqual(payload);
  });

  it("returns {} on fetch failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    // @ts-expect-error - stub global
    globalThis.fetch = fetchMock;

    process.env.AIHF_BASE_URL = "http://example.com";
    process.env.VINCE_AIH_F_SECOND_OPINION_HTTP_ENABLED = "true";
    const runtime = { agentId: "vince" } as any;

    const res = await aihfSecondOpinionProvider.get(
      runtime,
      createMemory("second opinion: AIHF"),
      { values: {}, data: {}, text: "" } as any,
    );
    expect(res).toEqual({});
  });

  it("reads and returns payload from local file when present", async () => {
    const payload = {
      generated_at_ms: Date.now(),
      summary: { overall_direction: "neutral" },
      agree_buckets: { bullish: ["AMZN"] },
      disagree_buckets: { bearish: ["MSTR"] },
    };

    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(payload));
    const existsSpy = vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "statSync").mockReturnValue({
      mtimeMs: Date.now(),
    } as any);

    const fetchMock = vi.fn();
    // @ts-expect-error - stub global
    globalThis.fetch = fetchMock;

    process.env.AIHF_LAST_SECOND_OPINION_FILE = "/tmp/aihf.json";
    process.env.VINCE_AIH_F_SECOND_OPINION_HTTP_ENABLED = "false";

    const runtime = { agentId: "vince" } as any;
    const res = await aihfSecondOpinionProvider.get(
      runtime,
      createMemory("What does AIHF committee think?"),
      { values: {}, data: {}, text: "" } as any,
    );

    expect(existsSpy).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect((res as any)?.values?.aihfSecondOpinion).toEqual(payload);
  });

  it("treats file as fresh via mtime when generated_at_ms is missing", async () => {
    const payload = {
      summary: { overall_direction: "neutral" },
      agree_buckets: { bullish: ["AMZN"] },
      disagree_buckets: { bearish: ["MSTR"] },
    };

    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(payload));
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const now = Date.now();
    vi.spyOn(fs, "statSync").mockReturnValue({
      mtimeMs: now,
    } as any);

    process.env.AIHF_LAST_SECOND_OPINION_FILE = "/tmp/aihf.json";
    process.env.AIHF_LAST_SECOND_OPINION_MAX_AGE_MS = "1000";
    process.env.VINCE_AIH_F_SECOND_OPINION_HTTP_ENABLED = "false";

    const runtime = { agentId: "vince" } as any;
    const res = await aihfSecondOpinionProvider.get(
      runtime,
      createMemory("What does AIHF committee think?"),
      { values: {}, data: {}, text: "" } as any,
    );

    expect((res as any)?.values?.aihfSecondOpinion).toEqual(payload);
  });
});
