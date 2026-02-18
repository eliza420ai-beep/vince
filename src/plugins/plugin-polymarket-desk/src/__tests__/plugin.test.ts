import { describe, it, expect } from "bun:test";
import pluginPolymarketDesk, { deskSchema } from "../index";

describe("plugin-polymarket-desk: plugin export", () => {
  it("plugin has name and description", () => {
    expect(pluginPolymarketDesk.name).toBe("polymarket-desk");
    expect(pluginPolymarketDesk.description).toContain("trading desk");
    expect(pluginPolymarketDesk.description).toContain("signals");
  });

  it("plugin exports schema with desk tables", () => {
    expect(deskSchema).toBeDefined();
    expect(deskSchema.signals).toBeDefined();
    expect(deskSchema.sizedOrders).toBeDefined();
    expect(deskSchema.tradeLog).toBeDefined();
    expect(deskSchema.riskConfig).toBeDefined();
  });

  it("plugin has three actions", () => {
    expect(Array.isArray(pluginPolymarketDesk.actions)).toBe(true);
    expect(pluginPolymarketDesk.actions!.length).toBe(3);
    const names = pluginPolymarketDesk.actions!.map((a) => a.name);
    expect(names).toContain("POLYMARKET_EDGE_CHECK");
    expect(names).toContain("POLYMARKET_RISK_APPROVE");
    expect(names).toContain("POLYMARKET_DESK_REPORT");
  });

  it("plugin init calls registerDeskSchedule (no throw)", async () => {
    const runtime = {
      character: { name: "Other" },
      registerTaskWorker: () => {},
      createTask: async () => "id",
    } as any;
    await expect(pluginPolymarketDesk.init!({}, runtime)).resolves.toBeUndefined();
  });
});
