import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type {
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { setLastResearch } from "../store/lastResearchStore";

const mockInitXClient = vi.fn();
const mockGetXSearchService = vi.fn();
const mockTavilySearch = vi.fn();

vi.mock("../services/xClient.service", () => ({
  initXClientFromEnv: (...args: unknown[]) => mockInitXClient(...args),
}));

vi.mock("../services/xSearch.service", () => ({
  getXSearchService: () => mockGetXSearchService(),
}));

vi.mock("../utils/tavilySearch", () => ({
  tavilySearch: (...args: unknown[]) => mockTavilySearch(...args),
}));

function createMemory(text: string, roomId = "room-proof"): Memory {
  return {
    content: { text },
    entityId: "00000000-0000-0000-0000-000000000001",
    userId: "u1",
    agentId: "00000000-0000-0000-0000-00000000000a",
    roomId,
  } as Memory;
}

function createCallback(): HandlerCallback {
  return vi.fn();
}

function expectExactKeys(value: unknown, expected: string[]): void {
  const obj = value as Record<string, unknown>;
  expect(Object.keys(obj).sort()).toEqual([...expected].sort());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Signal quality improvement proofs", () => {
  it("clawterm report filters duplicate and irrelevant tweets", async () => {
    let capturedPrompt = "";
    const runtime = {
      getSetting: vi.fn((key: string) => {
        if (key === "X_BEARER_TOKEN") return "x-token";
        if (key === "TAVILY_API_KEY") return "t-token";
        return null;
      }),
      useModel: vi.fn(async (_type: unknown, params: { prompt: string }) => {
        capturedPrompt = params.prompt;
        return "Daily OpenClaw report";
      }),
    } as unknown as IAgentRuntime;

    const nowIso = new Date().toISOString();
    mockGetXSearchService.mockReturnValue({
      searchQuery: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "1",
            text: "OpenClaw gateway is shipping faster this week",
            createdAt: nowIso,
            author: { username: "builder1" },
            metrics: { likeCount: 120 },
          },
          {
            id: "2",
            text: "OpenClaw gateway is shipping faster this week",
            createdAt: nowIso,
            author: { username: "builder2" },
            metrics: { likeCount: 20 },
          },
          {
            id: "3",
            text: "unrelated sports update not about ai agents",
            createdAt: nowIso,
            author: { username: "noise" },
            metrics: { likeCount: 9000 },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "4",
            text: "AGI researchers debate alignment in agentic systems",
            createdAt: nowIso,
            author: { username: "researcher" },
            metrics: { likeCount: 88 },
          },
        ]),
    });
    mockTavilySearch.mockResolvedValue(["OpenClaw release notes"]);

    const callback = createCallback();
    const { clawtermDayReportAction } =
      await import("../actions/clawtermDayReport.action");
    await clawtermDayReportAction.handler!(
      runtime,
      createMemory("what's hot today"),
      {} as State,
      {},
      callback,
    );

    expect(capturedPrompt).toContain(
      "OpenClaw gateway is shipping faster this week",
    );
    expect(capturedPrompt).toContain("AGI researchers debate alignment");
    expect(capturedPrompt).not.toContain("unrelated sports update");
    const callbackPayload = (callback as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(callbackPayload).toEqual(
      expect.objectContaining({
        action: "CLAWTERM_DAY_REPORT",
        sourceStats: expect.objectContaining({
          xCandidates: 4,
          xSelected: expect.any(Number),
          xDropped: expect.any(Number),
        }),
      }),
    );
    expect(callbackPayload.sourceStats.xDropped).toBeGreaterThan(0);
    expectExactKeys(callbackPayload.sourceStats, [
      "xCandidates",
      "xSelected",
      "xDropped",
      "xReason",
      "webSnippets",
    ]);
  });

  it("clawterm returns reason-coded no-data-source response", async () => {
    const origX = process.env.X_BEARER_TOKEN;
    const origT = process.env.TAVILY_API_KEY;
    delete process.env.X_BEARER_TOKEN;
    delete process.env.TAVILY_API_KEY;
    const runtime = {
      getSetting: vi.fn(() => null),
    } as unknown as IAgentRuntime;
    const callback = createCallback();
    try {
      const { clawtermDayReportAction } =
        await import("../actions/clawtermDayReport.action");
      await clawtermDayReportAction.handler!(
        runtime,
        createMemory("day report"),
        {} as State,
        {},
        callback,
      );
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CLAWTERM_DAY_REPORT",
          reason: "no_data_sources",
        }),
      );
    } finally {
      if (origX !== undefined) process.env.X_BEARER_TOKEN = origX;
      if (origT !== undefined) process.env.TAVILY_API_KEY = origT;
    }
  });

  it("xSaveResearch writes metadata header and saveMeta payload", async () => {
    const roomId = `room-proof-${Date.now()}`;
    setLastResearch(
      roomId,
      "📊 X Pulse\n\nBTC sentiment improved with stronger ETF flow context.",
    );
    const testDir = join(tmpdir(), `x-save-proof-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const origEnv = process.env.X_RESEARCH_SAVE_DIR;
    process.env.X_RESEARCH_SAVE_DIR = testDir;
    const callback = createCallback();

    try {
      const { xSaveResearchAction } =
        await import("../actions/xSaveResearch.action");
      await xSaveResearchAction.handler!(
        {} as IAgentRuntime,
        createMemory("save that", roomId),
        {} as State,
        {},
        callback,
      );
      const payload = (callback as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(payload).toEqual(
        expect.objectContaining({
          action: "X_SAVE_RESEARCH",
          saveMeta: expect.objectContaining({
            hasMetadataHeader: true,
          }),
        }),
      );
      expectExactKeys(payload.saveMeta, ["chars", "hasMetadataHeader"]);
      const match = String(payload.text).match(/Saved to `(.+)`/);
      expect(match?.[1]).toBeTruthy();
      const savedBody = readFileSync(match![1], "utf-8");
      expect(savedBody).toContain("source: plugin-x-research");
      expect(savedBody).toContain(`roomId: ${roomId}`);
      expect(savedBody).toContain("savedAt:");
      expect(savedBody).toContain("BTC sentiment improved");
    } finally {
      if (origEnv !== undefined) process.env.X_RESEARCH_SAVE_DIR = origEnv;
      else delete process.env.X_RESEARCH_SAVE_DIR;
    }
  });

  it("xSaveResearch rejects low-value content with reason code", async () => {
    const roomId = `room-low-${Date.now()}`;
    setLastResearch(roomId, "too short");
    const callback = createCallback();
    const { xSaveResearchAction } =
      await import("../actions/xSaveResearch.action");
    await xSaveResearchAction.handler!(
      {} as IAgentRuntime,
      createMemory("save that", roomId),
      {} as State,
      {},
      callback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "X_SAVE_RESEARCH",
        reason: "low_value_filtered",
      }),
    );
  });

  it("schema contract: sourceStats keeps expected field set", async () => {
    const runtime = {
      getSetting: vi.fn((key: string) => {
        if (key === "X_BEARER_TOKEN") return "x-token";
        if (key === "TAVILY_API_KEY") return "t-token";
        return null;
      }),
      useModel: vi.fn(async () => "Daily OpenClaw report"),
    } as unknown as IAgentRuntime;
    mockGetXSearchService.mockReturnValue({
      searchQuery: vi.fn().mockResolvedValue([
        {
          id: "1",
          text: "OpenClaw alignment work accelerates in agent stack",
          createdAt: new Date().toISOString(),
          author: { username: "builder" },
          metrics: { likeCount: 10 },
        },
      ]),
    });
    mockTavilySearch.mockResolvedValue([]);
    const callback = createCallback();
    const { clawtermDayReportAction } =
      await import("../actions/clawtermDayReport.action");
    await clawtermDayReportAction.handler!(
      runtime,
      createMemory("what's hot today"),
      {} as State,
      {},
      callback,
    );
    const payload = (callback as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expectExactKeys(payload.sourceStats, [
      "xCandidates",
      "xSelected",
      "xDropped",
      "xReason",
      "webSnippets",
    ]);
    expect(typeof payload.sourceStats.xReason).toBe("string");
  });

  it("schema contract: saveMeta keeps expected field set", async () => {
    const roomId = `room-meta-${Date.now()}`;
    setLastResearch(
      roomId,
      "Long enough content to verify schema contract on saveMeta fields.",
    );
    const testDir = join(tmpdir(), `x-save-meta-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const origEnv = process.env.X_RESEARCH_SAVE_DIR;
    process.env.X_RESEARCH_SAVE_DIR = testDir;
    const callback = createCallback();
    try {
      const { xSaveResearchAction } =
        await import("../actions/xSaveResearch.action");
      await xSaveResearchAction.handler!(
        {} as IAgentRuntime,
        createMemory("save that", roomId),
        {} as State,
        {},
        callback,
      );
      const payload = (callback as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expectExactKeys(payload.saveMeta, ["chars", "hasMetadataHeader"]);
      expect(typeof payload.saveMeta.chars).toBe("number");
      expect(payload.saveMeta.hasMetadataHeader).toBe(true);
    } finally {
      if (origEnv !== undefined) process.env.X_RESEARCH_SAVE_DIR = origEnv;
      else delete process.env.X_RESEARCH_SAVE_DIR;
    }
  });
});
