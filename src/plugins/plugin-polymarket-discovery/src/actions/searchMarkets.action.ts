/**
 * SEARCH_POLYMARKETS Action
 *
 * Search for prediction markets by keyword or category.
 * For VINCE-priority-only results (crypto, finance, geopolitics, economy), use GET_VINCE_POLYMARKET_MARKETS instead.
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
  logger,
} from "@elizaos/core";
import { PolymarketService } from "../services/polymarket.service";
import { shouldPolymarketPluginBeInContext } from "../../matcher";
import { extractPolymarketParams } from "../utils/llmExtract";

interface SearchMarketsParams {
  query?: string;
  category?: string;
  limit?: string | number;
}

type SearchMarketsInput = {
  query?: string;
  category?: string;
  limit?: number;
};

type SearchMarketsActionResult = ActionResult & { input: SearchMarketsInput };

export const searchMarketsAction: Action = {
  name: "SEARCH_POLYMARKETS",
  similes: [
    "FIND_POLYMARKET",
    "SEARCH_PREDICTIONS",
    "FIND_PREDICTIONS",
    "POLYMARKET_SEARCH",
    "QUERY_POLYMARKET",
    "LOOK_FOR_MARKETS",
  ],
  description:
    "Search for prediction markets on Polymarket by keyword or category. Returns condition_id for each market. To get orderbook data, first use GET_POLYMARKET_DETAIL with the condition_id to get the token_ids, then use GET_POLYMARKET_ORDERBOOK with those token_ids.",

  parameters: {
    query: {
      type: "string",
      description: "Search keywords (e.g., 'bitcoin', 'election', 'AI')",
      required: false,
    },
    category: {
      type: "string",
      description: "Market category (e.g., 'crypto', 'politics', 'sports')",
      required: false,
    },
    limit: {
      type: "number",
      description: "Maximum number of results to return (default: 10, max: 50)",
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
        PolymarketService.serviceType,
      ) as PolymarketService;

      if (!service) {
        logger.warn("[SEARCH_POLYMARKETS] Polymarket service not available");
        return false;
      }

      return true;
    } catch (error) {
      logger.error(
        "[SEARCH_POLYMARKETS] Error validating action:",
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      logger.info("[SEARCH_POLYMARKETS] Searching markets");

      // Prefer ACTION_STATE; fill from LLM/regex when missing
      const composedState = await runtime.composeState(
        message,
        ["ACTION_STATE"],
        true,
      );
      let params = (composedState?.data?.actionParams ??
        {}) as Partial<SearchMarketsParams>;
      const hasCriteria = params.query?.trim() || params.category?.trim();
      if (!hasCriteria) {
        const extracted = await extractPolymarketParams(
          runtime,
          message,
          _state,
          {
            requiredKeys: [],
            useLlm: true,
          },
        );
        if (extracted.query) params = { ...params, query: extracted.query };
        if (extracted.category)
          params = { ...params, category: extracted.category };
        if (extracted.limit != null)
          params = { ...params, limit: extracted.limit };
      }

      const query = params.query?.trim();
      const category = params.category?.trim();

      let limit = 10;
      if (params.limit) {
        const parsedLimit =
          typeof params.limit === "string"
            ? parseInt(params.limit, 10)
            : params.limit;
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = Math.min(parsedLimit, 50);
        }
      }

      // Validate at least one search criteria
      if (!query && !category) {
        const errorMsg = "Please provide either a search query or category";
        logger.error(`[SEARCH_POLYMARKETS] ${errorMsg}`);
        const errorResult: SearchMarketsActionResult = {
          text: ` ${errorMsg}`,
          success: false,
          error: "missing_criteria",
          input: { query, category, limit },
        };
        callback?.({
          text: errorResult.text,
          content: { error: "missing_criteria", details: errorMsg },
        });
        return errorResult;
      }

      const inputParams: SearchMarketsInput = { limit };
      if (query) inputParams.query = query;
      if (category) inputParams.category = category;

      // Get service
      const service = runtime.getService(
        PolymarketService.serviceType,
      ) as PolymarketService;

      if (!service) {
        const errorMsg = "Polymarket service not available";
        logger.error(`[SEARCH_POLYMARKETS] ${errorMsg}`);
        const errorResult: SearchMarketsActionResult = {
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

      // Immediate acknowledgement
      const ackMsg = query
        ? `Searching Polymarket for "${query}"...`
        : category
          ? `Browsing Polymarket category "${category}"...`
          : "Searching Polymarket...";
      callback?.({ text: ackMsg });

      // Prefer Gamma public-search (query) or events-by-tag (category); fallback to client-side search
      let markets: Awaited<ReturnType<PolymarketService["searchMarkets"]>> = [];
      if (query) {
        try {
          markets = await service.searchMarketsViaGammaSearch(query, limit);
        } catch (err) {
          logger.warn(
            `[SEARCH_POLYMARKETS] Gamma public-search failed, using fallback: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      if (category && !query && markets.length === 0) {
        try {
          markets = await service.getEventsByTag(category, limit);
        } catch (err) {
          logger.warn(
            `[SEARCH_POLYMARKETS] Gamma events-by-tag failed, using fallback: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      if (markets.length === 0) {
        markets = await service.searchMarkets({
          query: query ?? undefined,
          category: category ?? undefined,
          active: true,
          limit,
        });
      }

      if (markets.length === 0) {
        const searchDesc = query
          ? `matching "${query}"`
          : category
            ? `in category "${category}"`
            : "matching your criteria";
        const result: SearchMarketsActionResult = {
          text: ` No prediction markets found ${searchDesc}.`,
          success: true,
          data: { markets: [], count: 0 },
          input: inputParams,
        };
        callback?.({
          text: result.text,
          actions: ["SEARCH_POLYMARKETS"],
        });
        return result;
      }

      const roomId = message?.roomId ?? "";
      if (roomId) {
        service.recordActivity(roomId, "search", {
          query: query ?? undefined,
          category: category ?? undefined,
          count: markets.length,
        });
      }

      // Use prices from search payload (outcomePrices/tokens) to avoid getMarketDetail for conditionIds not in GET /markets list
      logger.info(
        `[SEARCH_POLYMARKETS] Fetching prices for ${markets.length} markets`,
      );
      const fallbackPrices = (market: {
        conditionId?: string;
        [k: string]: any;
      }) => ({
        yes_price: "0.50",
        no_price: "0.50",
        yes_price_formatted: "50.0%",
        no_price_formatted: "50.0%",
        spread: "0.0000",
        last_updated: Date.now(),
        condition_id: market.conditionId ?? market.condition_id ?? "",
      });
      const marketsWithPrices = markets.map((market) => {
        const prices =
          service.getPricesFromMarketPayload(market) ?? fallbackPrices(market);
        return { market, prices };
      });

      // Format response (ALOHA: benefit-led, no condition_id/token_id in text)
      const searchDesc = query
        ? `"${query}"`
        : category
          ? `category "${category}"`
          : "your search";
      let text = ` Here’s what turned up for ${searchDesc}—${marketsWithPrices.length} markets:\n\n`;

      marketsWithPrices.forEach(({ market, prices }, index) => {
        text += `**${index + 1}. ${market.question}**\n`;
        text += `   YES: ${prices.yes_price_formatted} | NO: ${prices.no_price_formatted}\n`;

        if (market.category) {
          text += `   Category: ${market.category}\n`;
        }

        if (market.volume) {
          const volumeNum = parseFloat(market.volume);
          if (!isNaN(volumeNum)) {
            text += `   Volume: $${volumeNum.toLocaleString()}\n`;
          }
        }

        text += "\n";
      });

      // Don't put condition_id/token_id in user-facing text—no insight, just noise. Data stays in result for follow-up actions.
      text +=
        "_I can get live odds or full detail for any of these—say which market._";

      const result: SearchMarketsActionResult = {
        text,
        success: true,
        data: {
          markets: marketsWithPrices.map(({ market, prices }) => {
            const tokens = market.tokens || [];
            const yesToken = tokens.find(
              (t: any) => t.outcome?.toLowerCase() === "yes",
            );
            const noToken = tokens.find(
              (t: any) => t.outcome?.toLowerCase() === "no",
            );
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
          search_query: query,
          search_category: category,
        },
        input: inputParams,
      };

      logger.info(
        `[SEARCH_POLYMARKETS] Successfully found ${marketsWithPrices.length} markets`,
      );
      // Send the full search results to the user (early callback only sent "Searching...")
      callback?.({
        text: result.text,
        actions: ["SEARCH_POLYMARKETS"],
      });
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[SEARCH_POLYMARKETS] Error: ${errorMsg}`);
      const errorResult: ActionResult = {
        text: ` Failed to search markets: ${errorMsg}`,
        success: false,
        error: errorMsg,
      };
      callback?.({
        text: errorResult.text,
        content: { error: "search_failed", details: errorMsg },
      });
      return errorResult;
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "search polymarket for bitcoin predictions" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Searching for Bitcoin-related markets...",
          action: "SEARCH_POLYMARKETS",
          query: "bitcoin",
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "find prediction markets about AI" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Looking for AI prediction markets...",
          action: "SEARCH_POLYMARKETS",
          query: "AI",
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "show me crypto prediction markets" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Finding crypto markets...",
          action: "SEARCH_POLYMARKETS",
          category: "crypto",
        },
      },
    ],
  ],
};

export default searchMarketsAction;
