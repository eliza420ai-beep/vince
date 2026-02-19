/**
 * KELLY_SURF_FORECAST action tests (marine missing fallback, rain indoor suggestion, no banned jargon).
 */

import { describe, it, expect } from "bun:test";
import { kellySurfForecastAction } from "../actions/surfForecast.action";
import { findBannedJargon } from "../constants/voice";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

describe("KELLY_SURF_FORECAST Action", () => {
  describe("validate", () => {
    it("returns true for 'surf forecast'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("surf forecast");
      const result = await kellySurfForecastAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'how's the surf in Biarritz'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("how's the surf in Biarritz");
      const result = await kellySurfForecastAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("best hotel in Paris");
      const result = await kellySurfForecastAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("returns fallback message when marine data is missing", async () => {
      const runtime = createMockRuntime({
        composeState: async () =>
          createMockState({ values: {}, data: {}, text: "" }),
      });
      const message = createMockMessage("surf forecast for today");
      const callback = createMockCallback();

      await kellySurfForecastAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );

      expect(callback.calls.length).toBe(1);
      const text = callback.calls[0]?.text ?? "";
      expect(text).toContain("isn't available");
    });

    it("includes indoor suggestion when rain/storm", async () => {
      const runtime = createMockRuntime({
        composeState: async () =>
          createMockState({
            values: {
              surfBiarritz: {
                waveHeight: 1,
                wavePeriod: 7,
                waveDirection: "SW",
                seaTemp: 14,
              },
              weatherBiarritz: { condition: "rain", temp: 12, code: 61 },
            },
            data: {},
            text: "",
          }),
      });
      const message = createMockMessage("can I surf today");
      const callback = createMockCallback();

      await kellySurfForecastAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );

      expect(callback.calls.length).toBe(1);
      const text = callback.calls[0]?.text ?? "";
      expect(text.toLowerCase()).toMatch(/indoor|yoga|rain/);
    });

    it("suggests indoor or surfer yoga when wave height is dangerous (e.g. 4m)", async () => {
      const runtime = createMockRuntime({
        composeState: async () =>
          createMockState({
            values: {
              surfBiarritz: {
                waveHeight: 4,
                wavePeriod: 14,
                waveDirection: "SW",
                seaTemp: 14,
              },
              weatherBiarritz: { condition: "clear", temp: 16, code: 0 },
            },
            data: {},
            text: "",
          }),
      });
      const message = createMockMessage("surf forecast");
      const callback = createMockCallback();
      await kellySurfForecastAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );
      const text = callback.calls[0]?.text ?? "";
      expect(text.toLowerCase()).toMatch(/indoor|yoga|experienced|powerful/);
    });

    it("handler output contains no banned jargon when surf data present", async () => {
      const runtime = createMockRuntime({
        composeState: async () =>
          createMockState({
            values: {
              surfBiarritz: {
                waveHeight: 1.2,
                wavePeriod: 8,
                waveDirection: "SW",
                seaTemp: 15,
              },
              weatherBiarritz: { condition: "clear", temp: 18, code: 0 },
            },
            data: {},
            text: "",
          }),
      });
      const message = createMockMessage("surf forecast");
      const callback = createMockCallback();

      await kellySurfForecastAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );

      expect(callback.calls.length).toBe(1);
      const text = callback.calls[0]?.text ?? "";
      const banned = findBannedJargon(text);
      expect(banned).toEqual([]);
    });
  });
});
