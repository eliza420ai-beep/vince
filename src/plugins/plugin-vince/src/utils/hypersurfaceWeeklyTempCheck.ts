/**
 * 7-day Hypersurface temp check: BULL / BEAR / NEUTRAL for BTC and HYPE.
 * Feeds weekly strike width (next Friday) and is cached for Solus composeState.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { getBullBearAnalyzer } from "../analysis/bullBearAnalyzer";
import type { MarketDirection } from "../types/analysis";

export const HYPERSURFACE_WEEKLY_TEMP_CACHE_KEY =
  "vince:hypersurface_weekly_temp_check";

export type WeeklyHypersurfaceTemp = "BULL" | "BEAR" | "NEUTRAL";

export interface HypersurfaceWeeklyTempRow {
  asset: "BTC" | "HYPE";
  temp: WeeklyHypersurfaceTemp;
  conviction: number;
  dataQualityScore: number;
  summary: string;
}

export interface HypersurfaceWeeklyTempCheckPayload {
  updatedAt: number;
  rows: HypersurfaceWeeklyTempRow[];
}

function directionToTemp(d: MarketDirection): WeeklyHypersurfaceTemp {
  if (d === "bullish") return "BULL";
  if (d === "bearish") return "BEAR";
  return "NEUTRAL";
}

/**
 * Run bull/bear analyzer for BTC and HYPE; cache full payload for Solus.
 */
export async function runHypersurfaceWeeklyTempCheck(
  runtime: IAgentRuntime,
): Promise<HypersurfaceWeeklyTempCheckPayload> {
  const analyzer = getBullBearAnalyzer();
  const rows: HypersurfaceWeeklyTempRow[] = [];

  for (const asset of ["BTC", "HYPE"] as const) {
    try {
      const r = await analyzer.analyze(runtime, asset);
      rows.push({
        asset,
        temp: directionToTemp(r.conclusion.direction),
        conviction: r.conclusion.conviction,
        dataQualityScore: r.dataQualityScore,
        summary: r.conclusion.summary,
      });
    } catch {
      rows.push({
        asset,
        temp: "NEUTRAL",
        conviction: 0,
        dataQualityScore: 0,
        summary: `${asset} temp check unavailable (analysis error).`,
      });
    }
  }

  const payload: HypersurfaceWeeklyTempCheckPayload = {
    updatedAt: Date.now(),
    rows,
  };
  try {
    await runtime.setCache(HYPERSURFACE_WEEKLY_TEMP_CACHE_KEY, payload);
  } catch {
    // non-fatal
  }
  return payload;
}

/** Injected into VINCE_OPTIONS LLM prompt (structured prior). */
export function formatHypersurfaceWeeklyTempCheckForPrompt(
  payload: HypersurfaceWeeklyTempCheckPayload,
): string {
  const lines: string[] = [
    "=== 7-DAY HYPERSURFACE TEMP CHECK (BTC + HYPE) ===",
    "Directional prior for the week into Friday expiry. Map to strikes: BULL → favor wider covered-call strikes / shallower CSPs vs your baseline; BEAR → tighter calls / deeper CSPs; NEUTRAL → ~20–25 delta baseline.",
    "",
  ];
  for (const row of payload.rows) {
    lines.push(
      `${row.asset}: ${row.temp} (conviction ${Math.round(row.conviction)}%, data coverage ~${row.dataQualityScore}%). ${row.summary}`,
    );
  }
  return lines.join("\n");
}

/** Short line for user-facing header (deterministic, not LLM). */
export function formatHypersurfaceWeeklyTempCheckHeading(
  payload: HypersurfaceWeeklyTempCheckPayload,
): string {
  const parts = payload.rows.map(
    (r) => `${r.asset} → ${r.temp} (${Math.round(r.conviction)}% conv)`,
  );
  return `**7-day Hypersurface temp check:** ${parts.join(" · ")}`;
}
