/**
 * SynthdataCo API client for probabilistic forecasts.
 * Used by the Analyst (Oracle) to compare Synth forecasts vs Polymarket prices for edge.
 * Docs: https://docs.synthdata.co  Auth: Authorization: Apikey YOUR_API_KEY
 */

import { logger } from "@elizaos/core";

const DEFAULT_SYNTH_API_URL = "https://api.synthdata.co";

export interface SynthForecast {
  probability: number;
  source: string;
  asset?: string;
  raw?: unknown;
}

/**
 * Fetch forecast probability for an asset (e.g. BTC, ETH, SOL).
 * When SYNTH_API_KEY is not set, returns a mock probability for development.
 */
export async function getSynthForecast(
  asset: string,
  apiKey?: string | null,
  baseUrl?: string | null,
): Promise<SynthForecast> {
  const key = apiKey ?? process.env.SYNTH_API_KEY;
  const url = (
    baseUrl ??
    process.env.SYNTH_API_URL ??
    DEFAULT_SYNTH_API_URL
  ).replace(/\/$/, "");

  if (!key?.trim()) {
    logger.debug("[SynthClient] No SYNTH_API_KEY; returning mock forecast");
    return mockForecast(asset);
  }

  try {
    const res = await fetch(
      `${url}/insights/prediction-percentiles?asset=${encodeURIComponent(asset.toUpperCase())}`,
      {
        headers: { Authorization: `Apikey ${key.trim()}` },
      },
    );
    if (!res.ok) {
      const text = await res.text();
      logger.warn(
        `[SynthClient] Synth API error ${res.status}: ${text.slice(0, 200)}`,
      );
      return mockForecast(asset);
    }
    const data = (await res.json()) as Record<string, unknown>;
    const probability = parseProbability(data);
    return {
      probability,
      source: "synth",
      asset: asset.toUpperCase(),
      raw: data,
    };
  } catch (err) {
    logger.warn(`[SynthClient] Fetch failed: ${err}`);
    return mockForecast(asset);
  }
}

function parseProbability(data: Record<string, unknown>): number {
  if (
    typeof data.probability === "number" &&
    data.probability >= 0 &&
    data.probability <= 1
  )
    return data.probability;
  if (typeof data.percentile50 === "number") return data.percentile50;
  if (Array.isArray(data.percentiles) && data.percentiles.length > 0) {
    const mid = (data.percentiles as number[])[
      Math.floor((data.percentiles as number[]).length / 2)
    ];
    if (typeof mid === "number") return mid;
  }
  return 0.5;
}

function mockForecast(asset: string): SynthForecast {
  const seed = asset.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const probability = 0.45 + (seed % 20) / 100;
  return {
    probability,
    source: "synth_mock",
    asset: asset.toUpperCase(),
  };
}
