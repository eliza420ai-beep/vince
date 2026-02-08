/**
 * Kelly plugin health check.
 * Verifies service getCuratedOpenContext and optionally weather.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { KellyLifestyleService } from "./services/lifestyle.service";

export interface KellyHealthResult {
  ok: boolean;
  curatedSchedule: boolean;
  serviceReady: boolean;
  message?: string;
}

/**
 * Simple health check: service exists and getCuratedOpenContext returns non-null (or at least service is ready).
 */
export async function getKellyHealth(runtime: IAgentRuntime): Promise<KellyHealthResult> {
  const service = runtime.getService(
    "KELLY_LIFESTYLE_SERVICE",
  ) as KellyLifestyleService | null;

  if (!service) {
    return {
      ok: false,
      serviceReady: false,
      curatedSchedule: false,
      message: "KELLY_LIFESTYLE_SERVICE not registered",
    };
  }

  const curated = service.getCuratedOpenContext?.() ?? null;
  const curatedSchedule = curated !== null;

  if (!curatedSchedule) {
    logger.debug("[Kelly health] Curated schedule missing or empty");
  }

  return {
    ok: curatedSchedule,
    serviceReady: true,
    curatedSchedule,
    message: curatedSchedule
      ? "OK"
      : "Curated schedule file missing or empty; check knowledge/the-good-life/curated-open-schedule.md",
  };
}
