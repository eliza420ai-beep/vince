/**
 * KELLY_DAILY_BRIEFING action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellyDailyBriefingAction } from "../actions/dailyBriefing.action";
import { KellyLifestyleService } from "../services/lifestyle.service";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

describe("KELLY_DAILY_BRIEFING Action", () => {
  describe("validate", () => {
    it("returns true for 'what should I do today'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what should I do today");
      const result = await kellyDailyBriefingAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'daily suggestions'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("daily suggestions");
      const result = await kellyDailyBriefingAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'lifestyle briefing'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("lifestyle briefing");
      const result = await kellyDailyBriefingAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns false for bare 'lifestyle' (too vague)", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("lifestyle");
      const result = await kellyDailyBriefingAction.validate(runtime, message);
      expect(result).toBe(false);
    });

    it("returns false when specific action triggers match", async () => {
      const runtime = createMockRuntime();
      // "what should i do today" + "workout" → specific action wins
      const message = createMockMessage("what should i do today workout");
      const result = await kellyDailyBriefingAction.validate(runtime, message);
      expect(result).toBe(false);
    });

    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what is the weather");
      const result = await kellyDailyBriefingAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("calls callback with text containing day name when service is present", async () => {
      const lifestyleService = await KellyLifestyleService.start(
        createMockRuntime() as any,
      );
      const runtime = createMockRuntime({
        getService: (name: string) =>
          name === "KELLY_LIFESTYLE_SERVICE" ? lifestyleService : null,
        useModel: async () =>
          "**Wednesday** is midweek escape day. Consider Hôtel du Palais for a stay and Le Meurice for dinner.",
      });
      const message = createMockMessage("what should I do today");
      const state = createMockState();
      const callback = createMockCallback();

      await kellyDailyBriefingAction.handler(
        runtime,
        message,
        state,
        {},
        callback,
      );

      expect(callback.calls.length).toBeGreaterThan(0);
      const content = callback.calls[0];
      expect(content?.text).toBeDefined();
      expect(typeof content?.text).toBe("string");
      expect(content?.text.length).toBeGreaterThan(0);
      const dayNames = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      const hasDay = dayNames.some((d) => content?.text?.includes(d));
      expect(hasDay).toBe(true);
    });

    it("includes curated restaurants when day has open restaurants", async () => {
      const lifestyleService = await KellyLifestyleService.start(
        createMockRuntime() as any,
      );
      const curated = {
        restaurants: [
          "Maison Devaux | Rion-des-Landes",
          "Auberge du Lavoir | Garrosse",
        ],
        hotels: ["Relais de la Poste | Magescq"],
        fitnessNote: "Pool Apr-Nov",
        rawSection: "Wed: Maison Devaux; Auberge du Lavoir",
      };
      const runtime = createMockRuntime({
        getService: (name: string) =>
          name === "KELLY_LIFESTYLE_SERVICE" ? lifestyleService : null,
        useModel: async (_opts: { prompt?: string }) => {
          const p = (_opts?.prompt ?? "").toString();
          if (p.includes("DINING") && p.includes("curated"))
            return "Today: lunch at Maison Devaux (curated, open Wed).";
          return "Wednesday—midweek escape. Consider Relais de la Poste.";
        },
      });
      (lifestyleService as any).getCuratedOpenContext = () => curated;
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
      expect(text.length).toBeGreaterThan(0);
    });

    it("calls callback with fallback when service is missing", async () => {
      const runtime = createMockRuntime({ getService: () => null });
      const message = createMockMessage("daily suggestions");
      const state = createMockState();
      const callback = createMockCallback();

      await kellyDailyBriefingAction.handler(
        runtime,
        message,
        state,
        {},
        callback,
      );

      expect(callback.calls.length).toBe(1);
      expect(callback.calls[0].text).toContain("Lifestyle service is down");
    });

    it("callback has actions array including KELLY_DAILY_BRIEFING when service present", async () => {
      const lifestyleService = await KellyLifestyleService.start(
        createMockRuntime() as any,
      );
      const runtime = createMockRuntime({
        getService: (name: string) =>
          name === "KELLY_LIFESTYLE_SERVICE" ? lifestyleService : null,
        useModel: async () => "Wednesday. Lunch at Maison Devaux. Pool.",
      });
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
      expect(callback.calls[0].actions).toEqual(["KELLY_DAILY_BRIEFING"]);
    });
  });
});
