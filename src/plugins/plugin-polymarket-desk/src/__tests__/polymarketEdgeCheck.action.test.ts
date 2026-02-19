import { describe, it, expect, beforeEach } from "bun:test";
import { polymarketEdgeCheckAction } from "../actions/polymarketEdgeCheck.action";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";

const CONDITION_ID =
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

function createMockRuntime(
  overrides: Partial<{
    getService: (name: string) => unknown;
    getConnection: () => Promise<unknown>;
    composeState: (
      msg: Memory,
      list: string[] | null,
      flag: boolean,
    ) => Promise<State>;
  }> = {},
): IAgentRuntime {
  const queryLog: Array<{ sql: string; values: unknown[] }> = [];
  return {
    getService: (name: string) =>
      overrides.getService ? overrides.getService(name) : null,
    getConnection: overrides.getConnection
      ? (overrides.getConnection as any)
      : async () => ({
          query: (sql: string, values?: unknown[]) => {
            queryLog.push({ sql, values: values ?? [] });
            return { rows: [] };
          },
        }),
    composeState: overrides.composeState
      ? (overrides.composeState as any)
      : async () =>
          ({
            data: {
              actionParams: {
                condition_id: CONDITION_ID,
                asset: "BTC",
                edge_threshold_bps: 200,
              },
            },
          }) as State,
    agentId: "test-oracle",
  } as unknown as IAgentRuntime;
}

function createMessage(text?: string): Memory {
  return {
    id: "msg-1",
    content: { text: text ?? `Check edge for ${CONDITION_ID}` },
    roomId: "room-1",
    entityId: "user-1",
    agentId: "agent-1",
    createdAt: Date.now(),
  };
}

describe("plugin-polymarket-desk: POLYMARKET_EDGE_CHECK", () => {
  beforeEach(() => {
    // Ensure no SYNTH_API_KEY so getSynthForecast uses mock
    delete process.env.SYNTH_API_KEY;
  });

  it("action has required name, description, similes", () => {
    expect(polymarketEdgeCheckAction.name).toBe("POLYMARKET_EDGE_CHECK");
    expect(polymarketEdgeCheckAction.description).toContain("Synth");
    expect(polymarketEdgeCheckAction.similes).toContain("POLYMARKET_EDGE");
  });

  it("validate returns false when Polymarket service is not available", async () => {
    const runtime = createMockRuntime({ getService: () => null });
    const valid = await polymarketEdgeCheckAction.validate!(
      runtime,
      createMessage(),
    );
    expect(valid).toBe(false);
  });

  it("validate returns true when Polymarket service is available", async () => {
    const runtime = createMockRuntime({
      getService: (name) =>
        name === "POLYMARKET_DISCOVERY_SERVICE"
          ? { getMarketPrices: async () => ({}) }
          : null,
    });
    const valid = await polymarketEdgeCheckAction.validate!(
      runtime,
      createMessage(),
    );
    expect(valid).toBe(true);
  });

  it("handler returns failure when condition_id is missing", async () => {
    const runtime = createMockRuntime({
      getService: () => ({
        getMarketPrices: async () => ({ yes_price: "0.5", no_price: "0.5" }),
      }),
      composeState: async () => ({ data: { actionParams: {} } }) as State,
    });
    const result = await polymarketEdgeCheckAction.handler!(
      runtime,
      createMessage("no condition here"),
      undefined,
      undefined,
      undefined,
    );
    expect(result).toBeDefined();
    expect((result as any).success).toBe(false);
    expect((result as any).text).toContain("condition_id");
  });

  it("handler extracts condition_id from message text (hex)", async () => {
    const queries: Array<{ sql: string; values: unknown[] }> = [];
    const runtime = createMockRuntime({
      getService: () => ({
        getMarketPrices: async () => ({ yes_price: "0.48", no_price: "0.52" }),
      }),
      getConnection: async () => ({
        query: (sql: string, values?: unknown[]) => {
          queries.push({ sql, values: values ?? [] });
          return { rows: [] };
        },
      }),
      composeState: async () => ({ data: { actionParams: {} } }) as State,
    });
    const result = await polymarketEdgeCheckAction.handler!(
      runtime,
      createMessage(`Run edge check for market ${CONDITION_ID}`),
      undefined,
      undefined,
      undefined,
    );
    expect((result as any).success).toBe(true);
    expect((result as any).text).toContain("Edge check");
    expect((result as any).text).toContain("Synth");
    expect((result as any).text).toContain("Polymarket");
  });

  it("handler returns failure when Polymarket service has no getMarketPrices", async () => {
    const runtime = createMockRuntime({
      getService: () => ({}),
      composeState: async () =>
        ({ data: { actionParams: { condition_id: CONDITION_ID } } }) as State,
    });
    const result = await polymarketEdgeCheckAction.handler!(
      runtime,
      createMessage(),
      undefined,
      undefined,
      undefined,
    );
    expect((result as any).success).toBe(false);
    expect((result as any).text).toContain("Polymarket service");
  });

  it("handler runs edge check and returns summary with edge bps", async () => {
    const runtime = createMockRuntime({
      getService: () => ({
        getMarketPrices: async () => ({ yes_price: "0.40", no_price: "0.60" }),
      }),
      composeState: async () =>
        ({
          data: {
            actionParams: {
              condition_id: CONDITION_ID,
              asset: "BTC",
              edge_threshold_bps: 100,
            },
          },
        }) as State,
      getConnection: async () => ({
        query: async () => ({ rows: [] }),
      }),
    });
    const result = await polymarketEdgeCheckAction.handler!(
      runtime,
      createMessage(),
      undefined,
      undefined,
      undefined,
    );
    expect((result as any).success).toBe(true);
    expect((result as any).text).toMatch(/Edge: (YES|NO) [+-]?\d+ bps/);
    expect((result as any).input).toEqual({
      condition_id: CONDITION_ID,
      asset: "BTC",
      edge_threshold_bps: 100,
    });
  });

  it("handler writes signal to DB when edge above threshold", async () => {
    const queries: Array<{ sql: string; values: unknown[] }> = [];
    const runtime = createMockRuntime({
      getService: () => ({
        getMarketPrices: async () => ({ yes_price: "0.30", no_price: "0.70" }),
      }),
      composeState: async () =>
        ({
          data: {
            actionParams: {
              condition_id: CONDITION_ID,
              asset: "BTC",
              edge_threshold_bps: 50,
            },
          },
        }) as State,
      getConnection: async () => ({
        query: async (sql: string, values?: unknown[]) => {
          queries.push({ sql, values: values ?? [] });
          return { rows: [] };
        },
      }),
    });
    const result = await polymarketEdgeCheckAction.handler!(
      runtime,
      createMessage(),
      undefined,
      undefined,
      undefined,
    );
    expect((result as any).success).toBe(true);
    const insert = queries.find(
      (q) => q.sql.includes("INSERT INTO") && q.sql.includes("signals"),
    );
    expect(insert).toBeDefined();
    expect(insert!.values[0]).toBeDefined();
    expect(insert!.values[3]).toBe(CONDITION_ID);
    expect((result as any).signal_id).toBeDefined();
  });

  it("invokes callback when provided", async () => {
    let callbackText = "";
    const runtime = createMockRuntime({
      getService: () => ({
        getMarketPrices: async () => ({ yes_price: "0.5", no_price: "0.5" }),
      }),
      composeState: async () =>
        ({ data: { actionParams: { condition_id: CONDITION_ID } } }) as State,
      getConnection: async () => ({ query: async () => ({ rows: [] }) }),
    });
    await polymarketEdgeCheckAction.handler!(
      runtime,
      createMessage(),
      undefined,
      undefined,
      async (content) => {
        callbackText = content?.text ?? "";
      },
    );
    expect(callbackText).toContain("Edge check");
  });
});
