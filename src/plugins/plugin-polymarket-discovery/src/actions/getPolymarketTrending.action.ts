/**
 * GET_POLYMARKET_TRENDING Action
 *
 * Top markets by 24h volume with current odds. "What's hot on Polymarket?"
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
import {
  validatePolymarketService,
  getPolymarketService,
  formatCurrency,
} from "../utils/actionHelpers";

type GetPolymarketTrendingInput = { limit?: number };

type GetPolymarketTrendingResult = ActionResult & {
  input: GetPolymarketTrendingInput;
};

export const getPolymarketTrendingAction: Action = {
  name: "GET_POLYMARKET_TRENDING",
  similes: [
    "POLYMARKET_TRENDING",
    "TRENDING_MARKETS",
    "HOT_MARKETS",
    "TOP_VOLUME",
    "WHAT_MOVING",
  ],
  description:
    "Get top Polymarket markets by 24h volume with current YES/NO odds. Answers 'what's trending?', 'hot markets', 'what's moving', 'top volume'.",
  parameters: [
    {
      name: "limit",
      description: "Number of markets to return (default 10, max 20)",
      required: false,
      schema: { type: "number" },
    },
  ],
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    return validatePolymarketService(
      runtime,
      "GET_POLYMARKET_TRENDING",
      state,
      message,
    );
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const limit = Math.min(
      Math.max(1, Number(options?.limit) || 10),
      20,
    ) as number;

    try {
      logger.info(
        `[GET_POLYMARKET_TRENDING] Fetching top ${limit} markets by volume`,
      );

      const service = getPolymarketService(runtime);
      if (!service) {
        const errorMsg = "Polymarket service not available";
        logger.error(`[GET_POLYMARKET_TRENDING] ${errorMsg}`);
        const errorResult: GetPolymarketTrendingResult = {
          text: ` ${errorMsg}`,
          success: false,
          error: "service_unavailable",
          input: { limit },
        };
        callback?.({
          text: errorResult.text,
          content: { error: "service_unavailable", details: errorMsg },
        });
        return errorResult;
      }

      const volumeData = await service.getLiveVolume();
      const markets = volumeData.markets?.slice(0, limit) ?? [];

      const rows: string[] = [];
      const topMarkets: Array<{
        question: string;
        volume: string;
        yes_odds?: string;
        no_odds?: string;
      }> = [];

      for (const m of markets) {
        let yesOdds: string | undefined;
        let noOdds: string | undefined;
        try {
          const prices = await service.getMarketPrices(m.condition_id);
          yesOdds = prices.yes_price_formatted;
          noOdds = prices.no_price_formatted;
        } catch {
          // omit odds if fetch fails
        }

        const volFormatted = formatCurrency(parseFloat(m.volume), 0);
        const oddsStr =
          yesOdds && noOdds ? ` — YES ${yesOdds} / NO ${noOdds}` : "";
        rows.push(
          `${rows.length + 1}. ${m.question ?? "Unknown"} — ${volFormatted}${oddsStr}`,
        );
        topMarkets.push({
          question: m.question ?? "Unknown",
          volume: m.volume,
          yes_odds: yesOdds,
          no_odds: noOdds,
        });
      }

      let text = ` Top Polymarket markets by 24h volume.\n\n`;
      text += rows.join("\n");
      text += `\n\n_Want detail on a specific market? Say which one._`;

      const result: GetPolymarketTrendingResult = {
        text,
        success: true,
        data: {
          total_volume_24h: volumeData.total_volume_24h,
          markets: topMarkets,
          timestamp: volumeData.timestamp ?? Date.now(),
        },
        input: { limit },
      };

      logger.info(
        `[GET_POLYMARKET_TRENDING] Returned ${topMarkets.length} trending markets`,
      );
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[GET_POLYMARKET_TRENDING] Error: ${errorMsg}`);
      const errorResult: GetPolymarketTrendingResult = {
        text: ` Failed to fetch trending markets: ${errorMsg}`,
        success: false,
        error: errorMsg,
        input: { limit },
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
        content: { text: "what's trending on Polymarket?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Fetching top markets by volume...",
          action: "GET_POLYMARKET_TRENDING",
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "show me hot markets" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Getting trending markets...",
          action: "GET_POLYMARKET_TRENDING",
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "what's moving on polymarket?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Fetching top volume markets...",
          action: "GET_POLYMARKET_TRENDING",
        },
      },
    ],
  ],
};

export default getPolymarketTrendingAction;
