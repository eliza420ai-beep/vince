/**
 * KELLY_ITINERARY action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellyItineraryAction } from "../actions/itinerary.action";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

describe("KELLY_ITINERARY Action", () => {
  describe("validate", () => {
    it("returns true for 'plan me 2 days in Bordeaux'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("plan me 2 days in Bordeaux");
      const result = await kellyItineraryAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'weekend in Paris'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("weekend in Paris with great food");
      const result = await kellyItineraryAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'itinerary for Lyon'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("itinerary for Lyon");
      const result = await kellyItineraryAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what's the weather");
      const result = await kellyItineraryAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("calls callback with text containing Day when composeState and useModel provided", async () => {
      const runtime = createMockRuntime({
        composeState: async () => ({
          values: {},
          data: {},
          text: "Bordeaux: Hôtel X, Restaurant Y.",
        }),
        useModel: async () =>
          "Day 1 — Hotel X, Lunch at Y, Dinner at Z. Day 2 — Breakfast at X, then check out.",
      });
      const message = createMockMessage("plan me 2 days in Bordeaux");
      const callback = createMockCallback();

      await kellyItineraryAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );

      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      expect(text).toBeDefined();
      expect(text).toMatch(/Day|day/);
    });
  });
});
