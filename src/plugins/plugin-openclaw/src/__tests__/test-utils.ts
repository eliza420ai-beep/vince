/**
 * Test utilities for plugin-openclaw.
 * Mock factories for runtime, message, state, and callback.
 */

import type {
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  Content,
  UUID,
} from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";

export interface MockCallback {
  (content: Content): Promise<void>;
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

export function createMockMessage(
  text: string,
  options?: { entityId?: UUID; roomId?: UUID; agentId?: UUID }
): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: (options?.entityId ?? uuidv4()) as UUID,
    roomId: (options?.roomId ?? uuidv4()) as UUID,
    agentId: (options?.agentId ?? uuidv4()) as UUID,
    content: { text, source: "test" },
    createdAt: Date.now(),
  };
}

export function createMockState(overrides?: Partial<State>): State {
  return {
    values: {},
    data: {},
    text: "",
    ...overrides,
  };
}

export interface MockRuntimeOverrides {
  character?: { name: string };
  getSetting?: (key: string) => string | boolean | null | undefined;
}

export function createMockRuntime(overrides?: MockRuntimeOverrides): IAgentRuntime {
  return {
    agentId: uuidv4() as UUID,
    character: overrides?.character ?? { name: "OtherAgent" },
    getSetting: overrides?.getSetting ?? (() => undefined),
    getService: () => null,
    composeState: async () => createMockState(),
    ...overrides,
  } as unknown as IAgentRuntime;
}

/**
 * Run a test with env vars set; restores original values after.
 */
export async function withEnv(
  env: Record<string, string | undefined>,
  fn: () => Promise<void>
): Promise<void> {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    prev[key] = process.env[key];
    if (env[key] !== undefined) {
      process.env[key] = env[key];
    } else {
      delete process.env[key];
    }
  }
  try {
    await fn();
  } finally {
    for (const key of Object.keys(prev)) {
      if (prev[key] !== undefined) {
        process.env[key] = prev[key];
      } else {
        delete process.env[key];
      }
    }
  }
}
