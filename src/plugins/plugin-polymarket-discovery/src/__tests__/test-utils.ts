/**
 * Test utilities for plugin-polymarket-discovery.
 * Mock factories for runtime, message, state, callback, and PolymarketService.
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
import type { PolymarketMarket } from "../types";

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
  options?: { entityId?: UUID; roomId?: UUID; agentId?: UUID },
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

export interface MockPolymarketService {
  getMarketsByPreferredTags: (options?: {
    tagSlugs?: string[];
    limitPerTag?: number;
    totalLimit?: number;
  }) => Promise<PolymarketMarket[]>;
  recordActivity?: (
    roomId: string,
    type: string,
    data: Record<string, unknown>,
  ) => void;
  getCachedActivityContext?: (roomId?: string) => string;
}

export function createMockPolymarketService(
  markets: PolymarketMarket[] = [],
): MockPolymarketService {
  return {
    getMarketsByPreferredTags: async () => markets,
    recordActivity: () => {},
    getCachedActivityContext: () => "",
  };
}

export const mockPolymarketMarket: PolymarketMarket = {
  conditionId: "0x1234567890abcdef",
  question: "Will BTC be above $100k by end of 2025?",
  volume: "1500000",
  tokens: [
    { token_id: "yes-token-id", outcome: "Yes", price: 0.65 },
    { token_id: "no-token-id", outcome: "No", price: 0.35 },
  ],
  slug: "btc-100k-2025",
} as PolymarketMarket;

export interface MockRuntimeOptions {
  polymarketService?: MockPolymarketService | null;
  composeState?: (
    message: Memory,
    includeList?: string[] | null,
    onlyInclude?: boolean,
  ) => Promise<State>;
}

export function createMockRuntime(options?: MockRuntimeOptions): IAgentRuntime {
  const polymarketService = options?.polymarketService;
  const composeState =
    options?.composeState ??
    (async () => createMockState({ data: { actionParams: {} } }));

  return {
    getService: (name: string) => {
      if (name === "POLYMARKET_DISCOVERY_SERVICE") {
        return polymarketService ?? null;
      }
      return null;
    },
    getSetting: () => undefined,
    composeState,
    agentId: uuidv4() as UUID,
  } as unknown as IAgentRuntime;
}
