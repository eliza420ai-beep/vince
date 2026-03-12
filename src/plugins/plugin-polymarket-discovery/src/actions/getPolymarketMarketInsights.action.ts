/**
 * GET_POLYMARKET_MARKET_INSIGHTS Action
 *
 * One-shot market pulse: consensus by topic, trending markets, total TVL.
 * "What's happening on Polymarket?"
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

type GetPolymarketMarketInsightsInput = Record<string, never>;

type GetPolymarketMarketInsightsResult = ActionResult & {
  input: GetPolymarketMarketInsightsInput;
};

export const getPolymarketMarketInsightsAction: Action = {
  name: "GET_POLYMARKET_MARKET_INSIGHTS",
  similes: [
    "POLYMARKET_MARKET_INSIGHTS",
    "MARKET_PULSE",
    "MARKET_CONSENSUS",
    "POLYMARKET_PULSE",
  ],
  description:
    "Get a market pulse digest: consensus by topic (what the market thinks), top trending markets by volume, and total TVL. Answers 'what's happening on Polymarket?', 'market insights', 'polymarket pulse', 'what does polymarket think'.",
  parameters: [],
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    return validatePolymarketService(
      runtime,
      "GET_POLYMARKET_MARKET_INSIGHTS",
      state,
      message,
    );
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      logger.info(
        "[GET_POLYMARKET_MARKET_INSIGHTS] Fetching market pulse (consensus, trending, TVL)",
      );

      const service = getPolymarketService(runtime);
      if (!service) {
        const errorMsg = "Polymarket service not available";
        logger.error(`[GET_POLYMARKET_MARKET_INSIGHTS] ${errorMsg}`);
        const errorResult: GetPolymarketMarketInsightsResult = {
          text: ` ${errorMsg}`,
          success: false,
          error: "service_unavailable",
          input: {},
        };
        callback?.({
          text: errorResult.text,
          content: { error: "service_unavailable", details: errorMsg },
        });
        return errorResult;
      }

      const [consensus, volumeData, openInterest] = await Promise.all([
        service.getConsensusByTopic(),
        service.getLiveVolume(),
        service.getOpenInterest(),
      ]);

      const parts: string[] = [];

      if (consensus.length > 0) {
        const consensusStr = consensus
          .map(
            (c) =>
              `${c.label} ${(c.avgYesProb * 100).toFixed(0)}% (${c.marketCount} markets)`,
          )
          .join(", ");
        parts.push(`**Consensus:** ${consensusStr}`);
      }

      const top5 = volumeData.markets?.slice(0, 5) ?? [];
      if (top5.length > 0) {
        const trendingStr = top5
          .map((m) => {
            const vol = formatCurrency(parseFloat(m.volume), 0);
            return `${m.question ?? "Unknown"} (${vol})`;
          })
          .join("; ");
        parts.push(`**Trending:** ${trendingStr}`);
      }

      const tvl = parseFloat(openInterest.total_value);
      const tvlStr =
        tvl >= 1_000_000
          ? `$${(tvl / 1_000_000).toFixed(1)}M`
          : formatCurrency(tvl, 1);
      parts.push(`**TVL:** ${tvlStr}`);

      const text = ` Polymarket pulse:\n\n${parts.join("\n\n")}\n\n_Want detail on a market or topic? Say which one._`;

      const result: GetPolymarketMarketInsightsResult = {
        text,
        success: true,
        data: {
          consensus: consensus.map((c) => ({
            topic: c.topic,
            label: c.label,
            avgYesProb: c.avgYesProb,
            marketCount: c.marketCount,
          })),
          trending: top5.map((m) => ({
            condition_id: m.condition_id,
            question: m.question,
            volume: m.volume,
          })),
          total_value: openInterest.total_value,
          timestamp: Date.now(),
        },
        input: {},
      };

      logger.info(
        `[GET_POLYMARKET_MARKET_INSIGHTS] Returned pulse: ${consensus.length} topics, ${top5.length} trending`,
      );
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[GET_POLYMARKET_MARKET_INSIGHTS] Error: ${errorMsg}`);
      const errorResult: GetPolymarketMarketInsightsResult = {
        text: ` Failed to fetch market insights: ${errorMsg}`,
        success: false,
        error: errorMsg,
        input: {},
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
        content: { text: "what's happening on Polymarket?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Fetching market pulse...",
          action: "GET_POLYMARKET_MARKET_INSIGHTS",
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "give me polymarket market insights" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Getting consensus, trending, and TVL...",
          action: "GET_POLYMARKET_MARKET_INSIGHTS",
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "what does polymarket think right now?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Fetching market pulse...",
          action: "GET_POLYMARKET_MARKET_INSIGHTS",
        },
      },
    ],
  ],
};

export default getPolymarketMarketInsightsAction;
