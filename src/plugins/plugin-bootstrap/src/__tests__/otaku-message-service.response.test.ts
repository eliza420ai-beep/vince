/**
 * Unit tests for OtakuMessageService response path.
 * Proves that when the service receives a message and the runtime returns a valid
 * LLM-style XML response, the callback is invoked with the expected content (and REPLY is processed).
 */
import { describe, it, expect, mock } from "bun:test";
import { v4 as uuidv4 } from "uuid";
import {
  type IAgentRuntime,
  type Memory,
  type UUID,
  type Content,
  type State,
  ChannelType,
  ModelType,
} from "@elizaos/core";
import { OtakuMessageService } from "../services/otaku-message-service";

const FIXED_XML_RESPONSE = `<response>
  <thought>The user wants to know what I can help with. I'll provide a concise list of my capabilities.</thought>
  <actions>REPLY</actions>
  <providers></providers>
  <text>I can help you with token swaps, cross-chain bridges, portfolio analysis, token transfers, and market data insights. Let me know if you'd like to proceed with any of these!</text>
</response>`;

function createMockRuntime(
  overrides?: Partial<Record<string, unknown>>,
): IAgentRuntime {
  const agentId = uuidv4() as UUID;

  const useModel = mock((modelType: string, _params: { prompt?: string }) => {
    if (modelType === ModelType.TEXT_LARGE) {
      return Promise.resolve(FIXED_XML_RESPONSE);
    }
    if (modelType === ModelType.TEXT_SMALL) {
      return Promise.resolve(
        "<response><name>Otaku</name><reasoning>User asked</reasoning><action>RESPOND</action></response>",
      );
    }
    return Promise.resolve("");
  });

  const processActions = mock(
    async (
      _message: Memory,
      _responseMessages: Memory[],
      _state: State,
      callback?: (content: Content) => Promise<void>,
    ) => {
      if (callback) {
        const content: Content = {
          text: "I can help you with token swaps, cross-chain bridges, portfolio analysis, token transfers, and market data insights.",
          thought: "The user wants to know what I can help with.",
          actions: ["REPLY"],
        };
        await callback(content);
      }
    },
  );

  const evaluate = mock(async () => {});

  return {
    agentId,
    character: {
      name: "Otaku",
      system: "You are Otaku.",
      templates: {},
    },
    getSetting: mock((key: string) => {
      if (key === "USE_MULTI_STEP") return "false";
      if (key === "BOOTSTRAP_DEFLLMOFF") return "";
      return null;
    }),
    getParticipantUserState: mock(() => Promise.resolve(null)),
    getRoom: mock((rid?: UUID) =>
      Promise.resolve({
        id: rid ?? (uuidv4() as UUID),
        type: ChannelType.DM,
        worldId: rid ?? (uuidv4() as UUID),
      }),
    ),
    getMemoryById: mock(() => Promise.resolve(null)),
    createMemory: mock(() => Promise.resolve(uuidv4() as UUID)),
    queueEmbeddingGeneration: mock(() => Promise.resolve()),
    getConversationLength: mock(() => 10),
    getMemories: mock(() => Promise.resolve([])),
    composeState: mock(() =>
      Promise.resolve({
        values: {},
        data: {
          providers: {
            ACTIONS: {
              data: { actionsData: [{ name: "REPLY" }] },
            },
          },
        },
        text: "",
      } as State),
    ),
    useModel,
    processActions,
    evaluate,
    emitEvent: mock(() => Promise.resolve()),
    startRun: mock((rid?: UUID) => rid ?? (uuidv4() as UUID)),
    getRoomsByIds: mock((ids: UUID[]) =>
      Promise.resolve(
        (ids ?? []).map((id) => ({ id, name: "test", worldId: id })),
      ),
    ),
    getWorld: mock((wid?: UUID) =>
      Promise.resolve({ id: wid ?? (uuidv4() as UUID), name: "test" }),
    ),
    ensureConnection: mock(() => Promise.resolve()),
    addParticipant: mock(() => Promise.resolve(true)),
    getEntityById: mock(() => Promise.resolve(null)),
    logger: {
      info: mock(() => {}),
      debug: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
    },
    ...overrides,
  } as unknown as IAgentRuntime;
}

function createMinimalMessage(overrides?: Partial<Memory>): Memory {
  const entityId = uuidv4() as UUID;
  const roomId = uuidv4() as UUID;
  const agentId = uuidv4() as UUID;
  return {
    id: uuidv4() as UUID,
    entityId,
    agentId,
    roomId,
    content: {
      text: "What can you do?",
      source: "client_chat",
      channelType: ChannelType.DM,
    },
    createdAt: Date.now(),
    embedding: [],
    ...overrides,
  } as Memory;
}

describe("OtakuMessageService response path", () => {
  it("invokes callback with expected content when runtime returns valid XML (single-shot)", async () => {
    const runtime = createMockRuntime();
    const message = createMinimalMessage();
    (runtime as any).startRun = mock(() => message.roomId);

    const callback = mock(async (_content: Content) => {});
    const service = new OtakuMessageService();

    const result = await service.handleMessage(runtime, message, callback, {
      useMultiStep: false,
    });

    expect(result.didRespond).toBe(true);
    expect(result.responseContent).not.toBeNull();
    expect(result.responseContent?.text).toContain("token swaps");
    expect(result.responseContent?.text).toContain("portfolio");
    expect(result.responseContent?.actions).toContain("REPLY");
    expect(callback).toHaveBeenCalled();
    const lastCall = callback.mock.calls[callback.mock.calls.length - 1];
    const content = lastCall?.[0];
    expect(content).toBeDefined();
    expect(content?.text).toBeDefined();
    expect(String(content?.text).length).toBeGreaterThan(0);
    expect(content?.actions).toContain("REPLY");
  });

  it("does not invoke callback for main response when message is from self", async () => {
    const runtime = createMockRuntime();
    const roomId = uuidv4() as UUID;
    const message = createMinimalMessage({
      entityId: runtime.agentId,
      roomId,
    });

    (runtime as any).getRoom = mock(() =>
      Promise.resolve({ id: roomId, type: ChannelType.DM, worldId: roomId }),
    );
    (runtime as any).startRun = mock(() => roomId);

    const callback = mock(async () => {});
    const service = new OtakuMessageService();

    const result = await service.handleMessage(runtime, message, callback, {
      useMultiStep: false,
    });

    expect(result.didRespond).toBe(false);
    expect(result.responseContent).toBeNull();
    expect(callback).not.toHaveBeenCalled();
  });

  it("produces reply when Bankr is unavailable (no BANKR_API_KEY)", async () => {
    const runtime = createMockRuntime();
    (runtime as any).getSetting = mock((key: string) => {
      if (key.startsWith("BANKR_")) return null;
      if (key === "USE_MULTI_STEP") return "false";
      if (key === "BOOTSTRAP_DEFLLMOFF") return "";
      return null;
    });
    const message = createMinimalMessage();
    (runtime as any).startRun = mock(() => message.roomId);

    const callback = mock(async (_content: Content) => {});
    const service = new OtakuMessageService();

    const result = await service.handleMessage(runtime, message, callback, {
      useMultiStep: false,
    });

    expect(result.didRespond).toBe(true);
    expect(result.responseContent?.text?.length).toBeGreaterThan(0);
    expect(callback).toHaveBeenCalled();
    const lastContent = (callback as any).mock.calls[
      (callback as any).mock.calls.length - 1
    ]?.[0];
    expect(lastContent?.text?.length).toBeGreaterThan(0);
  });
});
