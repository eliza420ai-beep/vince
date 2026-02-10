/**
 * KELLY_WEEK_AHEAD action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellyWeekAheadAction } from "../actions/weekAhead.action";
import type { KellyLifestyleService } from "../services/lifestyle.service";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

describe("KELLY_WEEK_AHEAD Action", () => {
  describe("validate", () => {
    it("returns true for week ahead", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("week ahead");
      const result = await kellyWeekAheadAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for this week picks", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("this week's picks");
      const result = await kellyWeekAheadAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for plan for the week", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("plan for the week");
      const result = await kellyWeekAheadAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("today's workout");
      const result = await kellyWeekAheadAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("calls callback with text when service and composeState provided", async () => {
      const mockService = {
        getCuratedOpenContext: () => ({
          restaurants: ["A | Bordeaux", "B | Biarritz"],
          hotels: ["Hotel X"],
          fitnessNote: "Pool season",
          rawSection: "",
        }),
        getCurrentSeason: () => "pool",
      } as unknown as KellyLifestyleService;
      const runtime = createMockRuntime({
        getService: (name: string) =>
          name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
        composeState: async () => ({
          values: {},
          data: {},
          text: "Dining: A, B. Hotels: X.",
        }),
        useModel: async () =>
          "1. Lunch at A. 2. Dinner at B. 3. Stay at X. 4. Pool. 5. Wine at Y.",
      });
      const message = createMockMessage("week ahead");
      const callback = createMockCallback();

      await kellyWeekAheadAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]?.text).toBeDefined();
    });

    it("callback or model response has 3 to 5 suggestions (numbered or list-like)", async () => {
      const mockService = {
        getCuratedOpenContext: () => ({
          restaurants: ["A", "B"],
          hotels: ["X"],
          fitnessNote: "Pool",
          rawSection: "",
        }),
        getCurrentSeason: () => "pool",
      } as unknown as KellyLifestyleService;
      const runtime = createMockRuntime({
        getService: (name: string) =>
          name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
        composeState: async () => ({ values: {}, data: {}, text: "" }),
        useModel: async () =>
          "1. Lunch A. 2. Stay X. 3. Pool. 4. Wine Margaux. 5. Day trip Saint-Émilion.",
      });
      const message = createMockMessage("week ahead");
      const callback = createMockCallback();
      await kellyWeekAheadAction.handler(runtime, message, createMockState(), {}, callback);
      const text = callback.calls[0]?.text ?? "";
      const numbered = text.match(/\d+\./g) ?? [];
      expect(numbered.length).toBeGreaterThanOrEqual(3);
      expect(numbered.length).toBeLessThanOrEqual(7);
    });
  });
});
