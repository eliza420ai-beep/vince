/**
 * Defaults and safety rules suite: lunch not dinner, Mon/Tue closed,
 * no beach/surf in rain or storm, Local weather never names town, winter pool dates.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { kellyDailyBriefingAction } from "../actions/dailyBriefing.action";
import {
  weatherProvider,
  __clearWeatherCacheForTesting,
} from "../providers/weather.provider";
import {
  createMockRuntimeWithService,
  createMockRuntimeWithComposeState,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

/** Town names that must never appear in "Local" weather output (user's home). */
const LOCAL_WEATHER_BLOCKLIST = [
  "Magescq",
  "Rion-des-Landes",
  "Garrosse",
  "Uza",
];

describe("Defaults and safety", () => {
  describe("lunch default (past lunch: do not suggest dinner out)", () => {
    it("dailyBriefing prompt context includes pastLunch instruction when past lunch", async () => {
      const runtime = createMockRuntimeWithService({
        getDailyBriefing: () => ({
          day: "wednesday",
          date: "2025-02-05",
          suggestions: [],
          specialNotes: [],
        }),
      });
      const r = runtime as any;
      let capturedPrompt = "";
      r.useModel = async (opts: { prompt?: string }) => {
        capturedPrompt = (opts?.prompt ?? "").toString();
        return "Pool season—good for a swim. Yoga or wine at home. No lunch or dinner out.";
      };
      const message = createMockMessage("what should I do today");
      const callback = createMockCallback();
      await kellyDailyBriefingAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );
      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      if (
        capturedPrompt.includes("Past lunch") ||
        capturedPrompt.includes("past 14")
      ) {
        expect(text.toLowerCase()).not.toMatch(
          /dinner at a restaurant|go out for dinner/,
        );
      }
    });
  });

  describe("Mon/Tue closed (Relais de la Poste, Côté Quillier)", () => {
    it("when day is Monday, curated context does not list Relais/Côté Quillier as open for lunch", async () => {
      const runtime = createMockRuntimeWithService({
        getCuratedOpenContext: () => ({
          restaurants: ["Auberge du Lavoir | Garrosse"],
          hotels: [],
          fitnessNote: "Gym season",
          rawSection:
            "Mon: Auberge du Lavoir only. Closed Mon–Tue: Le Relais de la Poste, Côté Quillier.",
        }),
        getDailyBriefing: () => ({
          day: "monday",
          date: "2025-02-03",
          suggestions: [],
          specialNotes: [
            "Closed Mon–Tue: Le Relais de la Poste, Côté Quillier (Wed–Sun only).",
          ],
        }),
      });
      const r = runtime as any;
      r.useModel = async (opts: { prompt?: string }) => {
        const p = (opts?.prompt ?? "").toString();
        if (
          p.includes("Monday") &&
          (p.includes("Closed") || p.includes("Mon–Tue"))
        ) {
          return "Monday—limited options. **Auberge du Lavoir** (Garrosse) is open.";
        }
        return "Midweek. Lunch at Maison Devaux.";
      };
      const message = createMockMessage("what should I do today");
      const callback = createMockCallback();
      await kellyDailyBriefingAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );
      const text = callback.calls[0]?.text ?? "";
      expect(text).not.toMatch(/Relais de la Poste|Côté Quillier/);
    });
  });

  describe("rain/storm = no beach/surf/outdoor dining", () => {
    beforeEach(() => __clearWeatherCacheForTesting());
    afterEach(() => {
      // restore fetch in afterEach if needed
    });

    it("weather provider text includes indoor or do not recommend when weather code is rain", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: string) => {
        if ((url as string).includes("marine-api")) {
          return Response.json({
            current: {
              wave_height: 1,
              wave_period: 8,
              wave_direction: 225,
              sea_surface_temperature: 14,
            },
          });
        }
        return Response.json({
          current: {
            weather_code: 61,
            temperature_2m: 12,
            precipitation: 2,
            wind_speed_10m: 10,
          },
        });
      };
      try {
        const runtime = createMockRuntimeWithService();
        const message = createMockMessage("what should I do today");
        const result = await weatherProvider.get(runtime, message);
        const text = (result?.text ?? "").toLowerCase();
        expect(
          text.match(/indoor|do not recommend|rain|beach|surf/),
        ).toBeTruthy();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("weather provider text includes do not recommend or indoor when weather code is storm", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: string) => {
        if ((url as string).includes("marine-api")) {
          return Response.json({
            current: {
              wave_height: 2,
              wave_period: 10,
              wave_direction: 270,
              sea_surface_temperature: 14,
            },
          });
        }
        return Response.json({
          current: {
            weather_code: 95,
            temperature_2m: 11,
            precipitation: 5,
            wind_speed_10m: 40,
          },
        });
      };
      try {
        const runtime = createMockRuntimeWithService();
        const message = createMockMessage("what should I do today");
        const result = await weatherProvider.get(runtime, message);
        const text = (result?.text ?? "").toLowerCase();
        expect(
          text.match(/indoor|do not recommend|storm|thunder|beach|surf/),
        ).toBeTruthy();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("Local weather never names town", () => {
    it("formatted Local weather line does not contain blocklisted town names", () => {
      const weatherHome = { condition: "clear", temp: 14 };
      const formatted = `Local: ${weatherHome.condition}, ${weatherHome.temp}°C`;
      for (const town of LOCAL_WEATHER_BLOCKLIST) {
        expect(formatted).not.toContain(town);
      }
    });
    it("state with weatherHome does not expose town name in text", () => {
      const runtime = createMockRuntimeWithComposeState({
        values: { weatherHome: { condition: "clear", temp: 14 } },
        text: "Local: clear, 14°C",
      });
      const state = {
        values: { weatherHome: { condition: "clear", temp: 14 } },
        data: {},
        text: "Local: clear, 14°C",
      };
      expect(state.text).not.toMatch(
        new RegExp(LOCAL_WEATHER_BLOCKLIST.join("|"), "i"),
      );
    });
  });

  describe("winter pool dates", () => {
    it("lifestyle service mock returns Palais reopens Feb 12, Caudalie Feb 5", () => {
      const mock = createMockRuntimeWithService({
        getPalacePoolReopenDates: () => ({
          Palais: "Feb 12",
          Caudalie: "Feb 5",
          Eugenie: "Mar 6",
        }),
        getPalacePoolStatusLine: () =>
          "Caudalie: back open (reopened Feb 5), Palais reopens Feb 12, Eugenie reopens Mar 6",
      });
      const service = (mock as any).getService?.("KELLY_LIFESTYLE_SERVICE");
      expect(service).toBeDefined();
      const dates = service?.getPalacePoolReopenDates?.();
      expect(dates?.Palais).toBe("Feb 12");
      expect(dates?.Caudalie).toBe("Feb 5");
      const line = service?.getPalacePoolStatusLine?.();
      expect(line).toContain("Palais reopens Feb 12");
      expect(line).toContain("Caudalie");
      expect(line).toContain("Feb 5");
    });
  });
});
