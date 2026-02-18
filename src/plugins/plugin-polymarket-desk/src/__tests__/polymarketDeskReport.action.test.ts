import { describe, it, expect } from "bun:test";
import { polymarketDeskReportAction } from "../actions/polymarketDeskReport.action";
import type { IAgentRuntime, Memory } from "@elizaos/core";

function createMockRuntime(overrides: Partial<{
  getConnection: () => Promise<unknown>;
}> = {}): IAgentRuntime {
  return {
    getConnection: overrides.getConnection ?? (async () => null),
    agentId: "perf-agent",
  } as unknown as IAgentRuntime;
}

function createMessage(text: string): Memory {
  return {
    id: "msg-1",
    content: { text },
    roomId: "room-1",
    entityId: "user-1",
    agentId: "agent-1",
    createdAt: Date.now(),
  };
}

describe("plugin-polymarket-desk: POLYMARKET_DESK_REPORT", () => {
  it("action has required name and similes", () => {
    expect(polymarketDeskReportAction.name).toBe("POLYMARKET_DESK_REPORT");
    expect(polymarketDeskReportAction.similes).toContain("POLYMARKET_TCA");
  });

  it("validate returns true for desk report / performance phrases", async () => {
    const runtime = createMockRuntime();
    expect(await polymarketDeskReportAction.validate!(runtime, createMessage("desk report"))).toBe(true);
    expect(await polymarketDeskReportAction.validate!(runtime, createMessage("polymarket report"))).toBe(true);
    expect(await polymarketDeskReportAction.validate!(runtime, createMessage("show me TCA"))).toBe(true);
    expect(await polymarketDeskReportAction.validate!(runtime, createMessage("fill rate"))).toBe(true);
    expect(await polymarketDeskReportAction.validate!(runtime, createMessage("how did the desk do"))).toBe(true);
    expect(await polymarketDeskReportAction.validate!(runtime, createMessage("performance report"))).toBe(true);
  });

  it("validate returns false for unrelated message", async () => {
    const runtime = createMockRuntime();
    expect(await polymarketDeskReportAction.validate!(runtime, createMessage("hello world"))).toBe(false);
  });

  it("handler reports error when database connection not available", async () => {
    const runtime = createMockRuntime({ getConnection: async () => null });
    let outText = "";
    await polymarketDeskReportAction.handler!(
      runtime,
      createMessage("desk report"),
      undefined,
      undefined,
      async (content) => {
        outText = content?.text ?? "";
      },
    );
    expect(outText).toContain("Database connection not available");
  });

  it("handler produces report from trade_log and sized_orders", async () => {
    let outText = "";
    const runtime = createMockRuntime({
      getConnection: async () => ({
        query: async (sql: string, values?: unknown[]) => {
          if (sql.includes("trade_log"))
            return {
              rows: [
                {
                  id: "t1",
                  market_id: "0xabc",
                  side: "YES",
                  size_usd: 100,
                  arrival_price: 0.5,
                  fill_price: 0.51,
                  slippage_bps: 20,
                  created_at: new Date().toISOString(),
                },
              ],
            };
          if (sql.includes("sized_orders"))
            return {
              rows: [
                { status: "filled", cnt: "2" },
                { status: "pending", cnt: "1" },
              ],
            };
          if (sql.includes("signals"))
            return { rows: [{ cnt: "3" }] };
          return { rows: [] };
        },
      }),
    });
    await polymarketDeskReportAction.handler!(
      runtime,
      createMessage("desk report"),
      undefined,
      { hours: 24 * 7 },
      async (content) => {
        outText = content?.text ?? "";
      },
    );
    expect(outText).toContain("Polymarket desk report");
    expect(outText).toContain("Trades:");
    expect(outText).toContain("Orders:");
    expect(outText).toContain("Fill rate");
    expect(outText).toContain("TCA");
    expect(outText).toContain("Signals approved");
  });

  it("handler handles empty trade log and order counts", async () => {
    let outText = "";
    const runtime = createMockRuntime({
      getConnection: async () => ({
        query: async () => ({ rows: [] }),
      }),
    });
    await polymarketDeskReportAction.handler!(
      runtime,
      createMessage("desk report"),
      undefined,
      undefined,
      async (content) => {
        outText = content?.text ?? "";
      },
    );
    expect(outText).toContain("Polymarket desk report");
    expect(outText).toContain("0 filled");
  });
});
