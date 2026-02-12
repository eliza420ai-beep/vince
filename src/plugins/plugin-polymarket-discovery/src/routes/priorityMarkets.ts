/**
 * GET /polymarket/priority-markets
 * Returns VINCE-priority Polymarket markets and "why we track" copy for the leaderboard tab.
 * Use Oracle agent ID: /api/agents/:oracleAgentId/plugins/plugin-polymarket-discovery/polymarket/priority-markets
 */

import type { IAgentRuntime } from "@elizaos/core";
import { PolymarketService } from "../services/polymarket.service";
import { VINCE_POLYMARKET_PREFERRED_TAG_SLUGS } from "../constants";

const WHY_WE_TRACK =
  "Priority markets are a palantir into what the market thinks. We use them for: (1) Paper bot — short-term perps on Hyperliquid. (2) Hypersurface strike selection — weekly predictions are the most important. (3) Macro vibe check.";

const INTENT_SUMMARY =
  "These odds are a signal of what the market thinks; they inform the paper bot (perps, Hyperliquid), Hypersurface strike selection (weekly predictions most important), and macro vibe check.";

export interface PriorityMarketsResponse {
  whyWeTrack: string;
  intentSummary: string;
  markets: {
    question: string;
    conditionId: string;
    volume?: string;
    yesTokenId?: string;
    noTokenId?: string;
    slug?: string;
  }[];
  updatedAt: number;
}

export function buildPriorityMarketsHandler() {
  return async (
    req: { params?: Record<string, string>; [k: string]: unknown },
    res: {
      status: (n: number) => { json: (o: object) => void };
      json: (o: object) => void;
    },
    runtime?: IAgentRuntime
  ): Promise<void> => {
    const agentRuntime =
      runtime ??
      (req as any).runtime ??
      (req as any).agentRuntime ??
      (req as any).agent?.runtime;

    if (!agentRuntime) {
      res.status(503).json({
        error: "Priority markets require agent context",
        hint: "Use /api/agents/:agentId/plugins/plugin-polymarket-discovery/polymarket/priority-markets with Oracle agent ID",
      });
      return;
    }

    const service = agentRuntime.getService(
      PolymarketService.serviceType
    ) as PolymarketService | null;

    if (!service) {
      res.status(503).json({
        error: "Polymarket service not available",
        hint: "Ensure the Oracle agent is running and has plugin-polymarket-discovery loaded",
      });
      return;
    }

    try {
      const markets = await service.getMarketsByPreferredTags({
        tagSlugs: VINCE_POLYMARKET_PREFERRED_TAG_SLUGS,
        totalLimit: 30,
      });

      const body: PriorityMarketsResponse = {
        whyWeTrack: WHY_WE_TRACK,
        intentSummary: INTENT_SUMMARY,
        markets: markets.map((m) => ({
          question: m.question,
          conditionId: m.conditionId ?? (m as any).condition_id ?? "",
          volume: m.volume,
          yesTokenId: m.tokens?.find((t: any) => t.outcome?.toLowerCase() === "yes")?.token_id,
          noTokenId: m.tokens?.find((t: any) => t.outcome?.toLowerCase() === "no")?.token_id,
          slug: m.slug ?? (m as any).market_slug,
        })),
        updatedAt: Date.now(),
      };

      res.json(body);
    } catch (err) {
      res.status(500).json({
        error: "Failed to fetch priority markets",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
