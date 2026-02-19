/**
 * Action Handler Tests
 *
 * Tests handler logic with mocked services.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { xSaveResearchAction } from "../actions/xSaveResearch.action";
import { xSearchAction } from "../actions/xSearch.action";
import { setLastResearch } from "../store/lastResearchStore";
import type { Memory, IAgentRuntime, HandlerCallback } from "@elizaos/core";

const mockInitXClient = vi.fn();
vi.mock("../services/xClient.service", () => ({
  initXClientFromEnv: (...args: unknown[]) => mockInitXClient(...args),
}));

const mockSearchQuery = vi.fn();
vi.mock("../services/xSearch.service", () => ({
  getXSearchService: () => ({ searchQuery: mockSearchQuery }),
}));

const mockRuntime = {} as IAgentRuntime;

function createMemory(text: string, roomId?: string): Memory {
  return {
    content: { text },
    userId: "test-user",
    agentId: "test-agent",
    roomId: roomId ?? "test-room",
  } as Memory;
}

function createCallback(): HandlerCallback {
  return vi.fn();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("X_SAVE_RESEARCH handler", () => {
  it("calls callback with help when no roomId", async () => {
    const callback = createCallback();
    const memory = createMemory("save that");
    (memory as { roomId?: string }).roomId = undefined;

    await xSaveResearchAction.handler!(
      mockRuntime,
      memory,
      {},
      {},
      callback as HandlerCallback,
    );

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Couldn't determine room"),
        action: "X_SAVE_RESEARCH",
      }),
    );
  });

  it("calls callback with help when no lastResearch", async () => {
    const callback = createCallback();

    await xSaveResearchAction.handler!(
      mockRuntime,
      createMemory("save that", "room-with-no-pulse"),
      {},
      {},
      callback as HandlerCallback,
    );

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Nothing to save"),
        action: "X_SAVE_RESEARCH",
      }),
    );
  });

  it("saves and calls callback with filepath when lastResearch exists", async () => {
    const roomId = "room-save-test";
    const content = "📊 X Pulse\n\nBullish...";
    setLastResearch(roomId, content);
    const callback = createCallback();

    const testDir = join(tmpdir(), `x-research-handler-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const origEnv = process.env.X_RESEARCH_SAVE_DIR;
    process.env.X_RESEARCH_SAVE_DIR = testDir;

    try {
      await xSaveResearchAction.handler!(
        mockRuntime,
        createMemory("save that", roomId),
        {},
        {},
        callback as HandlerCallback,
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/Saved to .*research-\d{4}-\d{2}-\d{2}/),
          action: "X_SAVE_RESEARCH",
        }),
      );
      const match = (
        callback as ReturnType<typeof vi.fn>
      ).mock.calls[0][0].text.match(/Saved to `(.+)`/);
      if (match) {
        const filepath = match[1];
        expect(existsSync(filepath)).toBe(true);
        expect(readFileSync(filepath, "utf-8")).toBe(content);
      }
    } finally {
      if (origEnv !== undefined) process.env.X_RESEARCH_SAVE_DIR = origEnv;
      else delete process.env.X_RESEARCH_SAVE_DIR;
    }
  });

  it("calls callback with error when save fails", async () => {
    const roomId = "room-save-fail";
    setLastResearch(roomId, "Content to save");
    const callback = createCallback();
    const invalidDir = join(tmpdir(), `x-save-invalid-${Date.now()}`);
    writeFileSync(invalidDir, ""); // Create as file, not directory
    const origEnv = process.env.X_RESEARCH_SAVE_DIR;
    process.env.X_RESEARCH_SAVE_DIR = invalidDir;
    try {
      await xSaveResearchAction.handler!(
        mockRuntime,
        createMemory("save that", roomId),
        {},
        {},
        callback as HandlerCallback,
      );
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("Failed to save"),
          action: "X_SAVE_RESEARCH",
        }),
      );
    } finally {
      if (origEnv !== undefined) process.env.X_RESEARCH_SAVE_DIR = origEnv;
      else delete process.env.X_RESEARCH_SAVE_DIR;
    }
  });
});

describe("X_SEARCH handler", () => {
  it("calls callback with help when query cannot be extracted", async () => {
    const callback = createCallback();
    // "what is btc" doesn't match any extractQuery pattern
    const memory = createMemory("what is btc");

    await xSearchAction.handler!(
      mockRuntime,
      memory,
      {},
      {},
      callback as HandlerCallback,
    );

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("I need a search query"),
        action: "X_SEARCH",
      }),
    );
  });

  it("returns search results when query is extracted", async () => {
    mockSearchQuery.mockResolvedValueOnce([
      {
        id: "1",
        text: "BNKR looking strong",
        author: { username: "user1" },
        metrics: { likeCount: 42 },
      },
    ]);
    const callback = createCallback();
    await xSearchAction.handler!(
      mockRuntime,
      createMemory("Search X for BNKR", "room-1"),
      {},
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("BNKR"),
        action: "X_SEARCH",
      }),
    );
    expect(mockSearchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "BNKR",
        sortOrder: "relevancy",
      }),
    );
  });

  it("returns empty message when no results", async () => {
    mockSearchQuery.mockResolvedValueOnce([]);
    const callback = createCallback();
    await xSearchAction.handler!(
      mockRuntime,
      createMemory("Search X for obscurexyz123", "room-2"),
      {},
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("No matching posts"),
        action: "X_SEARCH",
      }),
    );
  });
});

describe("Plugin actions structure", () => {
  it("all actions have validate and handler defined", async () => {
    const { xResearchPlugin } = await import("../index");
    for (const action of xResearchPlugin.actions) {
      expect(action.validate).toBeDefined();
      expect(typeof action.validate).toBe("function");
      expect(action.handler).toBeDefined();
      expect(typeof action.handler).toBe("function");
    }
  });
});
