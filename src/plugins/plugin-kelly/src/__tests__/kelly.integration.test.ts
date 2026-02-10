/**
 * Integration-style tests: kellyContext + actions + evaluator flows.
 */

import { describe, it, expect } from "bun:test";
import { kellyContextProvider } from "../providers/kellyContext.provider";
import { weatherProvider } from "../providers/weather.provider";
import { kellyDailyBriefingAction } from "../actions/dailyBriefing.action";
import { kellyRecommendPlaceAction } from "../actions/recommendPlace.action";
import { kellySurfForecastAction } from "../actions/surfForecast.action";
import { lifestyleFeedbackEvaluator } from "../evaluators/lifestyleFeedback.evaluator";
import type { KellyLifestyleService } from "../services/lifestyle.service";
import { findBannedJargon } from "../constants/voice";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";
import { __clearWeatherCacheForTesting } from "../providers/weather.provider";

describe("Kelly integration", () => {
  it("Flow 1: what should I do today → kellyContext + dailyBriefing, callback day-aware and no banned jargon", async () => {
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
    const jargon = findBannedJargon(text);
    expect(jargon).toHaveLength(0);
  });

  it("Flow 2: where to eat in Landes → kellyContext has restaurants open today, recommendPlace recommends one of curated", async () => {
    const curatedRestaurants = ["Maison Devaux | Rion", "Auberge du Lavoir | Garrosse"];
    const mockService = {
      getCuratedOpenContext: () => ({
        restaurants: curatedRestaurants,
        hotels: ["Relais de la Poste | Magescq"],
        fitnessNote: "Pool",
        rawSection: "Wed: Maison Devaux; Auberge du Lavoir",
      }),
      getWellnessTipOfTheDay: () => "",
      getDailyBriefing: () => ({ day: "wednesday", date: "2025-02-05", suggestions: [], specialNotes: [] }),
      getCurrentSeason: () => "pool" as const,
      getPalacePoolReopenDates: () => ({}),
      getPalacePoolStatusLine: () => "",
    } as unknown as KellyLifestyleService;

    const runtime = createMockRuntime({
      getService: (name: string) =>
        name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
      getMemories: async () => [],
      composeState: async () => ({
        values: {
          kellyDay: "Wednesday",
          kellyRestaurantsOpenToday: "Wed: Maison Devaux; Auberge du Lavoir",
        },
        data: {},
        text: "Wednesday. Restaurants open: Maison Devaux; Auberge du Lavoir.",
      }),
      useModel: async () =>
        "**Maison Devaux** — Rion. Great for lunch. Alternative: Auberge du Lavoir.",
    });

    const message = createMockMessage("where to eat in Landes");
    const callback = createMockCallback();
    await kellyRecommendPlaceAction.handler(runtime, message, createMockState(), {}, callback);

    expect(callback.calls.length).toBeGreaterThanOrEqual(1);
    const text = (callback.calls[0]?.text ?? "").toLowerCase();
    const hasCurated = curatedRestaurants.some((r) => text.includes(r.split("|")[0].toLowerCase().trim()));
    expect(hasCurated).toBe(true);
  });

  it("Flow 3: that place was too loud (follow-up) → lifestyleFeedback validate returns true", async () => {
    const roomId = "room-loud" as any;
    const runtime = createMockRuntime({
      character: { name: "Kelly", bio: "Test" },
      getMemories: async (params: { roomId?: string }) => {
        if (params?.roomId === roomId) {
          return [
            { id: "m1", entityId: "u1", roomId, agentId: "a1", content: { text: "We tried that place you suggested" }, createdAt: Date.now() },
            { id: "m2", entityId: "u1", roomId, agentId: "a1", content: { text: "that place was too loud" }, createdAt: Date.now() },
          ] as any;
        }
        return [];
      },
    });
    const message = createMockMessage("anyway thanks", { roomId });
    const valid = await lifestyleFeedbackEvaluator.validate(runtime, message);
    expect(valid).toBe(true);
  });

  it("Flow 4: compose state with weather (rain), surfForecast callback includes indoor or caution", async () => {
    const originalFetch = globalThis.fetch;
    __clearWeatherCacheForTesting();
    globalThis.fetch = async (url: string) => {
      if (String(url).includes("marine-api")) {
        return Response.json({ current: { wave_height: 2, wave_period: 8, wave_direction: 225, sea_surface_temperature: 15 } });
      }
      return Response.json({
        current: { weather_code: 61, temperature_2m: 14, precipitation: 5, wind_speed_10m: 10 },
      });
    };

    const runtime = createMockRuntime({
      getService: () => null,
      getMemories: async () => [],
      composeState: async () => {
        const w = await weatherProvider.get(runtime as any, createMockMessage("surf"));
        return createMockState({ values: w?.values ?? {}, text: w?.text ?? "", data: {} });
      },
      useModel: async () =>
        "Rain and wind today—not ideal for the beach. Consider indoor yoga or check conditions tomorrow.",
    });

    const message = createMockMessage("surf forecast Biarritz");
    const callback = createMockCallback();
    await kellySurfForecastAction.handler(runtime, message, createMockState(), {}, callback);

    globalThis.fetch = originalFetch;
    expect(callback.calls.length).toBeGreaterThanOrEqual(1);
    const text = (callback.calls[0]?.text ?? "").toLowerCase();
    expect(text).toMatch(/indoor|yoga|rain|caution|check|tomorrow/);
  });
});
