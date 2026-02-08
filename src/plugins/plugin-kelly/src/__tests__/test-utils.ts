/**
 * Minimal test utilities for plugin-kelly.
 */

import type {
  IAgentRuntime,
  Memory,
  State,
  Content,
  UUID,
} from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";

export function createMockMessage(
  text: string,
  options?: { roomId?: UUID; agentId?: UUID },
): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: options?.roomId ?? (uuidv4() as UUID),
    agentId: options?.agentId ?? (uuidv4() as UUID),
    content: { text, source: "test" },
    createdAt: Date.now(),
  };
}

export function createMockState(overrides?: Partial<State>): State {
  return { values: {}, data: {}, text: "", ...overrides };
}

export interface MockCallback {
  (...args: any[]): Promise<void>;
  calls: Content[];
  reset: () => void;
}

export function createMockCallback(): MockCallback {
  const calls: Content[] = [];
  const callback = async (content: Content): Promise<void> => {
    calls.push(content);
  };
  (callback as MockCallback).calls = calls;
  (callback as MockCallback).reset = () => {
    calls.length = 0;
  };
  return callback as MockCallback;
}

export function createMockRuntime(overrides?: Partial<IAgentRuntime>): IAgentRuntime {
  return {
    agentId: uuidv4() as UUID,
    character: { name: "Kelly", bio: "Test" },
    getService: () => null,
    getMemories: async () => [],
    getCache: async () => undefined,
    getConversationLength: () => 10,
    composeState: async () => ({ values: {}, data: {}, text: "" }),
    useModel: async () => "Mock response",
    ...overrides,
  } as unknown as IAgentRuntime;
}
