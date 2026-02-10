/**
 * E2E tests for Otaku agent response flow.
 *
 * Run with: bun test src/__tests__/e2e/otaku-response.e2e.ts
 * Or via ElizaOS runner when targeting Otaku: elizaos test e2e (and ensure Otaku agent is loaded).
 *
 * When the runner only exposes a single default agent, run with the project configured
 * to load Otaku first, or run the self-contained "with mocked runtime" test below.
 */
import { describe, it, expect, mock } from "bun:test";
import { v4 as uuidv4 } from "uuid";
import {
  type IAgentRuntime,
  type Memory,
  type Content,
  type UUID,
  type State,
  ChannelType,
  ModelType,
  logger,
} from "@elizaos/core";
import { otakuCharacter } from "../../agents/otaku";
import { OtakuMessageService } from "../../plugins/plugin-bootstrap/src/services/otaku-message-service";

const FIXED_XML_RESPONSE = `<response>
  <thought>The user wants to know what I can help with.</thought>
  <actions>REPLY</actions>
  <providers></providers>
  <text>I can help you with token swaps, cross-chain bridges, portfolio analysis, token transfers, and market data insights.</text>
</response>`;

interface TestCase {
  name: string;
  fn: (runtime: IAgentRuntime) => Promise<void>;
}

interface TestSuite {
  name: string;
  tests: TestCase[];
}

/**
 * Test suite for Otaku response flow. Used by elizaos test e2e when the runner provides a runtime.
 * When the runtime is Otaku (character.name === 'Otaku'), runs handleMessage with mocked useModel and asserts reply.
 */
export const OtakuResponseTestSuite: TestSuite = {
  name: "Otaku Response E2E",
  tests: [
    {
      name: "otaku_agent_produces_reply_when_handleMessage_called",
      fn: async (runtime: IAgentRuntime) => {
        if (runtime.character?.name !== "Otaku") {
          logger.info(
            "⚠ Otaku runtime not provided by runner; skip or run with Otaku as the loaded agent."
          );
          return;
        }
        const messageService = runtime.messageService as InstanceType<
          typeof OtakuMessageService
        > | null;
        if (!messageService || typeof messageService.handleMessage !== "function") {
          logger.info("⚠ OtakuMessageService not installed on runtime; skipping.");
          return;
        }

        const originalUseModel = runtime.useModel?.bind(runtime);
        (runtime as unknown as { useModel: typeof runtime.useModel }).useModel = mock(
          async (modelType: string, params: { prompt?: string }) => {
            if (modelType === ModelType.TEXT_LARGE) return FIXED_XML_RESPONSE;
            if (modelType === ModelType.TEXT_SMALL)
              return '<response><action>RESPOND</action></response>';
            if (originalUseModel) return originalUseModel(modelType as any, params as any);
            return "";
          }
        ) as typeof runtime.useModel;

        const roomId = uuidv4() as UUID;
        const message: Memory = {
          id: uuidv4() as UUID,
          entityId: uuidv4() as UUID,
          agentId: runtime.agentId,
          roomId,
          content: {
            text: "What can you do?",
            source: "client_chat",
            channelType: ChannelType.DM,
          },
          createdAt: Date.now(),
          embedding: [],
        } as Memory;

        const collectedContent: Content[] = [];
        const callback = async (content: Content) => {
          collectedContent.push(content);
        };

        const result = await messageService.handleMessage(runtime, message, callback, {
          useMultiStep: false,
        });

        if (result.didRespond !== true) {
          throw new Error(
            `Expected didRespond true, got ${result.didRespond}; responseContent=${JSON.stringify(
              result.responseContent
            )}`
          );
        }
        if (!result.responseContent?.text || result.responseContent.text.length === 0) {
          throw new Error("Expected non-empty responseContent.text");
        }
        if (collectedContent.length === 0) {
          throw new Error("Expected callback to be called at least once");
        }
        const lastContent = collectedContent[collectedContent.length - 1];
        if (!lastContent?.text || lastContent.text.length === 0) {
          throw new Error("Expected callback to receive non-empty text");
        }
        logger.info("✓ Otaku agent produced reply and callback invoked with non-empty text");
      },
    },
  ],
};

/**
 * Self-contained integration test: real Otaku character + real OtakuMessageService + mocked runtime.
 * Runs with: bun test src/__tests__/e2e/otaku-response.e2e.ts (no runner required).
 */
describe("Otaku response integration (mocked runtime)", () => {
  it("produces reply and invokes callback with non-empty text when handleMessage is called", async () => {
    const agentId = uuidv4() as UUID;
    const roomId = uuidv4() as UUID;

    const useModel = mock(async (modelType: string) => {
      if (modelType === ModelType.TEXT_LARGE) return FIXED_XML_RESPONSE;
      if (modelType === ModelType.TEXT_SMALL)
        return '<response><action>RESPOND</action></response>';
      return "";
    });

    const processActions = mock(
      async (
        _message: Memory,
        _responseMessages: Memory[],
        _state: State,
        callback?: (content: Content) => Promise<void>
      ) => {
        if (callback) {
          await callback({
            text: "I can help you with token swaps, cross-chain bridges, portfolio analysis.",
            actions: ["REPLY"],
          });
        }
      }
    );

    const runtime = {
      agentId,
      character: otakuCharacter,
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
        })
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
              ACTIONS: { data: { actionsData: [{ name: "REPLY" }] } },
            },
          },
          text: "",
        } as State)
      ),
      useModel,
      processActions,
      evaluate: mock(() => Promise.resolve()),
      emitEvent: mock(() => Promise.resolve()),
      startRun: mock(() => roomId),
      getRoomsByIds: mock((ids: UUID[]) =>
        Promise.resolve((ids ?? []).map((id) => ({ id, name: "test", worldId: id })))
      ),
      getWorld: mock((wid?: UUID) =>
        Promise.resolve({ id: wid ?? (uuidv4() as UUID), name: "test" })
      ),
      ensureConnection: mock(() => Promise.resolve()),
      addParticipant: mock(() => Promise.resolve(true)),
      getEntityById: mock(() => Promise.resolve(null)),
      logger: {
        info: () => {},
        debug: () => {},
        warn: () => {},
        error: () => {},
      },
    } as unknown as IAgentRuntime;

    const message: Memory = {
      id: uuidv4() as UUID,
      entityId: uuidv4() as UUID,
      agentId: runtime.agentId,
      roomId,
      content: {
        text: "What can you do?",
        source: "client_chat",
        channelType: ChannelType.DM,
      },
      createdAt: Date.now(),
      embedding: [],
    } as Memory;

    (runtime as any).startRun = mock(() => message.roomId);

    const service = new OtakuMessageService();
    const collectedContent: Content[] = [];
    const callback = async (content: Content) => {
      collectedContent.push(content);
    };

    const result = await service.handleMessage(runtime, message, callback, {
      useMultiStep: false,
    });

    expect(result.didRespond).toBe(true);
    expect(result.responseContent).not.toBeNull();
    expect(result.responseContent?.text?.length).toBeGreaterThan(0);
    expect(collectedContent.length).toBeGreaterThan(0);
    expect(collectedContent[collectedContent.length - 1]?.text?.length).toBeGreaterThan(0);
  });
});
