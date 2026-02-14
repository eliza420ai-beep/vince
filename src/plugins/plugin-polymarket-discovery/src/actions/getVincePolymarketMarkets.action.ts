/**
 * GET_VINCE_POLYMARKET_MARKETS Action
 *
 * Returns prediction markets only from VINCE-priority topics (crypto, finance, geopolitics, economy).
 * Use for focused market insights and hedging context.
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
  logger,
  ModelType,
} from "@elizaos/core";
import { PolymarketService } from "../services/polymarket.service";
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from "../utils/alohaStyle";
import { shouldPolymarketPluginBeInContext } from "../../matcher";
import {
  VINCE_POLYMARKET_PREFERRED_TAG_SLUGS,
  VINCE_POLYMARKET_PREFERRED_LABELS,
  type VincePolymarketGroup,
} from "../constants";

type GroupFilter = VincePolymarketGroup | "all";

interface GetVincePolymarketMarketsParams {
  group?: string;
  limit?: string | number;
}

type GetVincePolymarketMarketsInput = {
  group?: GroupFilter;
  limit?: number;
};

type GetVincePolymarketMarketsActionResult = ActionResult & {
  input: GetVincePolymarketMarketsInput;
};

function getSlugsByGroup(group: GroupFilter): string[] {
  if (group === "all") {
    return [...VINCE_POLYMARKET_PREFERRED_TAG_SLUGS];
  }
  const slugs = new Set<string>();
  for (const { slug, group: g } of VINCE_POLYMARKET_PREFERRED_LABELS) {
    if (g === group) slugs.add(slug);
  }
  return [...slugs];
}

type MarketSummary = { question: string; volume?: string };

async function generatePolymarketNarrative(
  runtime: IAgentRuntime,
  markets: MarketSummary[],
  group: GroupFilter,
): Promise<string> {
  const dataContext = markets
    .slice(0, 12)
    .map((m, i) => `${i + 1}. ${m.question}${m.volume ? ` (Vol: $${m.volume})` : ""}`)
    .join("\n");

  const prompt = `You are Oracle, summarizing VINCE-priority Polymarket markets for a trader. The user wants to know what prediction markets matter for us (crypto, finance, macro) in plain language.

Group: ${group}
Markets (${markets.length} total):
${dataContext}

Write 1–2 short paragraphs: what's in focus right now, why these markets matter for the paper bot and Hypersurface strikes, and any standout questions. Sound like you're telling a teammate what to watch.

${ALOHA_STYLE_RULES}

${NO_AI_SLOP}

Write 1–2 paragraphs:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (err) {
    logger.warn(
      "[GET_VINCE_POLYMARKET_MARKETS] Narrative generation failed, using list",
    );
    throw err;
  }
}

export const getVincePolymarketMarketsAction: Action = {
  name: "GET_VINCE_POLYMARKET_MARKETS",
  similes: [
    "VINCE_POLYMARKET_TOPICS",
    "PRIORITY_POLYMARKET_MARKETS",
    "POLYMARKET_VINCE_FOCUS",
    "BROWSE_POLYMARKET_VINCE_TOPICS",
  ],
  description:
    "Returns prediction markets only from VINCE-priority topics: crypto (Bitcoin, MicroStrategy, Ethereum, Solana, pre-market, ETF, monthly, weekly, daily), finance (stocks, indices, commodities, IPO, fed rates, treasuries), and geopolitics and economy. Use for focused market insights and hedging context. Returns condition_id and token ids; use GET_POLYMARKET_DETAIL or GET_POLYMARKET_ORDERBOOK for more. Signals inform the paper bot (perps, Hyperliquid), Hypersurface strike selection (weekly predictions most important), and macro vibe check.",

  parameters: {
    group: {
      type: "string",
      description:
        "Filter to one group: crypto, finance, other, or all (default: all)",
      required: false,
    },
    limit: {
      type: "number",
      description: "Maximum number of markets to return (default: 20, max: 50)",
      required: false,
    },
  },

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      if (!shouldPolymarketPluginBeInContext(state, message)) {
        return false;
      }
      const service = runtime.getService(
        PolymarketService.serviceType
      ) as PolymarketService | null;
      if (!service) {
        logger.warn("[GET_VINCE_POLYMARKET_MARKETS] Polymarket service not available");
        return false;
      }
      return true;
    } catch (error) {
      logger.error(
        "[GET_VINCE_POLYMARKET_MARKETS] Error validating action:",
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info("[GET_VINCE_POLYMARKET_MARKETS] Fetching VINCE-priority markets");

      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams ?? {}) as Partial<GetVincePolymarketMarketsParams>;

      let group: GroupFilter = "all";
      const groupParam = (params.group ?? "").toString().toLowerCase();
      if (groupParam === "crypto" || groupParam === "finance" || groupParam === "other") {
        group = groupParam as VincePolymarketGroup;
      } else if (groupParam === "all" || groupParam === "") {
        group = "all";
      }

      let limit = 20;
      if (params.limit !== undefined) {
        const parsed =
          typeof params.limit === "string" ? parseInt(params.limit, 10) : params.limit;
        if (!isNaN(parsed) && parsed > 0) {
          limit = Math.min(parsed, 50);
        }
      }

      const inputParams: GetVincePolymarketMarketsInput = { group, limit };

      const service = runtime.getService(
        PolymarketService.serviceType
      ) as PolymarketService;

      if (!service) {
        const errorMsg = "Polymarket service not available";
        logger.error(`[GET_VINCE_POLYMARKET_MARKETS] ${errorMsg}`);
        callback?.({
          text: ` ${errorMsg}`,
          content: { error: "service_unavailable", details: errorMsg },
        });
        return { success: false, error: new Error(errorMsg), input: inputParams } as GetVincePolymarketMarketsActionResult;
      }

      callback?.({ text: " Fetching VINCE-priority Polymarket markets..." });

      const tagSlugs = getSlugsByGroup(group);
      const limitPerTag = Math.max(2, Math.ceil(limit / Math.max(1, tagSlugs.length)));

      const markets = await service.getMarketsByPreferredTags({
        tagSlugs,
        limitPerTag,
        totalLimit: limit,
      });

      const roomId = message?.roomId ?? "";
      if (roomId) {
        service.recordActivity(roomId, "markets_list", {
          count: markets.length,
          source: "vince_priority",
        });
      }

      if (markets.length === 0) {
        const result: GetVincePolymarketMarketsActionResult = {
          text: ` No VINCE-priority markets found for group "${group}" at the moment. Try "all" or another group.`,
          success: true,
          data: { markets: [], count: 0, group },
          input: inputParams,
        };
        callback?.({
          text: result.text,
          content: { action: "GET_VINCE_POLYMARKET_MARKETS", ...result.data },
        });
        return result;
      }

      // Clean list for chat: question + volume only (IDs stay in result.data for follow-up actions)
      const listPart = markets
        .map((market, index) => {
          let line = `**${index + 1}. ${market.question}**`;
          if (market.volume) {
            const vol = parseFloat(market.volume);
            if (!isNaN(vol)) line += ` · $${vol.toLocaleString()} vol`;
          }
          return line;
        })
        .join("\n\n");

      let text: string;
      try {
        const narrative = await generatePolymarketNarrative(
          runtime,
          markets.map((m) => ({ question: m.question, volume: m.volume })),
          group,
        );
        text = `${narrative}\n\n**Focus markets** (${group}, ${markets.length}):\n\n${listPart}\n\n_Want live odds or detail on one? Say which market._`;
      } catch {
        text = ` **VINCE-priority Polymarket markets** (${group})\n\n${listPart}\n\n_Want live odds or detail on one? Say which market._`;
      }

      const result: GetVincePolymarketMarketsActionResult = {
        text,
        success: true,
        data: {
          markets: markets.map((m) => ({
            condition_id: m.conditionId,
            question: m.question,
            volume: m.volume,
            yes_token_id: m.tokens?.find((t: any) => t.outcome?.toLowerCase() === "yes")?.token_id,
            no_token_id: m.tokens?.find((t: any) => t.outcome?.toLowerCase() === "no")?.token_id,
          })),
          count: markets.length,
          group,
        },
        input: inputParams,
      };

      callback?.({
        text: result.text,
        content: { action: "GET_VINCE_POLYMARKET_MARKETS", ...result.data },
      });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[GET_VINCE_POLYMARKET_MARKETS] Error:", err.message);
      callback?.({
        text: ` Failed to fetch VINCE-priority markets: ${err.message}`,
        content: { error: err.message },
      });
      return { success: false, error: err };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "What Polymarket markets matter for us?" } },
      {
        name: "Oracle",
        content: {
          text: "Fetching VINCE-priority Polymarket markets…",
          action: "GET_VINCE_POLYMARKET_MARKETS",
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "Show our focus markets on Polymarket" } },
      {
        name: "Oracle",
        content: {
          text: "Fetching VINCE-priority Polymarket markets…",
          action: "GET_VINCE_POLYMARKET_MARKETS",
        },
      },
    ],
  ],
};

export default getVincePolymarketMarketsAction;
