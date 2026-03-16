import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { buildLeaderboardsResponse } from "./dashboardLeaderboards";
import { buildTop100Details } from "../utils/top100Details";

export async function buildTop100DetailsResponse(
  runtime: IAgentRuntime,
  params: { ticker?: string; id?: string },
): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  try {
    const leaderboards = await buildLeaderboardsResponse(runtime);
    const detail = await buildTop100Details({
      ticker: params.ticker,
      id: params.id,
      section: leaderboards.top100Stocks ?? null,
    });
    if (!detail) return { ok: false, error: "Ticker not found in Top100" };
    return { ok: true, data: detail };
  } catch (e) {
    logger.debug(
      `[Top100Details] error: ${e instanceof Error ? e.message : String(e)}`,
    );
    return { ok: false, error: "Failed to build Top100 details" };
  }
}
