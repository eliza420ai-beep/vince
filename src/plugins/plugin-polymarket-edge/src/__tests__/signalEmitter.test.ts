/**
 * Tests for signalEmitter: desk.signals and edge_signals INSERT with mocked runtime.
 */

import { describe, it, expect } from "bun:test";
import { emitSignal } from "../services/signalEmitter";
import type { IAgentRuntime } from "@elizaos/core";
import type { EdgeSignal } from "../strategies/types";

const DESK_TABLE = "plugin_polymarket_desk.signals";
const EDGE_TABLE = "plugin_polymarket_edge.edge_signals";

function makeSignal(overrides: Partial<EdgeSignal> = {}): EdgeSignal {
  return {
    strategy: "model_fair_value",
    source: "model_fair_value",
    market_id: "0xabc",
    side: "YES",
    confidence: 0.8,
    edge_bps: 500,
    forecast_prob: 0.6,
    market_price: 0.48,
    metadata: { spot: 68000, strikeUsd: 70000 },
    ...overrides,
  };
}

describe("plugin-polymarket-edge: signalEmitter", () => {
  it("returns null when getConnection is missing", async () => {
    const runtime = {
      getConnection: undefined,
    } as unknown as IAgentRuntime;
    const id = await emitSignal(runtime, makeSignal());
    expect(id).toBe(null);
  });

  it("returns null when connection has no query", async () => {
    const runtime = {
      getConnection: async () => ({}),
    } as unknown as IAgentRuntime;
    const id = await emitSignal(runtime, makeSignal());
    expect(id).toBe(null);
  });

  it("inserts into desk.signals and edge_signals when connection provides query", async () => {
    const inserts: { sql: string; values: unknown[] }[] = [];
    const client = {
      query: async (sql: string, values?: unknown[]) => {
        if (sql.includes("INSERT")) inserts.push({ sql, values: values ?? [] });
        return { rows: [] };
      },
    };
    const runtime = {
      getConnection: async () => client,
    } as unknown as IAgentRuntime;

    const signal = makeSignal({ suggested_size_usd: 100 });
    const id = await emitSignal(runtime, signal);

    expect(id).not.toBe(null);
    const deskInsert = inserts.find((c) => c.sql.includes(DESK_TABLE));
    const edgeInsert = inserts.find((c) => c.sql.includes(EDGE_TABLE));
    expect(deskInsert).toBeDefined();
    expect(edgeInsert).toBeDefined();

    expect(deskInsert!.sql).toContain("suggested_size_usd");
    expect(deskInsert!.values).toContain(100);
    expect(deskInsert!.values).toContain("model_fair_value");
    expect(deskInsert!.values).toContain("0xabc");

    expect(edgeInsert!.sql).toContain("desk_signal_id");
    expect(edgeInsert!.values).toContain(id);
  });

  it("skips emit when a pending signal already exists for the same market", async () => {
    const inserts: string[] = [];
    const client = {
      query: async (sql: string, values?: unknown[]) => {
        if (sql.includes("INSERT")) inserts.push(sql);
        if (
          sql.includes("SELECT") &&
          sql.includes(DESK_TABLE) &&
          sql.includes("pending")
        ) {
          return { rows: [{ id: "existing-signal-id" }] };
        }
        return { rows: [] };
      },
    };
    const runtime = {
      getConnection: async () => client,
    } as unknown as IAgentRuntime;

    const id = await emitSignal(runtime, makeSignal());
    expect(id).toBe(null);
    expect(inserts.length).toBe(0);
  });

  it("skips emit when a pending sized_order already exists for the same market", async () => {
    const inserts: string[] = [];
    const client = {
      query: async (sql: string, values?: unknown[]) => {
        if (sql.includes("INSERT")) inserts.push(sql);
        if (sql.includes("sized_orders") && sql.includes("SELECT")) {
          return { rows: [{ id: "existing-order-id" }] };
        }
        return { rows: [] };
      },
    };
    const runtime = {
      getConnection: async () => client,
    } as unknown as IAgentRuntime;

    const id = await emitSignal(runtime, makeSignal());
    expect(id).toBe(null);
    expect(inserts.length).toBe(0);
  });

  it("inserts null suggested_size_usd when not provided", async () => {
    const inserts: { sql: string; values: unknown[] }[] = [];
    const client = {
      query: async (sql: string, values?: unknown[]) => {
        if (sql.includes("INSERT") && sql.includes(DESK_TABLE))
          inserts.push({ sql, values: values ?? [] });
        return { rows: [] };
      },
    };
    const runtime = {
      getConnection: async () => client,
    } as unknown as IAgentRuntime;

    const signal = makeSignal();
    delete (signal as Partial<EdgeSignal>).suggested_size_usd;
    await emitSignal(runtime, signal);

    expect(inserts.length).toBe(1);
    const vals = inserts[0].values;
    const suggestedIdx = vals.findIndex((v) => v === null);
    expect(suggestedIdx).toBeGreaterThanOrEqual(0);
  });
});
