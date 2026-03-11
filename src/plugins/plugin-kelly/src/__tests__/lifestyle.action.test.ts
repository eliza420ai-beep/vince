/**
 * KELLY_LIFESTYLE action tests.
 * Broad-trigger lifestyle action (same handler as KELLY_DAILY_BRIEFING).
 */

import { describe, it, expect } from "bun:test";
import { kellyLifestyleAction } from "../actions/lifestyle.action";
import { KellyLifestyleService } from "../services/lifestyle.service";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

describe("KELLY_LIFESTYLE Action", () => {
  describe("validate", () => {
    it("returns true for 'lifestyle' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("lifestyle suggestions");
      const result = await kellyLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'daily' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("daily plan");
      const result = await kellyLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'hotel' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("hotel suggestions");
      const result = await kellyLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'dining' keyword", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("dining recommendations");
      const result = await kellyLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'what should i do today'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what should i do today");
      const result = await kellyLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'pool day'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("is it a pool day");
      const result = await kellyLifestyleAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what is the weather");
      const result = await kellyLifestyleAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("calls callback with text when service is present", async () => {
      const lifestyleService = await KellyLifestyleService.start(
        createMockRuntime() as any,
      );
      const runtime = createMockRuntime({
        getService: (name: string) =>
          name === "KELLY_LIFESTYLE_SERVICE" ? lifestyleService : null,
        useModel: async () =>
          "Midweek escape day. Consider a long lunch and a walk.",
      });
      const message = createMockMessage("lifestyle suggestions");
      const state = createMockState();
      const callback = createMockCallback();

      await kellyLifestyleAction.handler(runtime, message, state, {}, callback);

      expect(callback.calls.length).toBeGreaterThan(0);
      const content = callback.calls[0];
      expect(content?.text).toBeDefined();
      expect(typeof content?.text).toBe("string");
      expect(content?.text.length).toBeGreaterThan(0);
    });

    it("calls callback with fallback when service is missing", async () => {
      const runtime = createMockRuntime({
        getService: () => null,
      });
      const message = createMockMessage("lifestyle");
      const state = createMockState();
      const callback = createMockCallback();

      await kellyLifestyleAction.handler(runtime, message, state, {}, callback);

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0].text).toContain("Lifestyle service is down");
    });
  });
});
