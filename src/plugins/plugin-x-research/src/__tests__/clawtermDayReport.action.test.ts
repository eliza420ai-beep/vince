/**
 * CLAWTERM_DAY_REPORT action tests.
 * Asserts: validation triggers, prompt contains ALOHA-style rules and NO AI SLOP,
 * context contains X and web data, output style checks (no banned phrases, length).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  Memory,
  IAgentRuntime,
  HandlerCallback,
  State,
} from "@elizaos/core";
import type { XTweet } from "../types/tweet.types";

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

function createTweet(text: string, username = "testuser"): XTweet {
  return {
    id: `tweet-${Math.random().toString(36).slice(2)}`,
    text,
    authorId: "12345",
    createdAt: new Date().toISOString(),
    author: {
      id: "12345",
      username,
      name: "Test User",
    },
    metrics: {
      likeCount: 42,
      retweetCount: 5,
      replyCount: 2,
      quoteCount: 0,
    },
  };
}

function createMemory(text: string): Memory {
  return {
    content: { text },
    entityId: "00000000-0000-0000-0000-000000000001",
    userId: "u1",
    agentId: "00000000-0000-0000-0000-00000000000a",
    roomId: "room-1",
  } as Memory;
}

const MOCK_REPORT =
  "OpenClaw chatter is up after the latest gateway release. AGI timeline debates same as ever. I would keep an eye on repo activity.";

const BANNED_PHRASES = [
  "leverage",
  "delve",
  "it's worth noting",
  "in conclusion",
  "great question",
  "let me help",
  "actionable",
  "nuanced",
  "dive into",
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetXSearchService.mockReturnValue({
    searchQuery: vi
      .fn()
      .mockResolvedValue([
        createTweet("OpenClaw gateway 2.0 is out", "openclaw_dev"),
        createTweet("AGI timelines are collapsing", "ai_researcher"),
      ]),
  });
  mockTavilySearch.mockResolvedValue([
    "OpenClaw is an open-source research agent framework. Latest release adds gateway improvements.",
  ]);
});

describe("clawtermDayReportAction", () => {
  describe("validate", () => {
    it('returns true for "what\'s hot today?"', async () => {
      const { clawtermDayReportAction } =
        await import("../actions/clawtermDayReport.action");
      const result = await clawtermDayReportAction.validate!(
        {} as IAgentRuntime,
        createMemory("What's hot today?"),
      );
      expect(result).toBe(true);
    });

    it('returns true for "full day report"', async () => {
      const { clawtermDayReportAction } =
        await import("../actions/clawtermDayReport.action");
      const result = await clawtermDayReportAction.validate!(
        {} as IAgentRuntime,
        createMemory("full day report"),
      );
      expect(result).toBe(true);
    });

    it('returns true for "openclaw news today"', async () => {
      const { clawtermDayReportAction } =
        await import("../actions/clawtermDayReport.action");
      const result = await clawtermDayReportAction.validate!(
        {} as IAgentRuntime,
        createMemory("openclaw news today"),
      );
      expect(result).toBe(true);
    });

    it("returns false for unrelated message", async () => {
      const { clawtermDayReportAction } =
        await import("../actions/clawtermDayReport.action");
      const result = await clawtermDayReportAction.validate!(
        {} as IAgentRuntime,
        createMemory("gateway status"),
      );
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("calls callback with report text and CLAWTERM_DAY_REPORT action", async () => {
      let capturedPrompt: string | undefined;
      const runtime = {
        getSetting: vi.fn((key: string) => {
          if (key === "X_BEARER_TOKEN") return "test-token";
          if (key === "TAVILY_API_KEY") return "test-tavily";
          return null;
        }),
        useModel: vi.fn(async (_type: unknown, params: { prompt: string }) => {
          capturedPrompt = params.prompt;
          return MOCK_REPORT;
        }),
      } as unknown as IAgentRuntime;

      const callback = vi.fn();
      const { clawtermDayReportAction } =
        await import("../actions/clawtermDayReport.action");
      await clawtermDayReportAction.handler!(
        runtime,
        createMemory("What's hot today?"),
        {} as State,
        {},
        callback as HandlerCallback,
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: MOCK_REPORT,
          action: "CLAWTERM_DAY_REPORT",
        }),
      );
      expect(capturedPrompt).toBeDefined();
    });

    it("prompt includes ALOHA-style rules", async () => {
      let capturedPrompt: string | undefined;
      const runtime = {
        getSetting: vi.fn((key: string) =>
          key === "X_BEARER_TOKEN" || key === "TAVILY_API_KEY" ? "x" : null,
        ),
        useModel: vi.fn(async (_type: unknown, params: { prompt: string }) => {
          capturedPrompt = params.prompt;
          return MOCK_REPORT;
        }),
      } as unknown as IAgentRuntime;

      const callback = vi.fn();
      const { clawtermDayReportAction } =
        await import("../actions/clawtermDayReport.action");
      await clawtermDayReportAction.handler!(
        runtime,
        createMemory("what's hot today"),
        {} as State,
        {},
        callback as HandlerCallback,
      );

      expect(capturedPrompt).toContain("smart friend over coffee");
      expect(capturedPrompt).toContain("Don't bullet point");
      expect(capturedPrompt).toContain("200-300 words");
      expect(capturedPrompt).toContain("Interestingly");
      expect(capturedPrompt).toContain("notably");
    });

    it("prompt includes NO AI SLOP ban list", async () => {
      let capturedPrompt: string | undefined;
      const runtime = {
        getSetting: vi.fn((key: string) =>
          key === "X_BEARER_TOKEN" || key === "TAVILY_API_KEY" ? "x" : null,
        ),
        useModel: vi.fn(async (_type: unknown, params: { prompt: string }) => {
          capturedPrompt = params.prompt;
          return MOCK_REPORT;
        }),
      } as unknown as IAgentRuntime;

      const callback = vi.fn();
      const { clawtermDayReportAction } =
        await import("../actions/clawtermDayReport.action");
      await clawtermDayReportAction.handler!(
        runtime,
        createMemory("day report"),
        {} as State,
        {},
        callback as HandlerCallback,
      );

      expect(capturedPrompt).toContain("leverage");
      expect(capturedPrompt).toContain("delve");
      expect(capturedPrompt).toContain("NEVER use");
    });

    it("prompt contains X and web context from mocks", async () => {
      let capturedPrompt: string | undefined;
      const runtime = {
        getSetting: vi.fn((key: string) =>
          key === "X_BEARER_TOKEN" || key === "TAVILY_API_KEY" ? "x" : null,
        ),
        useModel: vi.fn(async (_type: unknown, params: { prompt: string }) => {
          capturedPrompt = params.prompt;
          return MOCK_REPORT;
        }),
      } as unknown as IAgentRuntime;

      const callback = vi.fn();
      const { clawtermDayReportAction } =
        await import("../actions/clawtermDayReport.action");
      await clawtermDayReportAction.handler!(
        runtime,
        createMemory("what's hot"),
        {} as State,
        {},
        callback as HandlerCallback,
      );

      expect(capturedPrompt).toContain("=== X (last 24h) ===");
      expect(capturedPrompt).toContain("=== Web ===");
      expect(capturedPrompt).toContain("OpenClaw gateway 2.0");
      expect(capturedPrompt).toContain("AGI timelines");
      expect(capturedPrompt).toContain("open-source research agent framework");
    });

    it("callback when no X and no Tavily tells user to set tokens", async () => {
      const origX = process.env.X_BEARER_TOKEN;
      const origT = process.env.TAVILY_API_KEY;
      delete process.env.X_BEARER_TOKEN;
      delete process.env.TAVILY_API_KEY;
      try {
        const runtime = {
          getSetting: vi.fn(() => null),
        } as unknown as IAgentRuntime;

        const callback = vi.fn();
        const { clawtermDayReportAction } =
          await import("../actions/clawtermDayReport.action");
        await clawtermDayReportAction.handler!(
          runtime,
          createMemory("what's hot today"),
          {} as State,
          {},
          callback as HandlerCallback,
        );

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining("X_BEARER_TOKEN"),
            action: "CLAWTERM_DAY_REPORT",
          }),
        );
        expect(mockGetXSearchService).not.toHaveBeenCalled();
      } finally {
        if (origX !== undefined) process.env.X_BEARER_TOKEN = origX;
        if (origT !== undefined) process.env.TAVILY_API_KEY = origT;
      }
    });

    it("mock report output has no banned phrases and reasonable length", () => {
      const report = MOCK_REPORT;
      const words = report.split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(20);
      expect(words).toBeLessThanOrEqual(600);

      const lower = report.toLowerCase();
      for (const phrase of BANNED_PHRASES) {
        expect(lower).not.toContain(phrase);
      }
    });
  });
});
