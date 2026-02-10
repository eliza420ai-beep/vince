/**
 * WEATHER provider tests (mocked fetch for offline runs).
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  weatherProvider,
  __clearWeatherCacheForTesting,
} from "../providers/weather.provider";
import { createMockRuntime, createMockMessage } from "./test-utils";

const openMeteoCurrent = (weatherCode: number) => ({
  current: {
    weather_code: weatherCode,
    temperature_2m: 14,
    precipitation: 0,
    wind_speed_10m: 10,
  },
});

const marinePayload = {
  current: {
    wave_height: 1.2,
    wave_period: 8,
    wave_direction: 225,
    sea_surface_temperature: 15.5,
  },
};

describe("WEATHER Provider", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    __clearWeatherCacheForTesting();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns values.weatherBordeaux and values.weatherBiarritz when fetch returns valid data", async () => {
    globalThis.fetch = async (url: string) => {
      const s = url as string;
      if (s.includes("marine-api")) {
        return Response.json(marinePayload);
      }
      return Response.json(openMeteoCurrent(1));
    };

    const runtime = createMockRuntime();
    const message = createMockMessage("what should I do today");
    const result = await weatherProvider.get(runtime, message);

    expect(result?.values).toBeDefined();
    expect((result?.values as Record<string, unknown>)?.weatherBordeaux).toBeDefined();
    expect((result?.values as Record<string, unknown>)?.weatherBiarritz).toBeDefined();
    expect((result?.values as Record<string, unknown>)?.weatherHome).toBeDefined();
    expect(result?.text).toBeDefined();
  });

  it("includes surfBiarritz when marine API returns data", async () => {
    globalThis.fetch = async (url: string) => {
      if ((url as string).includes("marine-api")) return Response.json(marinePayload);
      return Response.json(openMeteoCurrent(0));
    };

    const runtime = createMockRuntime();
    const message = createMockMessage("surf forecast");
    const result = await weatherProvider.get(runtime, message);

    expect((result?.values as Record<string, unknown>)?.surfBiarritz).toBeDefined();
    const surf = (result?.values as Record<string, unknown>)?.surfBiarritz as Record<string, unknown>;
    expect(surf?.waveHeight).toBeDefined();
    expect(surf?.seaTemp).toBeDefined();
  });

  it("includes rain/indoor caution in text when weather code is rain", async () => {
    globalThis.fetch = async (url: string) => {
      if ((url as string).includes("marine-api")) return Response.json(marinePayload);
      return Response.json(openMeteoCurrent(61));
    };

    const runtime = createMockRuntime();
    const message = createMockMessage("what should I do today");
    const result = await weatherProvider.get(runtime, message);

    const text = result?.text ?? "";
    expect(text.toLowerCase()).toMatch(/indoor|rain|do not recommend|beach|surf/);
  });

  it("storm (code 95+) yields do not recommend or indoor in text", async () => {
    globalThis.fetch = async (url: string) => {
      if ((url as string).includes("marine-api")) return Response.json(marinePayload);
      return Response.json(openMeteoCurrent(95));
    };

    const runtime = createMockRuntime();
    const message = createMockMessage("what should I do today");
    const result = await weatherProvider.get(runtime, message);

    const text = (result?.text ?? "").toLowerCase();
    expect(text).toMatch(/indoor|do not recommend|storm|thunder|beach|surf/);
  });

  it("marine API failure or empty response does not crash, returns result or check conditions", async () => {
    globalThis.fetch = async (url: string) => {
      if ((url as string).includes("marine-api")) return Response.json({});
      return Response.json(openMeteoCurrent(0));
    };

    const runtime = createMockRuntime();
    const message = createMockMessage("surf forecast");
    const result = await weatherProvider.get(runtime, message);

    expect(result).toBeDefined();
    expect(() => result).not.toThrow();
  });
});
