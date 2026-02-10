/**
 * Kelly health check tests.
 */

import { describe, it, expect } from "bun:test";
import { getKellyHealth } from "../health";
import { createMockRuntime } from "./test-utils";
import type { KellyLifestyleService } from "../services/lifestyle.service";

describe("getKellyHealth", () => {
  it("returns health.ok true when service exists and getCuratedOpenContext returns non-null", async () => {
    const mockService = {
      getCuratedOpenContext: () => ({
        restaurants: ["Maison Devaux | Rion"],
        hotels: ["Relais de la Poste | Magescq"],
        fitnessNote: "Pool",
        rawSection: "Wed: Maison Devaux",
      }),
    } as unknown as KellyLifestyleService;

    const runtime = createMockRuntime({
      getService: (name: string) =>
        name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
    });

    const health = await getKellyHealth(runtime);

    expect(health.ok).toBe(true);
    expect(health.curatedSchedule).toBe(true);
    expect(health.serviceReady).toBe(true);
    expect(health.message).toBe("OK");
  });

  it("returns health.ok false and message mentions schedule when getCuratedOpenContext returns null", async () => {
    const mockService = {
      getCuratedOpenContext: () => null,
    } as unknown as KellyLifestyleService;

    const runtime = createMockRuntime({
      getService: (name: string) =>
        name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
    });

    const health = await getKellyHealth(runtime);

    expect(health.ok).toBe(false);
    expect(health.curatedSchedule).toBe(false);
    expect(health.serviceReady).toBe(true);
    expect(health.message?.toLowerCase()).toMatch(/schedule|missing|empty|curated/);
  });

  it("returns health.ok false when KELLY_LIFESTYLE_SERVICE is not registered", async () => {
    const runtime = createMockRuntime({ getService: () => null });

    const health = await getKellyHealth(runtime);

    expect(health.ok).toBe(false);
    expect(health.serviceReady).toBe(false);
    expect(health.curatedSchedule).toBe(false);
    expect(health.message?.toLowerCase()).toMatch(/service|registered/);
  });
});
