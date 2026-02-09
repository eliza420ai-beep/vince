/**
 * ASK_AGENT: validate, target/question parsing, self-ask, in-process (async/sync/direct),
 * job API (completed/timeout/failed/4xx/no jobId), and top-level catch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { askAgentAction } from "../actions/askAgent.action";
import type {
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  Content,
  UUID,
} from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";

function createMessage(text: string, overrides?: Partial<Memory>): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: uuidv4() as UUID,
    agentId: uuidv4() as UUID,
    content: { text, source: "test" },
    createdAt: Date.now(),
    ...overrides,
  };
}

function createMockRuntime(overrides?: {
  character?: { name?: string };
  agentId?: UUID;
  elizaOS?: unknown;
}): IAgentRuntime {
  const runtime = {
    agentId: (overrides?.agentId ?? uuidv4()) as UUID,
    character: overrides?.character ?? { name: "Kelly" },
    getSetting: () => null,
    getService: () => null,
  } as unknown as IAgentRuntime;
  if (overrides?.elizaOS !== undefined) {
    (runtime as { elizaOS?: unknown }).elizaOS = overrides.elizaOS;
  }
  return runtime;
}

function createMockCallback(): { callback: HandlerCallback; calls: Content[] } {
  const calls: Content[] = [];
  const callback: HandlerCallback = async (content) => {
    calls.push(content);
  };
  return { callback, calls };
}

describe("askAgentAction", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ELIZAOS_SERVER_URL = "http://test-server";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe("validate", () => {
    it("returns true for ask Vince about X", async () => {
      const runtime = createMockRuntime();
      const msg = createMessage("Ask Vince about Bitcoin");
      const result = await askAgentAction.validate!(runtime, msg);
      expect(result).toBe(true);
    });

    it("returns true for what would Solus say about Y", async () => {
      const runtime = createMockRuntime();
      const msg = createMessage("What would Solus say about that trade?");
      const result = await askAgentAction.validate!(runtime, msg);
      expect(result).toBe(true);
    });

    it("returns true for ping Kelly", async () => {
      const runtime = createMockRuntime();
      const msg = createMessage("Ping Kelly. What wine for steak?");
      const result = await askAgentAction.validate!(runtime, msg);
      expect(result).toBe(true);
    });

    it("returns true when state.values.actionResult.text contains ask-intent", async () => {
      const runtime = createMockRuntime();
      const msg = createMessage("hello");
      const state: State = {
        values: { actionResult: { text: "Ask Vince about ETH" } },
        data: {},
        text: "",
      };
      const result = await askAgentAction.validate!(runtime, msg, state);
      expect(result).toBe(true);
    });

    it("returns false for empty message", async () => {
      const runtime = createMockRuntime();
      const msg = createMessage("   ");
      const result = await askAgentAction.validate!(runtime, msg);
      expect(result).toBe(false);
    });

    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const msg = createMessage("What is the weather today?");
      const result = await askAgentAction.validate!(runtime, msg);
      expect(result).toBe(false);
    });
  });

  describe("handler - parsing and self-ask", () => {
    it("unparseable message and no state yields I didn't catch which agent", async () => {
      const runtime = createMockRuntime({ elizaOS: undefined });
      (runtime as { elizaOS?: unknown }).elizaOS = undefined;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { agents: [] } }),
      });
      const msg = createMessage("hello");
      const state: State = { values: {}, data: {}, text: "" };
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        state,
        undefined,
        callback
      );

      expect(result).toBe(false);
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(calls[0].text).toContain("I didn't catch which agent");
    });

    it("self-ask (ask Kelly when agent is Kelly) yields That's me", async () => {
      const runtime = createMockRuntime({
        character: { name: "Kelly" },
        elizaOS: undefined,
      });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { agents: [{ id: "kelly-id", name: "Kelly" }] },
        }),
      });
      const msg = createMessage("Ask Kelly about wine");
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        {} as State,
        undefined,
        callback
      );

      expect(result).toBe(true);
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(calls[0].text).toContain("That's me");
    });
  });

  describe("handler - in-process async onResponse", () => {
    it("async onResponse with text yields **X says:** reply", async () => {
      const targetAgentId = "vince-id";
      let capturedOpts: { onResponse?: (c: unknown) => void } = {};
      const handleMessage = vi.fn().mockImplementation((_id: string, _msg: unknown, opts?: unknown) => {
        capturedOpts = (opts as typeof capturedOpts) ?? {};
        queueMicrotask(() => {
          const onResponse = (capturedOpts as { onResponse?: (c: unknown) => void }).onResponse;
          if (onResponse) onResponse({ text: "Vince reply" });
        });
        return Promise.resolve();
      });
      const runtime = createMockRuntime({
        character: { name: "Kelly" },
        elizaOS: {
          handleMessage,
          getAgentByName: (name: string) =>
            name.toLowerCase() === "vince" ? { agentId: targetAgentId } : undefined,
          getAgents: () => [{ agentId: targetAgentId, character: { name: "Vince" } }],
        },
      });
      const msg = createMessage("Ask Vince about Bitcoin");
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        {} as State,
        undefined,
        callback
      );

      expect(result).toBe(true);
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(calls[0].text).toBe("**Vince says:** Vince reply");
    });

    it("async onError causes fall through to next path", async () => {
      const targetAgentId = "vince-id";
      const handleMessage = vi.fn().mockImplementation((_id: string, _msg: unknown, opts?: unknown) => {
        const o = opts as { onError?: (err: Error) => void };
        queueMicrotask(() => o?.onError?.(new Error("async error")));
        return Promise.resolve();
      });
      const runtime = createMockRuntime({
        character: { name: "Kelly" },
        elizaOS: {
          handleMessage,
          getAgentByName: () => ({ agentId: targetAgentId }),
          getAgents: () => [{ agentId: targetAgentId, character: { name: "Vince" } }],
        },
      });
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: "j1" }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: "completed",
            result: { message: { content: "Fallback reply" } },
          }),
        });
      const msg = createMessage("Ask Vince about Bitcoin");
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        {} as State,
        undefined,
        callback
      );

      // After onError we try sync (no opts so mock resolves), then job API. We mock job to complete.
      expect(handleMessage).toHaveBeenCalled();
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(result).toBe(true);
      expect(calls[0].text).toContain("**Vince says:** Fallback reply");
    });

    it("sync fallback returns reply when async rejects", async () => {
      const targetAgentId = "vince-id";
      const handleMessage = vi.fn()
        .mockImplementationOnce(() => Promise.reject(new Error("async failed")))
        .mockImplementationOnce(() =>
          Promise.resolve({
            processing: {
              responseContent: { text: "Sync reply" },
            },
          })
        );
      const runtime = createMockRuntime({
        character: { name: "Kelly" },
        elizaOS: {
          handleMessage,
          getAgentByName: () => ({ agentId: targetAgentId }),
          getAgents: () => [{ agentId: targetAgentId, character: { name: "Vince" } }],
        },
      });
      const msg = createMessage("Ask Vince about Bitcoin");
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        {} as State,
        undefined,
        callback
      );

      expect(result).toBe(true);
      expect(calls[0].text).toBe("**Vince says:** Sync reply");
    });

    it("direct messageService fallback returns reply when async and sync did not", async () => {
      const targetAgentId = "vince-id";
      const handleMessage = vi.fn()
        .mockImplementationOnce(() => Promise.reject(new Error("async failed")))
        .mockImplementationOnce(() => Promise.resolve(null));
      const directHandleMessage = vi.fn().mockImplementation(
        (_runtime: unknown, _msg: unknown, cb: (c: unknown) => void) => {
          queueMicrotask(() => cb({ text: "Direct reply" }));
          return Promise.resolve();
        }
      );
      const runtime = createMockRuntime({
        character: { name: "Kelly" },
        elizaOS: {
          handleMessage,
          getAgent: () =>
            ({
              messageService: { handleMessage: directHandleMessage },
            }) as unknown,
          getAgentByName: () => ({ agentId: targetAgentId }),
          getAgents: () => [{ agentId: targetAgentId, character: { name: "Vince" } }],
        },
      });
      const msg = createMessage("Ask Vince about Bitcoin");
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        {} as State,
        undefined,
        callback
      );

      expect(result).toBe(true);
      expect(calls[0].text).toBe("**Vince says:** Direct reply");
    });
  });

  describe("handler - job API path", () => {
    it("no elizaOS: create 200 + poll completed yields **X says:** content", async () => {
      const runtime = createMockRuntime({ character: { name: "Kelly" }, elizaOS: undefined });
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { agents: [{ id: "vince-id", name: "Vince" }] },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: "j1" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: "completed",
            result: { message: { content: "Agent reply" } },
          }),
        });
      globalThis.fetch = mockFetch;
      const msg = createMessage("Ask Vince about Bitcoin");
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        {} as State,
        undefined,
        callback
      );

      expect(result).toBe(true);
      expect(calls[0].text).toBe("**Vince says:** Agent reply");
    });

    it("job create 200 + poll timeout yields didn't respond in time", async () => {
      const runtime = createMockRuntime({ elizaOS: undefined });
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { agents: [{ id: "vince-id", name: "Vince" }] },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: "j1" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: "timeout" }),
        });
      globalThis.fetch = mockFetch;
      const msg = createMessage("Ask Vince about Bitcoin");
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        {} as State,
        undefined,
        callback
      );

      expect(result).toBe(false);
      expect(calls[0].text).toContain("didn't respond in time");
    });

    it("job create 200 + poll failed yields error message", async () => {
      const runtime = createMockRuntime({ elizaOS: undefined });
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { agents: [{ id: "vince-id", name: "Vince" }] },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: "j1" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: "failed", error: "Something broke" }),
        });
      globalThis.fetch = mockFetch;
      const msg = createMessage("Ask Vince about Bitcoin");
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        {} as State,
        undefined,
        callback
      );

      expect(result).toBe(false);
      expect(calls[0].text).toContain("Something broke");
    });

    it("job create 503 yields couldn't be reached (server 503)", async () => {
      const runtime = createMockRuntime({ elizaOS: undefined });
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { agents: [{ id: "vince-id", name: "Vince" }] },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => "Service Unavailable",
        });
      globalThis.fetch = mockFetch;
      const msg = createMessage("Ask Vince about Bitcoin");
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        {} as State,
        undefined,
        callback
      );

      expect(result).toBe(false);
      expect(calls[0].text).toContain("couldn't be reached");
      expect(calls[0].text).toContain("503");
    });

    it("job create 200 but no jobId yields didn't return a job id", async () => {
      const runtime = createMockRuntime({ elizaOS: undefined });
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { agents: [{ id: "vince-id", name: "Vince" }] },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });
      globalThis.fetch = mockFetch;
      const msg = createMessage("Ask Vince about Bitcoin");
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        {} as State,
        undefined,
        callback
      );

      expect(result).toBe(false);
      expect(calls[0].text).toContain("didn't return a job id");
    });
  });

  describe("handler - top-level catch", () => {
    it("fetch throws yields Something went wrong and baseUrl in message", async () => {
      const runtime = createMockRuntime({ elizaOS: undefined });
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const msg = createMessage("Ask Vince about Bitcoin");
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        {} as State,
        undefined,
        callback
      );

      expect(result).toBe(false);
      expect(calls[0].text).toContain("Something went wrong");
      expect(calls[0].text).toContain("test-server");
    });
  });

  describe("handler - target not found", () => {
    it("agent name not in list yields couldn't find an agent named", async () => {
      const runtime = createMockRuntime({ elizaOS: undefined });
      // Message parses to Vince, but agents list has only Kelly so Vince is not found
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { agents: [{ id: "kelly-id", name: "Kelly" }] },
        }),
      });
      const msg = createMessage("Ask Vince about Bitcoin");
      const { callback, calls } = createMockCallback();

      const result = await askAgentAction.handler!(
        runtime,
        msg,
        {} as State,
        undefined,
        callback
      );

      expect(result).toBe(false);
      expect(calls[0].text).toContain("couldn't find an agent named");
      expect(calls[0].text).toContain("Vince");
    });
  });
});
