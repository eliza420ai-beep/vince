/**
 * Weather provider — current conditions for Bordeaux and Biarritz (Open-Meteo, no API key).
 * Marine data for Biarritz surf (wave height, period, direction, sea temp) from Open-Meteo Marine API.
 * Injects into state so Kelly never recommends beach walks or surf in rain or storms.
 * Cached 15 min to avoid repeated API calls; warns on rain, storm, or strong wind.
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
} from "@elizaos/core";
import { RAIN_STORM_SAFETY_LINE, STRONG_WIND_SAFETY_LINE } from "../constants/safety";

const BORDEAUX = { lat: 44.84, lon: -0.58 };
const BIARRITZ = { lat: 43.48, lon: -1.56 };
const HOME = { lat: 43.93, lon: -0.92 };
const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
const MARINE_OPEN_METEO = "https://marine-api.open-meteo.com/v1/marine";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min
const STRONG_WIND_KMH = 35;

const COMPASS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

function degreesToCompass(deg: number): string {
  if (typeof deg !== "number" || Number.isNaN(deg)) return "N/A";
  const idx = Math.round(deg / 22.5) % 16;
  return COMPASS[idx] ?? "N/A";
}

let weatherCache: { result: ProviderResult; at: number } | null = null;

/** Only for tests: clear cache so mocked fetch is used on next get(). */
export function __clearWeatherCacheForTesting(): void {
  weatherCache = null;
}

const WMO_LABELS: Record<number, string> = {
  0: "clear",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "foggy",
  51: "light drizzle",
  53: "drizzle",
  55: "dense drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  66: "light freezing rain",
  67: "freezing rain",
  80: "light showers",
  81: "showers",
  82: "heavy showers",
  95: "thunderstorm",
  96: "thunderstorm with hail",
  99: "thunderstorm with heavy hail",
};

function labelFromCode(code: number): string {
  if (WMO_LABELS[code]) return WMO_LABELS[code];
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 85 && code <= 86) return "snow showers";
  return "mixed";
}

/**
 * True for rain, drizzle, freezing rain, showers, or thunderstorm WMO codes.
 * Does NOT include snow (71–77, 85–86) or fog (45, 48) — those need different advice.
 */
function isRainOrStorm(code: number): boolean {
  return (
    (code >= 51 && code <= 67) || // drizzle (51–55) + rain (61–65) + freezing rain (66–67)
    (code >= 80 && code <= 82) || // showers
    code >= 95                    // thunderstorms (95, 96, 99)
  );
}

async function fetchCurrent(lat: number, lon: number): Promise<{
  weather_code: number;
  temperature_2m: number;
  precipitation: number;
  wind_speed_10m: number;
} | null> {
  const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m,precipitation,wind_speed_10m`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: {
        weather_code?: number;
        temperature_2m?: number;
        precipitation?: number;
        wind_speed_10m?: number;
      };
    };
    const c = data.current;
    if (!c || c.weather_code === undefined) return null;
    return {
      weather_code: c.weather_code,
      temperature_2m: c.temperature_2m ?? 0,
      precipitation: c.precipitation ?? 0,
      wind_speed_10m: c.wind_speed_10m ?? 0,
    };
  } catch {
    return null;
  }
}

interface BiarritzMarine {
  wave_height: number;
  wave_period: number;
  wave_direction: number;
  sea_surface_temperature: number;
}

async function fetchBiarritzMarine(): Promise<BiarritzMarine | null> {
  const url = `${MARINE_OPEN_METEO}?latitude=${BIARRITZ.lat}&longitude=${BIARRITZ.lon}&current=wave_height,sea_surface_temperature,wave_period,wave_direction`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: {
        wave_height?: number;
        wave_period?: number;
        wave_direction?: number;
        sea_surface_temperature?: number;
      };
    };
    const c = data.current;
    if (!c || c.wave_height === undefined) return null;
    return {
      wave_height: c.wave_height ?? 0,
      wave_period: c.wave_period ?? 0,
      wave_direction: c.wave_direction ?? 0,
      sea_surface_temperature: c.sea_surface_temperature ?? 0,
    };
  } catch {
    return null;
  }
}

export const weatherProvider: Provider = {
  name: "WEATHER",
  description:
    "Current weather and Biarritz surf (wave height, period, direction, sea temp); do not recommend beach or surf in rain, storm, or strong wind.",
  position: -4,

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
  ): Promise<ProviderResult> => {
    const now = Date.now();
    if (weatherCache && now - weatherCache.at < CACHE_TTL_MS) {
      return weatherCache.result;
    }

    const [bdx, biarritz, home, marine] = await Promise.all([
      fetchCurrent(BORDEAUX.lat, BORDEAUX.lon),
      fetchCurrent(BIARRITZ.lat, BIARRITZ.lon),
      fetchCurrent(HOME.lat, HOME.lon),
      fetchBiarritzMarine(),
    ]);

    const values: Record<string, unknown> = {};
    let text: string;

    if (!bdx && !biarritz) {
      text =
        "Weather unavailable; avoid recommending outdoor activities (beach, surf) without user confirmation.";
      values.weatherSummary = text;
      weatherCache = { result: { values, text }, at: now };
      return { values, text };
    }

    const parts: string[] = ["**Weather:**"];
    if (bdx) {
      const cond = labelFromCode(bdx.weather_code);
      const temp = Math.round(bdx.temperature_2m);
      parts.push(`Bordeaux: ${cond}, ${temp}°C`);
      values.weatherBordeaux = { condition: cond, temp: temp, code: bdx.weather_code };
    }
    if (biarritz) {
      const cond = labelFromCode(biarritz.weather_code);
      const temp = Math.round(biarritz.temperature_2m);
      parts.push(`Biarritz: ${cond}, ${temp}°C`);
      values.weatherBiarritz = { condition: cond, temp: temp, code: biarritz.weather_code };
    }
    if (home) {
      const cond = labelFromCode(home.weather_code);
      const temp = Math.round(home.temperature_2m);
      parts.push(`Local: ${cond}, ${temp}°C`);
      values.weatherHome = { condition: cond, temp: temp, code: home.weather_code };
    }

    const rainOrStorm =
      (bdx && isRainOrStorm(bdx.weather_code)) ||
      (biarritz && isRainOrStorm(biarritz.weather_code)) ||
      (home && isRainOrStorm(home.weather_code));
    const windBdx = bdx?.wind_speed_10m ?? 0;
    const windBiarritz = biarritz?.wind_speed_10m ?? 0;
    const windHome = home?.wind_speed_10m ?? 0;
    const strongWind =
      windBdx >= STRONG_WIND_KMH ||
      windBiarritz >= STRONG_WIND_KMH ||
      windHome >= STRONG_WIND_KMH;

    if (rainOrStorm) {
      parts.push(RAIN_STORM_SAFETY_LINE);
    }
    if (strongWind && !rainOrStorm) {
      parts.push(STRONG_WIND_SAFETY_LINE);
    }

    if (marine) {
      const waveHeight = Math.round(marine.wave_height * 10) / 10;
      const wavePeriod = Math.round(marine.wave_period * 10) / 10;
      const seaTemp = Math.round(marine.sea_surface_temperature * 10) / 10;
      const direction = degreesToCompass(marine.wave_direction);
      const surfLine = `**Surf (Biarritz):** ${waveHeight} m, ${wavePeriod} s, ${direction}, sea ${seaTemp} °C. When the user asks about surf in Biarritz, use this for the forecast.`;
      parts.push(surfLine);
      values.surfBiarritz = {
        waveHeight,
        wavePeriod,
        waveDirection: direction,
        waveDirectionDeg: marine.wave_direction,
        seaTemp,
      };
      values.surfBiarritzSummary = surfLine;
    }

    text = parts.join(" ");
    values.weatherSummary = text;
    const result: ProviderResult = { values, text };
    weatherCache = { result, at: now };
    return result;
  },
};
