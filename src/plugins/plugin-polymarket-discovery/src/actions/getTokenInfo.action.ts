/**
 * GET_POLYMARKET_TOKEN_INFO Action
 *
 * One-shot "everything about this market": detail, pricing, 24h summary, optional user position.
 * Reduces round-trips compared to GET_POLYMARKET_DETAIL + GET_POLYMARKET_PRICE + GET_POLYMARKET_PRICE_HISTORY.
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
import { formatCurrency, formatPriceChange } from "../utils/actionHelpers";
import { extractPolymarketParams } from "../utils/llmExtract";
import type { MarketPriceHistory, Position } from "../types";

interface GetTokenInfoParams {
  conditionId?: string;
  condition_id?: string;
  tokenId?: string;
  walletAddress?: string;
}

type GetTokenInfoInput = {
  conditionId?: string;
  walletAddress?: string;
};

type GetTokenInfoActionResult = ActionResult & { input: GetTokenInfoInput };

export const getTokenInfoAction: Action = {
  name: "GET_POLYMARKET_TOKEN_INFO",
  similes: [
    "POLYMARKET_FULL_DETAIL",
    "MARKET_FULL_INFO",
    "EVERYTHING_ABOUT_MARKET",
    "POLYMARKET_MARKET_SUMMARY",
  ],
  description:
    "Get full information about a Polymarket prediction market in one shot: market details, current pricing, 24h price summary, and optionally the user's position in this market when a wallet address is provided. Use condition_id from search or detail results.",

  parameters: {
    conditionId: {
      type: "string",
      description:
        "Market condition ID (hex string, 0x...). Required unless tokenId is provided.",
      required: false,
    },
    tokenId: {
      type: "string",
      description:
        "Token ID for the market (alternative to conditionId; conditionId is preferred).",
      required: false,
    },
    walletAddress: {
      type: "string",
      description:
        "Wallet address to include this market's position and orders (optional).",
      required: false,
    },
  },

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      if (!shouldPolymarketPluginBeInContext(state, message)) return false;
      const service = runtime.getService(
        PolymarketService.serviceType,
      ) as PolymarketService;
      if (!service) {
        logger.warn(
          "[GET_POLYMARKET_TOKEN_INFO] Polymarket service not available",
        );
        return false;
      }
      return true;
    } catch (error) {
      logger.error(
        "[GET_POLYMARKET_TOKEN_INFO] Error validating:",
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
      const composedState = await runtime.composeState(
        message,
        ["ACTION_STATE"],
        true,
      );
      let params = (composedState?.data?.actionParams ??
        {}) as Partial<GetTokenInfoParams>;
      let conditionId = (
        params.conditionId ??
        params.condition_id ??
        params.tokenId
      )?.trim();
      let walletAddress = params.walletAddress?.trim();
      if (
        !conditionId ||
        (params as Record<string, unknown>).walletAddress === undefined
      ) {
        const extracted = await extractPolymarketParams(
          runtime,
          message,
          _state,
          { useLlm: true },
        );
        if (!conditionId)
          conditionId = (
            extracted.conditionId ??
            extracted.condition_id ??
            extracted.tokenId
          )?.trim();
        if (walletAddress === undefined || walletAddress === "")
          walletAddress = extracted.walletAddress?.trim();
      }

      if (!conditionId) {
        const errorMsg = "conditionId or tokenId is required";
        callback?.({ text: ` ${errorMsg}.` });
        return {
          text: ` ${errorMsg}.`,
          success: false,
          error: "missing_condition_id",
        } as ActionResult;
      }

      const service = runtime.getService(
        PolymarketService.serviceType,
      ) as PolymarketService;
      if (!service) {
        callback?.({ text: " Polymarket service not available." });
        return {
          text: " Polymarket service not available.",
          success: false,
          error: "service_unavailable",
        } as ActionResult;
      }

      callback?.({ text: " Fetching full market info and prices..." });

      const [market, prices, priceHistory] = await Promise.all([
        service.getMarketDetail(conditionId),
        service.getMarketPrices(conditionId),
        service
          .getMarketPriceHistory(conditionId, "YES", "1d")
          .catch(() => null as MarketPriceHistory | null),
      ]);

      let positionsForMarket: Position[] = [];
      if (walletAddress) {
        try {
          const allPositions = await service.getUserPositions(walletAddress);
          positionsForMarket = allPositions.filter(
            (p) => p.conditionId === conditionId,
          );
        } catch {
          positionsForMarket = [];
        }
      }

      const roomId = message?.roomId ?? "";
      if (roomId) {
        service.recordActivity(roomId, "market_detail", { conditionId });
      }

      let text = ` **${market.question}**\n\n`;
      text += `**Market**\n`;
      if (market.end_date_iso ?? market.endDateIso) {
        text += `End: ${market.end_date_iso ?? market.endDateIso}\n`;
      }
      if (market.category) text += `Category: ${market.category}\n`;
      if (market.volume) text += `Volume: ${formatCurrency(market.volume)}\n`;
      text += `\n**Current pricing**\n`;
      text += `YES: ${prices.yes_price_formatted} | NO: ${prices.no_price_formatted}\n`;
      text += `Spread: ${prices.spread}\n`;

      if (priceHistory?.data_points?.length) {
        const pts = priceHistory.data_points;
        const startP = pts[0].price;
        const endP = pts[pts.length - 1].price;
        const change = formatPriceChange(startP, endP);
        text += `\n**24h YES** ${change.formatted}\n`;
      }

      if (positionsForMarket.length > 0) {
        text += `\n**Your position(s) in this market**\n`;
        positionsForMarket.forEach((pos, i) => {
          text += `${i + 1}. ${pos.outcome} Size: ${pos.size} Avg: ${(pos.avgPrice * 100).toFixed(1)}%\n`;
        });
      }

      const result: GetTokenInfoActionResult = {
        text,
        success: true,
        data: {
          market: {
            condition_id: market.condition_id ?? market.conditionId,
            question: market.question,
            category: market.category,
            volume: market.volume,
            end_date_iso: market.end_date_iso ?? market.endDateIso,
          },
          prices: {
            yes_price: prices.yes_price,
            no_price: prices.no_price,
            spread: prices.spread,
          },
          price_history_24h: priceHistory
            ? {
                data_points_count: priceHistory.data_points?.length ?? 0,
                start_price: priceHistory.data_points?.[0]?.price,
                end_price:
                  priceHistory.data_points?.[
                    priceHistory.data_points.length - 1
                  ]?.price,
              }
            : null,
          user_positions:
            positionsForMarket.length > 0 ? positionsForMarket : undefined,
        },
        input: { conditionId, walletAddress: walletAddress ?? undefined },
      };
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("[GET_POLYMARKET_TOKEN_INFO] Error: " + errorMsg);
      callback?.({ text: ` Failed to fetch market info: ${errorMsg}` });
      return {
        text: ` Failed to fetch market info: ${errorMsg}`,
        success: false,
        error: errorMsg,
      } as ActionResult;
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "tell me everything about the Bitcoin 100k market" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Fetching full market info...",
          action: "GET_POLYMARKET_TOKEN_INFO",
        },
      },
    ],
  ],
};

export default getTokenInfoAction;
