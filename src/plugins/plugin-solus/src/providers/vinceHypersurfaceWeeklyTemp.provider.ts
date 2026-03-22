/**
 * VINCE_HYPERSURFACE_WEEKLY_TEMP — Cached 7d BULL/BEAR/NEUTRAL for BTC+HYPE from VINCE_OPTIONS.
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";

/** Must match plugin-vince HYPERSURFACE_WEEKLY_TEMP_CACHE_KEY */
const CACHE_KEY = "vince:hypersurface_weekly_temp_check";

interface TempRow {
  asset: string;
  temp: string;
  conviction: number;
  dataQualityScore: number;
  summary: string;
}

interface Payload {
  updatedAt: number;
  rows: TempRow[];
}

export const vinceHypersurfaceWeeklyTempProvider: Provider = {
  name: "VINCE_HYPERSURFACE_WEEKLY_TEMP",
  description:
    "Vince's 7-day BULL/BEAR/NEUTRAL temp check for BTC and HYPE (Hypersurface weekly strike prior). From cache after OPTIONS.",
  dynamic: true,
  position: -5.5,

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    try {
      const raw = await runtime.getCache<Payload>(CACHE_KEY);
      if (!raw?.rows?.length) return {};

      const lines: string[] = ["[Vince 7-day Hypersurface temp check]"];
      for (const row of raw.rows) {
        lines.push(
          `${row.asset}: ${row.temp} — conviction ${Math.round(row.conviction)}% (data ~${row.dataQualityScore}%). ${row.summary}`,
        );
      }
      const text = `\n${lines.join("\n")}\n`;
      return {
        text,
        values: { vinceHypersurfaceWeeklyTemp: raw },
      };
    } catch {
      return {};
    }
  },
};
