import { describe, it, expect, beforeEach } from "bun:test";
import { polymarketRiskApproveAction } from "../actions/polymarketRiskApprove.action";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";

const SIGNAL_ID = "signal-uuid-123";
const MARKET_ID =
  "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab";

function createMockRuntime(
  overrides: Partial<{
    getConnection: () => Promise<unknown>;
    getSetting: (key: string) => unknown;
    composeState: (
      msg: Memory,
      list: string[] | null,
      flag: boolean,
    ) => Promise<State>;
  }> = {},
): IAgentRuntime {
  return {
    getConnection: overrides.getConnection ?? (async () => null),
    getSetting: overrides.getSetting ?? (() => undefined),
    composeState: overrides.composeState
      ? (overrides.composeState as any)
      : async () => ({ data: { actionParams: {} } }) as State,
    agentId: "risk-agent",
  } as unknown as IAgentRuntime;
}

function createMessage(text?: string): Memory {
  return {
    id: "msg-1",
    content: { text: text ?? "Approve pending signals" },
    roomId: "room-1",
    entityId: "user-1",
    agentId: "agent-1",
    createdAt: Date.now(),
  };
}

describe("plugin-polymarket-desk: POLYMARKET_RISK_APPROVE", () => {
  it("action has required name and description", () => {
    expect(polymarketRiskApproveAction.name).toBe("POLYMARKET_RISK_APPROVE");
    expect(polymarketRiskApproveAction.description).toContain("Risk");
  });

  it("validate returns false when getConnection is missing", async () => {
    const runtime = createMockRuntime({ getConnection: async () => null });
    const valid = await polymarketRiskApproveAction.validate!(
      runtime,
      createMessage(),
    );
    expect(valid).toBe(false);
  });

  it("validate returns false when connection has no query", async () => {
    const runtime = createMockRuntime({
      getConnection: async () => ({}),
    });
    const valid = await polymarketRiskApproveAction.validate!(
      runtime,
      createMessage(),
    );
    expect(valid).toBe(false);
  });

  it("validate returns true when connection has query", async () => {
    const runtime = createMockRuntime({
      getConnection: async () => ({ query: async () => ({ rows: [] }) }),
    });
    const valid = await polymarketRiskApproveAction.validate!(
      runtime,
      createMessage(),
    );
    expect(valid).toBe(true);
  });

  it("handler returns failure when database connection not available", async () => {
    const runtime = createMockRuntime({ getConnection: async () => null });
    const result = await polymarketRiskApproveAction.handler!(
      runtime,
      createMessage(),
      undefined,
      undefined,
      undefined,
    );
    expect((result as any).success).toBe(false);
    expect((result as any).text).toContain("Database");
  });

  it("handler returns success with no-op when no pending signal found", async () => {
    const runtime = createMockRuntime({
      getConnection: async () => ({
        query: async (sql: string, values?: unknown[]) => {
          if (sql.includes("SELECT") && sql.includes("signals"))
            return { rows: [] };
          return { rows: [] };
        },
      }),
      composeState: async () => ({ data: { actionParams: {} } }) as State,
    });
    const result = await polymarketRiskApproveAction.handler!(
      runtime,
      createMessage(),
      undefined,
      undefined,
      undefined,
    );
    expect((result as any).success).toBe(true);
    expect((result as any).text).toContain("No pending signal");
  });

  it("handler approves signal by signal_id and inserts sized order", async () => {
    const queries: Array<{ sql: string; values: unknown[] }> = [];
    const runtime = createMockRuntime({
      getConnection: async () => ({
        query: async (sql: string, values?: unknown[]) => {
          queries.push({ sql, values: values ?? [] });
          if (
            sql.includes("SELECT") &&
            sql.includes("signals") &&
            values?.[0] === SIGNAL_ID
          )
            return {
              rows: [
                {
                  id: SIGNAL_ID,
                  market_id: MARKET_ID,
                  side: "YES",
                  suggested_size_usd: null,
                  confidence: 0.6,
                  edge_bps: 300,
                  forecast_prob: 0.55,
                  market_price: 0.52,
                },
              ],
            };
          if (
            sql.includes("SELECT") &&
            sql.includes("signals") &&
            (!values || values.length === 0)
          )
            return { rows: [] };
          return { rows: [] };
        },
      }),
      getSetting: (key) => {
        if (key === "POLYMARKET_DESK_BANKROLL_USD") return 1000;
        if (key === "POLYMARKET_DESK_KELLY_FRACTION") return 0.25;
        return undefined;
      },
      composeState: async () =>
        ({ data: { actionParams: { signal_id: SIGNAL_ID } } }) as State,
    });
    const result = await polymarketRiskApproveAction.handler!(
      runtime,
      createMessage(),
      undefined,
      undefined,
      undefined,
    );
    expect((result as any).success).toBe(true);
    expect((result as any).sized_order_id).toBeDefined();
    expect((result as any).signal_id).toBe(SIGNAL_ID);
    const insertOrder = queries.find((q) => q.sql.includes("sized_orders"));
    expect(insertOrder).toBeDefined();
    expect(insertOrder!.values[2]).toBe(SIGNAL_ID);
    expect(insertOrder!.values[3]).toBe(MARKET_ID);
    expect(insertOrder!.values[4]).toBe("YES");
    const updateSignal = queries.find(
      (q) => q.sql.includes("UPDATE") && q.sql.includes("signals"),
    );
    expect(updateSignal).toBeDefined();
    expect(updateSignal!.values[0]).toBe(SIGNAL_ID);
  });

  it("handler uses next pending signal when signal_id not provided", async () => {
    const firstSignal = {
      id: "first-signal-id",
      market_id: MARKET_ID,
      side: "NO",
      suggested_size_usd: 50,
      confidence: 0.7,
      edge_bps: -200,
      forecast_prob: 0.45,
      market_price: 0.48,
    };
    const runtime = createMockRuntime({
      getConnection: async () => ({
        query: async (sql: string, values?: unknown[]) => {
          if (sql.includes("ORDER BY created_at ASC LIMIT 1"))
            return { rows: [firstSignal] };
          return { rows: [] };
        },
      }),
      getSetting: () => undefined,
      composeState: async () => ({ data: { actionParams: {} } }) as State,
    });
    const result = await polymarketRiskApproveAction.handler!(
      runtime,
      createMessage(),
      undefined,
      undefined,
      undefined,
    );
    expect((result as any).success).toBe(true);
    expect((result as any).signal_id).toBe(firstSignal.id);
  });

  it("invokes callback when provided", async () => {
    let callbackText = "";
    const runtime = createMockRuntime({
      getConnection: async () => ({
        query: async (sql: string) => {
          if (sql.includes("SELECT") && sql.includes("signals"))
            return { rows: [] };
          return { rows: [] };
        },
      }),
      composeState: async () => ({ data: { actionParams: {} } }) as State,
    });
    await polymarketRiskApproveAction.handler!(
      runtime,
      createMessage(),
      undefined,
      undefined,
      async (content) => {
        callbackText = content?.text ?? "";
      },
    );
    expect(callbackText).toContain("No pending signal");
  });
});
