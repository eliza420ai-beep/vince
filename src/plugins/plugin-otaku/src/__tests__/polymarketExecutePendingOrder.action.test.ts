/**
 * POLYMARKET_EXECUTE_PENDING_ORDER action: validate, no-DB, missing creds records paper fill (UPDATE filled, INSERT trade_log with wallet 'paper').
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { polymarketExecutePendingOrderAction } from "../actions/polymarketExecutePendingOrder.action";
import type { IAgentRuntime, Memory } from "@elizaos/core";

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

describe("plugin-otaku: POLYMARKET_EXECUTE_PENDING_ORDER", () => {
  describe("validate", () => {
    it("returns true for execute + polymarket", async () => {
      const runtime = {} as IAgentRuntime;
      expect(
        await polymarketExecutePendingOrderAction.validate!(
          runtime,
          createMessage("Execute the pending Polymarket order"),
        ),
      ).toBe(true);
    });

    it("returns true for execute + desk order", async () => {
      const runtime = {} as IAgentRuntime;
      expect(
        await polymarketExecutePendingOrderAction.validate!(
          runtime,
          createMessage("Please execute the desk order"),
        ),
      ).toBe(true);
    });

    it("returns true for place polymarket", async () => {
      const runtime = {} as IAgentRuntime;
      expect(
        await polymarketExecutePendingOrderAction.validate!(
          runtime,
          createMessage("Place polymarket order"),
        ),
      ).toBe(true);
    });

    it("returns true for run pending polymarket", async () => {
      const runtime = {} as IAgentRuntime;
      expect(
        await polymarketExecutePendingOrderAction.validate!(
          runtime,
          createMessage("Run pending polymarket"),
        ),
      ).toBe(true);
    });

    it("returns false for unrelated message", async () => {
      const runtime = {} as IAgentRuntime;
      expect(
        await polymarketExecutePendingOrderAction.validate!(
          runtime,
          createMessage("What's the weather?"),
        ),
      ).toBe(false);
    });

    it("returns false when execute without polymarket or desk order", async () => {
      const runtime = {} as IAgentRuntime;
      expect(
        await polymarketExecutePendingOrderAction.validate!(
          runtime,
          createMessage("Execute the swap"),
        ),
      ).toBe(false);
    });
  });

  describe("handler", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("calls callback with database message when getConnection is missing", async () => {
      const runtime = {
        getConnection: undefined,
      } as unknown as IAgentRuntime;
      let callbackText = "";
      await polymarketExecutePendingOrderAction.handler!(
        runtime,
        createMessage("execute polymarket order"),
        undefined,
        undefined,
        (c) => {
          callbackText = (c as { text?: string }).text ?? "";
        },
      );
      expect(callbackText).toContain("Database connection not available");
      expect(callbackText).toContain("cannot read sized orders");
    });

    it("calls callback with database message when connection has no query", async () => {
      const runtime = {
        getConnection: async () => ({}),
      } as unknown as IAgentRuntime;
      let callbackText = "";
      await polymarketExecutePendingOrderAction.handler!(
        runtime,
        createMessage("execute polymarket order"),
        undefined,
        undefined,
        (c) => {
          callbackText = (c as { text?: string }).text ?? "";
        },
      );
      expect(callbackText).toContain("Database connection not available");
    });

    it("calls callback with no pending orders when query returns empty", async () => {
      const runtime = {
        getConnection: async () => ({
          query: async () => ({ rows: [] }),
        }),
      } as unknown as IAgentRuntime;
      let callbackText = "";
      await polymarketExecutePendingOrderAction.handler!(
        runtime,
        createMessage("execute polymarket order"),
        undefined,
        undefined,
        (c) => {
          callbackText = (c as { text?: string }).text ?? "";
        },
      );
      expect(callbackText).toContain("No pending Polymarket sized orders");
    });

    it("when credentials missing: records paper fill (UPDATE filled, INSERT trade_log with wallet 'paper')", async () => {
      const queryCalls: { sql: string; values?: unknown[] }[] = [];
      const runtime = {
        getConnection: async () => ({
          query: async (sql: string, values?: unknown[]) => {
            queryCalls.push({ sql, values });
            if (
              sql.includes("sized_orders") &&
              sql.includes("pending") &&
              !sql.includes("$1")
            )
              return {
                rows: [
                  {
                    id: "order-1",
                    signal_id: "sig-1",
                    market_id: "0xcond",
                    side: "YES",
                    size_usd: 50,
                    max_price: 0.52,
                    slippage_bps: 50,
                  },
                ],
              };
            if (sql.includes("signals") && sql.includes("market_price"))
              return { rows: [{ market_price: 0.48 }] };
            return { rows: [] };
          },
        }),
        getService: vi.fn(() => null),
        getSetting: vi.fn((key: string) => {
          if (key === "POLYMARKET_CLOB_API_URL")
            return "https://clob.polymarket.com";
          return null;
        }),
      } as unknown as IAgentRuntime;

      let callbackText = "";
      await polymarketExecutePendingOrderAction.handler!(
        runtime,
        createMessage("execute polymarket order"),
        undefined,
        undefined,
        (c) => {
          callbackText = (c as { text?: string }).text ?? "";
        },
      );

      expect(callbackText).toContain("Paper fill recorded");
      expect(callbackText).toContain("no CLOB credentials");
      expect(callbackText).toContain("order-1");
      expect(callbackText).toContain("YES");
      expect(callbackText).toContain("50");
      expect(callbackText).toContain("48.0");

      const updateFilled = queryCalls.filter(
        (q) =>
          q.sql.includes("UPDATE") &&
          q.sql.includes("sized_orders") &&
          q.sql.includes("filled"),
      );
      expect(updateFilled).toHaveLength(1);

      const insertTradeLog = queryCalls.filter(
        (q) =>
          q.sql.includes("INSERT") &&
          q.sql.includes("trade_log") &&
          q.values?.includes("paper"),
      );
      expect(insertTradeLog).toHaveLength(1);
      expect(insertTradeLog[0].values).toContain("paper");
      const clobOrderIdx = insertTradeLog[0].values?.findIndex(
        (v) => v === null || v === undefined,
      );
      expect(clobOrderIdx).toBeGreaterThanOrEqual(0);
    });

    it("when discovery service null: credentials missing still records paper fill", async () => {
      const queryCalls: { sql: string; values?: unknown[] }[] = [];
      const runtime = {
        getConnection: async () => ({
          query: async (sql: string, values?: unknown[]) => {
            queryCalls.push({ sql, values });
            if (
              sql.includes("sized_orders") &&
              sql.includes("pending") &&
              !values?.length
            )
              return {
                rows: [
                  {
                    id: "order-1",
                    signal_id: "sig-1",
                    market_id: "0xcond",
                    side: "YES",
                    size_usd: 50,
                    max_price: null,
                    slippage_bps: null,
                  },
                ],
              };
            if (sql.includes("signals"))
              return { rows: [{ market_price: 0.5 }] };
            return { rows: [] };
          },
        }),
        getService: vi.fn(() => null),
        getSetting: vi.fn(() => null),
      } as unknown as IAgentRuntime;

      let callbackText = "";
      await polymarketExecutePendingOrderAction.handler!(
        runtime,
        createMessage("execute desk order"),
        undefined,
        undefined,
        (c) => {
          callbackText = (c as { text?: string }).text ?? "";
        },
      );

      expect(callbackText).toContain("Paper fill recorded");
      const insertTradeLog = queryCalls.filter(
        (q) =>
          q.sql.includes("INSERT") &&
          q.sql.includes("trade_log") &&
          q.values?.includes("paper"),
      );
      expect(insertTradeLog).toHaveLength(1);
    });
  });
});
