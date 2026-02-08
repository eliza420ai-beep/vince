/**
 * Integration-style test: kellyContext provider + one action (daily briefing) with mocked useModel.
 */

import { describe, it, expect } from "bun:test";
import { kellyContextProvider } from "../providers/kellyContext.provider";
import { kellyDailyBriefingAction } from "../actions/dailyBriefing.action";
import type { KellyLifestyleService } from "../services/lifestyle.service";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

describe("Kelly integration", () => {
  it("kellyContext + dailyBriefing handler returns non-empty callback text", async () => {
    const mockService = {
      getWellnessTipOfTheDay: () => "5-min breathwork.",
      getDailyBriefing: () => ({
        day: "wednesday",
        date: "2025-02-05",
        suggestions: [],
        specialNotes: ["Restaurants open today: Maison Devaux."],
      }),
      getCurrentSeason: () => "gym" as const,
      getCuratedOpenContext: () => ({
        restaurants: ["Maison Devaux | Rion"],
        hotels: ["Relais de la Poste | Magescq"],
        fitnessNote: "Gym season",
        rawSection: "Wed: Maison Devaux",
      }),
      getPalacePoolReopenDates: () => ({ Palais: "Feb 12", Caudalie: "Feb 5", Eugenie: "Mar 6" }),
      getPalacePoolStatusLine: () =>
        "Caudalie: back open (reopened Feb 5), Palais reopens Feb 12, Eugenie reopens Mar 6",
    } as unknown as KellyLifestyleService;

    const runtime = createMockRuntime({
      getService: (name: string) =>
        name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
      getMemories: async () => [],
      composeState: async () => ({
        values: { kellyDay: "Wednesday" },
        data: {},
        text: "Wednesday. Restaurants open: Maison Devaux. Landes.",
      }),
      useModel: async () =>
        "Wednesday is midweek. Consider lunch at Maison Devaux and a stay at Relais de la Poste. End with 5-min breathwork.",
    });

    const message = createMockMessage("what should I do today");
    const contextResult = await kellyContextProvider.get(runtime, message);
    expect(contextResult?.text).toBeDefined();

    const state = createMockState();
    const callback = createMockCallback();
    await kellyDailyBriefingAction.handler(runtime, message, state, {}, callback);

    expect(callback.calls.length).toBeGreaterThanOrEqual(1);
    const text = callback.calls[0]?.text ?? "";
    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);
  });
});
