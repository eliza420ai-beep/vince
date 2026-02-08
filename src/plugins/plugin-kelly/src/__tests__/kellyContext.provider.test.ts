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
});
