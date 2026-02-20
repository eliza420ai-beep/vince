/**
 * POLYMARKET_EXECUTE_PENDING_ORDER action: validate, no-DB, missing creds leaves order pending (no rejected UPDATE).
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

    it("when credentials missing: callback explains not configured and no UPDATE to rejected", async () => {
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

      expect(callbackText).toContain("Polymarket execution not configured");
      expect(callbackText).toContain("Order left pending");
      expect(callbackText).toContain("paper position");

      const rejectedUpdates = queryCalls.filter(
        (q) => q.sql.includes("UPDATE") && q.sql.includes("rejected"),
      );
      expect(rejectedUpdates).toHaveLength(0);
    });

    it("when discovery service null: still checks credentials and leaves pending if missing", async () => {
      const queryCalls: { sql: string }[] = [];
      const runtime = {
        getConnection: async () => ({
          query: async (sql: string, values?: unknown[]) => {
            queryCalls.push({ sql });
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

      expect(callbackText).toContain("not configured");
      expect(callbackText).toContain("left pending");
      const rejectedUpdates = queryCalls.filter(
        (q) => q.sql.includes("UPDATE") && q.sql.includes("rejected"),
      );
      expect(rejectedUpdates).toHaveLength(0);
    });
  });
});
