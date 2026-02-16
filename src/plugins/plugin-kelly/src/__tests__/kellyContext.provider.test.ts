/**
 * KELLY_CONTEXT provider tests (gym season winter swimming line).
 */

import { describe, it, expect } from "bun:test";
import { kellyContextProvider } from "../providers/kellyContext.provider";
import type { KellyLifestyleService } from "../services/lifestyle.service";
import { createMockRuntime, createMockMessage } from "./test-utils";

describe("KELLY_CONTEXT Provider", () => {
  it("injects winter swimming line when season is gym", async () => {
    const mockService = {
      getWellnessTipOfTheDay: () => "5-min journaling.",
      getDailyBriefing: () => ({
        day: "wednesday",
        date: "2025-02-05",
        suggestions: [],
        specialNotes: ["Gym season active (Dec-Mar)"],
      }),
      getCurrentSeason: () => "gym" as const,
      getCuratedOpenContext: () => null,
      getPalacePoolReopenDates: () => ({
        Palais: "Feb 12",
        Caudalie: "Feb 5",
        Eugenie: "Mar 6",
      }),
      getPalacePoolStatusLine: () =>
        "Caudalie: back open (reopened Feb 5), Palais reopens Feb 12, Eugenie reopens Mar 6",
    } as unknown as KellyLifestyleService;

    const runtime = createMockRuntime({
      getService: (name: string) =>
        name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
      getMemories: async () => [],
    });
    const message = createMockMessage("what should I do today");

    const result = await kellyContextProvider.get(runtime, message);

    expect(result?.text).toBeDefined();
    const text = result?.text ?? "";
    expect(text).toMatch(/Swimming|palace|Palais|Feb 12|Caudalie|reopens/i);
  });

  it("when day is Wednesday and curated has restaurants, result includes restaurants open today", async () => {
    const mockService = {
      getWellnessTipOfTheDay: () => "Stretch.",
      getDailyBriefing: () => ({
        day: "wednesday",
        date: "2025-02-05",
        suggestions: [],
        specialNotes: [],
      }),
      getCurrentSeason: () => "pool" as const,
      getCuratedOpenContext: () => ({
        restaurants: ["Maison Devaux | Rion", "Auberge du Lavoir | Garrosse"],
        hotels: ["Relais de la Poste | Magescq"],
        fitnessNote: "Pool",
        rawSection: "Wed: Maison Devaux; Auberge du Lavoir",
      }),
      getPalacePoolReopenDates: () => ({}),
      getPalacePoolStatusLine: () => "",
    } as unknown as KellyLifestyleService;

    const runtime = createMockRuntime({
      getService: (name: string) =>
        name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
      getMemories: async () => [],
    });
    const message = createMockMessage("where to eat in Landes");
    const result = await kellyContextProvider.get(runtime, message);

    expect(result?.values).toBeDefined();
    expect((result?.values as Record<string, unknown>)?.kellyRestaurantsOpenToday).toBeDefined();
    const text = result?.text ?? "";
    expect(text).toMatch(/Restaurants open|Maison Devaux|Auberge du Lavoir/i);
  });

  it("when month is January (gym season), result includes winter season and palace pool reopen dates", async () => {
    const mockService = {
      getWellnessTipOfTheDay: () => "Breathwork.",
      getDailyBriefing: () => ({
        day: "wednesday",
        date: "2025-01-15",
        suggestions: [],
        specialNotes: [],
      }),
      getCurrentSeason: () => "gym" as const,
      getCuratedOpenContext: () => null,
      getPalacePoolReopenDates: () => ({ Palais: "Feb 12", Caudalie: "Feb 5", Eugenie: "Mar 6" }),
      getPalacePoolStatusLine: () =>
        "Palais reopens Feb 12, Caudalie reopens Feb 5, Eugenie reopens Mar 6",
    } as unknown as KellyLifestyleService;

    const runtime = createMockRuntime({
      getService: (name: string) =>
        name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
      getMemories: async () => [],
    });
    const message = createMockMessage("what should I do today");
    const result = await kellyContextProvider.get(runtime, message);

    const text = result?.text ?? "";
    expect(text).toMatch(/Gym|Dec|Mar|Palais|Feb 12|Caudalie|reopens/i);
  });

  it("detects requested day from 'Monday lunch' pattern", async () => {
    const mockService = {
      getWellnessTipOfTheDay: () => "Stretch.",
      getDailyBriefing: () => ({
        day: "wednesday",
        date: "2025-02-05",
        suggestions: [],
        specialNotes: [],
      }),
      getCurrentSeason: () => "pool" as const,
      getCuratedOpenContext: (day?: string) => ({
        restaurants: day === "monday"
          ? ["Maison Devaux | Rion"]
          : ["Auberge du Lavoir | Garrosse"],
        hotels: [],
        fitnessNote: "Pool",
        rawSection: "restaurants",
      }),
      getPalacePoolReopenDates: () => ({}),
      getPalacePoolStatusLine: () => "",
    } as unknown as KellyLifestyleService;

    const runtime = createMockRuntime({
      getService: (name: string) =>
        name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
      getMemories: async () => [],
    });
    const message = createMockMessage("Monday lunch recommendations");
    const result = await kellyContextProvider.get(runtime, message);

    const values = result?.values as Record<string, unknown>;
    expect(values?.kellyRequestedDay).toBe("Monday");
    const text = result?.text ?? "";
    expect(text).toMatch(/User asked for Monday/i);
  });

  it("when service is missing, returns gracefully with kellyDay and no throw", async () => {
    const runtime = createMockRuntime({ getService: () => null, getMemories: async () => [] });
    const message = createMockMessage("what should I do today");
    const result = await kellyContextProvider.get(runtime, message);

    expect(result).toBeDefined();
    expect((result?.values as Record<string, unknown>)?.kellyDay).toBeDefined();
    expect(result?.text).toBeDefined();
  });
});
