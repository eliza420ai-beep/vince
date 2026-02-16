/**
 * GET_ACTIVE_POLYMARKETS Action
 *
 * Fetches trending/active prediction markets from Polymarket.
 * Response: ALOHA-style narrative lead-in + clean list (no raw IDs in chat).
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
import type { PolymarketMarket } from "../types";
import { shouldPolymarketPluginBeInContext } from "../../matcher";
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from "../utils/alohaStyle";

interface GetActiveMarketsParams {
  limit?: string | number;
}

type GetActiveMarketsInput = {
  limit?: number;
};

type GetActiveMarketsActionResult = ActionResult & { input: GetActiveMarketsInput };

type MarketWithPrices = {
  market: PolymarketMarket;
  prices: {
    yes_price_formatted: string;
    no_price_formatted: string;
    [k: string]: unknown;
  };
};

/** One or two short ALOHA-style paragraphs on what's trending; no raw IDs, no bullet dumps. */
async function generateActiveMarketsNarrative(
  runtime: IAgentRuntime,
  marketsWithPrices: MarketWithPrices[],
): Promise<string> {
  const lines = marketsWithPrices.slice(0, 10).map(({ market, prices }, i) => {
    const vol = market.volume ? ` · $${parseFloat(market.volume).toLocaleString()} vol` : "";
    return `${i + 1}. ${market.question} — YES ${prices.yes_price_formatted} / NO ${prices.no_price_formatted}${vol}`;
  });
  const prompt = `You are Oracle, the prediction-markets specialist. The user asked what's trending on Polymarket. Here are the active markets and current odds:

${lines.join("\n")}

Write 1–2 short paragraphs: what's hot right now, what stands out, and why it might matter. Sound like you're telling a smart friend over coffee—no bullet lists, no condition_id or token IDs, no "Here are the results." Just flowing take.

${ALOHA_STYLE_RULES}

${NO_AI_SLOP}

Reply with 1–2 paragraphs only:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (err) {
    logger.warn("[GET_ACTIVE_POLYMARKETS] Narrative generation failed, using list only");
    return "";
  }
}

export const getActiveMarketsAction: Action = {
  name: "GET_ACTIVE_POLYMARKETS",
  similes: [
    "SHOW_POLYMARKET",
    "LIST_POLYMARKET",
    "TRENDING_MARKETS",
    "POPULAR_PREDICTIONS",
    "ACTIVE_PREDICTIONS",
    "POLYMARKET_TRENDING",
    "WHAT_MARKETS",
  ],
  description:
    "Get trending and active prediction markets from Polymarket. Returns condition_id and token_ids (yes_token_id, no_token_id) for each market. Use condition_id with GET_POLYMARKET_DETAIL for full info, or use token_id directly with GET_POLYMARKET_ORDERBOOK for orderbook depth.",

  parameters: {
    limit: {
      type: "number",
      description: "Maximum number of markets to return (default: 10, max: 50)",
      required: false,
    },
  },

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      // Check plugin context first
      if (!shouldPolymarketPluginBeInContext(state, message)) {
        return false;
      }

      const service = runtime.getService(
        PolymarketService.serviceType
      ) as PolymarketService;

      if (!service) {
        logger.warn("[GET_ACTIVE_POLYMARKETS] Polymarket service not available");
        return false;
      }

      return true;
    } catch (error) {
      logger.error(
        "[GET_ACTIVE_POLYMARKETS] Error validating action:",
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
      logger.info("[GET_ACTIVE_POLYMARKETS] Fetching active markets");

      // Read parameters from state
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams ?? {}) as Partial<GetActiveMarketsParams>;

      // Parse limit parameter
      let limit = 10; // default
      if (params.limit) {
        const parsedLimit =
          typeof params.limit === "string" ? parseInt(params.limit, 10) : params.limit;
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = Math.min(parsedLimit, 50); // cap at 50
        }
      }

      const inputParams: GetActiveMarketsInput = { limit };

      // Get service
      const service = runtime.getService(
        PolymarketService.serviceType
      ) as PolymarketService;

      if (!service) {
        const errorMsg = "Polymarket service not available";
        logger.error(`[GET_ACTIVE_POLYMARKETS] ${errorMsg}`);
        const errorResult: GetActiveMarketsActionResult = {
          text: ` ${errorMsg}`,
          success: false,
          error: "service_unavailable",
          input: inputParams,
        };
        callback?.({
          text: errorResult.text,
          content: { error: "service_unavailable", details: errorMsg },
        });
        return errorResult;
      }

      callback?.({ text: " Fetching active markets and prices..." });

      // Fetch active markets
      logger.info(`[GET_ACTIVE_POLYMARKETS] Fetching ${limit} active markets`);
      const markets = await service.getActiveMarkets(limit);

      if (markets.length === 0) {
        const result: GetActiveMarketsActionResult = {
          text: " No active prediction markets found at the moment.",
          success: true,
          data: { markets: [], count: 0 },
          input: inputParams,
        };
        callback?.({
          text: result.text,
          actions: ["GET_ACTIVE_POLYMARKETS"],
        });
        return result;
      }

      const roomId = message?.roomId ?? "";
      if (roomId) {
        service.recordActivity(roomId, "markets_list", { count: markets.length });
      }

      // Fetch prices for all markets in parallel
      logger.info("[GET_ACTIVE_POLYMARKETS] Fetching prices for markets");
      const marketsWithPrices = await Promise.all(
        markets.map(async (market) => {
          try {
            const prices = await service.getMarketPrices(market.conditionId);
            return { market, prices };
          } catch (error) {
            logger.warn(
              `[GET_ACTIVE_POLYMARKETS] Failed to fetch prices for ${market.conditionId}: ${error instanceof Error ? error.message : String(error)}`
            );
            // Return market without prices
            return {
              market,
              prices: {
                yes_price: "0.50",
                no_price: "0.50",
                yes_price_formatted: "50.0%",
                no_price_formatted: "50.0%",
                spread: "0.0000",
                last_updated: Date.now(),
                condition_id: market.conditionId,
              },
            };
          }
        })
      );

      // Narrative lead-in (ALOHA style); fallback to minimal header if LLM fails
      let narrative = await generateActiveMarketsNarrative(runtime, marketsWithPrices as any);
      if (!narrative.trim()) {
        narrative = `Here’s what’s active on Polymarket right now—${marketsWithPrices.length} markets with live odds.`;
      }

      // Clean list for chat: question, odds, volume only (no condition_id / token_id)
      const listLines = marketsWithPrices.map(({ market, prices }, index) => {
        let line = `**${index + 1}. ${market.question}**\n   YES ${prices.yes_price_formatted} · NO ${prices.no_price_formatted}`;
        if (market.volume) {
          const vol = parseFloat(market.volume);
          if (!isNaN(vol)) line += ` · $${vol.toLocaleString()} vol`;
        }
        return line;
      });

      const text = `${narrative}\n\n${listLines.join("\n\n")}\n\n_Want live odds or detail on one? Say which market._`;

      const result: GetActiveMarketsActionResult = {
        text,
        success: true,
        data: {
          markets: marketsWithPrices.map(({ market, prices }) => {
            const tokens = market.tokens || [];
            const yesToken = tokens.find((t: any) => t.outcome?.toLowerCase() === "yes");
            const noToken = tokens.find((t: any) => t.outcome?.toLowerCase() === "no");
            return {
              condition_id: market.conditionId,
              question: market.question,
              category: market.category,
              volume: market.volume,
              yes_price: prices.yes_price,
              no_price: prices.no_price,
              yes_price_formatted: prices.yes_price_formatted,
              no_price_formatted: prices.no_price_formatted,
              // Include token IDs for multi-step action chaining
              yes_token_id: yesToken?.token_id || null,
              no_token_id: noToken?.token_id || null,
            };
          }),
          count: marketsWithPrices.length,
        },
        input: inputParams,
      };

      logger.info(
        `[GET_ACTIVE_POLYMARKETS] Successfully fetched ${marketsWithPrices.length} markets`
      );

      // Send final response to user (without this, the UI only shows the intermediate "Fetching..." message)
      callback?.({
        text: result.text,
        actions: ["GET_ACTIVE_POLYMARKETS"],
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[GET_ACTIVE_POLYMARKETS] Error: ${errorMsg}`);
      const errorResult: ActionResult = {
        text: ` Failed to fetch active markets: ${errorMsg}`,
        success: false,
        error: errorMsg,
      };
      callback?.({
        text: errorResult.text,
        content: { error: "fetch_failed", details: errorMsg },
      });
      return errorResult;
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "what are the trending polymarket predictions?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Fetching trending Polymarket predictions...",
          action: "GET_ACTIVE_POLYMARKETS",
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "show me 5 active prediction markets" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Getting 5 active markets...",
          action: "GET_ACTIVE_POLYMARKETS",
          limit: 5,
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "what markets are popular on polymarket right now?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Checking popular Polymarket markets...",
          action: "GET_ACTIVE_POLYMARKETS",
        },
      },
    ],
  ],
};

export default getActiveMarketsAction;
