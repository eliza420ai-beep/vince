/**
 * KELLY_SWIMMING_TIPS action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellySwimmingTipsAction } from "../actions/swimmingTips.action";
import type { KellyLifestyleService } from "../services/lifestyle.service";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

describe("KELLY_SWIMMING_TIPS Action", () => {
  describe("validate", () => {
    it("returns true for 'tips for my daily 1000m'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("tips for my daily 1000m");
      const result = await kellySwimmingTipsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'swimming tips'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("swimming tips");
      const result = await kellySwimmingTipsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'winter swimming'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("winter swimming");
      const result = await kellySwimmingTipsAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("surf forecast");
      const result = await kellySwimmingTipsAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("calls callback with text when service and composeState provided", async () => {
      const mockService = {
        getCurrentSeason: () => "gym" as const,
        getPalacePoolReopenDates: () => ({
          Palais: "Feb 12",
          Caudalie: "Feb 5",
          Eugenie: "Mar 6",
        }),
      } as unknown as KellyLifestyleService;
      const runtime = createMockRuntime({
        getService: (name: string) =>
          name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
        composeState: async () => ({
          values: {},
          data: {},
          text: "Swimming-daily-winter-pools. Yoga for swimmers.",
        }),
        useModel: async () =>
          "Winter: backyard pool heating off until end Feb. Indoor: Palais reopens Feb 12, Caudalie Feb 5. Add 10 min surfer yoga after laps.",
      });
      const message = createMockMessage("tips for my daily 1000m");
      const callback = createMockCallback();

      await kellySwimmingTipsAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );

      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      expect(text).toBeDefined();
      expect(text.length).toBeGreaterThan(0);
    });

    it("handler output can mention Palais or reopen when palace dates provided", async () => {
      const mockService = {
        getCurrentSeason: () => "gym" as const,
        getPalacePoolReopenDates: () => ({ Palais: "Feb 12", Caudalie: "Feb 5", Eugenie: "Mar 6" }),
      } as unknown as KellyLifestyleService;
      const runtime = createMockRuntime({
        getService: (name: string) =>
          name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
        composeState: async () => ({ values: {}, data: {}, text: "Winter pools." }),
        useModel: async () => "Palais reopens Feb 12. Caudalie Feb 5.",
      });
      const callback = createMockCallback();

      await kellySwimmingTipsAction.handler(
        runtime,
        createMockMessage("winter swimming"),
        createMockState(),
        {},
        callback,
      );

      expect(callback.calls.length).toBe(1);
      const text = callback.calls[0]?.text ?? "";
      expect(text).toMatch(/Palais|reopen|Feb/i);
    });
  });
});
