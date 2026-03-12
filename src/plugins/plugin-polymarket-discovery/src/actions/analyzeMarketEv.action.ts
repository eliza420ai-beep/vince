/**
 * ANALYZE_MARKET_EV Action
 *
 * Given a market and your probability estimate, compute EV, Kelly size,
 * price impact, and bias flags. Mathematical trading advisor.
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
import {
  calculateEV,
  calculateKelly,
  simulateOrderbookImpact,
  parseOrderbookLevels,
  checkImpactEatsEdge,
  getBaseRateWarning,
} from "../utils/lmsr";
import {
  validatePolymarketService,
  getPolymarketService,
  formatCurrency,
  formatPercentage,
} from "../utils/actionHelpers";

const MIN_EDGE_THRESHOLD = 0.03;
const DEFAULT_KELLY_FRACTION = 0.25;
const DEFAULT_BANKROLL = 10000;

/**
 * Extract user's probability estimate from message text.
 * Handles: "60%", "0.6", "60 percent", "I think 55%", "my estimate is 0.55"
 */
function extractYourProb(text: string): number | null {
  const t = (text || "").trim();
  if (!t) return null;

  // Decimal: 0.55, 0.6
  const decimalMatch = t.match(/\b0\.\d+\b/);
  if (decimalMatch) {
    const v = parseFloat(decimalMatch[0]);
    if (v >= 0 && v <= 1) return v;
  }

  // Percentage: 60%, 55 percent, 60 percent chance
  const pctMatch = t.match(
    /(\d{1,3}(?:\.\d+)?)\s*%|(\d{1,3}(?:\.\d+)?)\s*percent/i,
  );
  if (pctMatch) {
    const raw = parseFloat(pctMatch[1] || pctMatch[2] || "0");
    if (raw >= 0 && raw <= 100) return raw / 100;
  }

  return null;
}

export const analyzeMarketEvAction: Action = {
  name: "ANALYZE_MARKET_EV",
  similes: [
    "POLYMARKET_EV",
    "EXPECTED_VALUE",
    "EV_ANALYSIS",
    "KELLY_SIZE",
    "POSITION_SIZE",
    "EDGE_CHECK",
  ],
  description:
    "Analyze a Polymarket market for expected value (EV), Kelly position sizing, price impact, and cognitive bias warnings. Requires market (condition_id or search query) and your probability estimate (e.g. 60% or 0.6). Use when user asks: should I bet, how much should I buy, what's the edge, analyze ev, kelly size, position size.",

  parameters: [
    {
      name: "conditionId",
      description:
        "Market condition ID (hex 0x...) or leave empty to search by query",
      required: false,
      schema: { type: "string" },
    },
    {
      name: "query",
      description:
        "Search query if conditionId not provided (e.g. Fed cut, Bitcoin)",
      required: false,
      schema: { type: "string" },
    },
    {
      name: "yourProb",
      description: "Your probability estimate 0-1 or 0-100 (e.g. 0.6 or 60)",
      required: true,
      schema: { type: "number" },
    },
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    return validatePolymarketService(
      runtime,
      "ANALYZE_MARKET_EV",
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
      logger.info("[ANALYZE_MARKET_EV] Analyzing market EV");

      const text = message?.content?.text ?? "";
      let params = (await runtime.composeState(message, ["ACTION_STATE"], true))
        ?.data?.actionParams as Record<string, unknown> | undefined;

      let conditionId = (params?.conditionId ?? params?.condition_id) as
        | string
        | undefined;
      let query = (params?.query as string | undefined) ?? undefined;
      let yourProb = (params?.yourProb as number | undefined) ?? undefined;

      if (!conditionId && !query) {
        const extracted = await extractPolymarketParams(
          runtime,
          message,
          _state,
          { useLlm: true },
        );
        conditionId = (extracted.conditionId ?? extracted.condition_id)?.trim();
        query = extracted.query?.trim();
      }

      if (!yourProb) {
        yourProb = extractYourProb(text) ?? undefined;
      }
      if (yourProb != null && yourProb > 1) {
        yourProb = yourProb / 100;
      }

      if (!conditionId && !query) {
        const errorMsg =
          "Market identifier required. Provide condition_id or a search query (e.g. Fed cut, Bitcoin).";
        logger.error(`[ANALYZE_MARKET_EV] ${errorMsg}`);
        callback?.({
          text: ` ${errorMsg}`,
          content: { error: "missing_market", details: errorMsg },
        });
        return {
          text: ` ${errorMsg}`,
          success: false,
          error: "missing_market",
        };
      }

      if (yourProb == null || yourProb < 0 || yourProb > 1) {
        const errorMsg =
          "Your probability estimate required. Provide a value like 60% or 0.6.";
        logger.error(`[ANALYZE_MARKET_EV] ${errorMsg}`);
        callback?.({
          text: ` ${errorMsg}`,
          content: { error: "missing_your_prob", details: errorMsg },
        });
        return {
          text: ` ${errorMsg}`,
          success: false,
          error: "missing_your_prob",
        };
      }

      const service = getPolymarketService(runtime);
      if (!service) {
        const errorMsg = "Polymarket service not available";
        callback?.({
          text: ` ${errorMsg}`,
          content: { error: "service_unavailable" },
        });
        return {
          text: ` ${errorMsg}`,
          success: false,
          error: "service_unavailable",
        };
      }

      callback?.({ text: " Fetching market and computing EV..." });

      let marketDetail: Awaited<ReturnType<typeof service.getMarketDetail>>;
      if (conditionId) {
        marketDetail = await service.getMarketDetail(conditionId);
      } else {
        const searchResults = await service.searchMarketsViaGammaSearch(
          query!,
          5,
        );
        if (!searchResults?.length) {
          const errorMsg = `No markets found for "${query}". Try a different search or provide condition_id.`;
          callback?.({
            text: ` ${errorMsg}`,
            content: { error: "no_markets" },
          });
          return { text: ` ${errorMsg}`, success: false, error: "no_markets" };
        }
        const first = searchResults[0];
        conditionId = String(first.condition_id ?? first.conditionId ?? "");
        marketDetail = await service.getMarketDetail(conditionId);
      }

      const prices = await service.getMarketPrices(conditionId);
      const yesPrice = parseFloat(prices.yes_price);
      const noPrice = parseFloat(prices.no_price);
      const marketPrice = yesPrice;

      const ev = calculateEV(marketPrice, yourProb);

      if (Math.abs(ev) < MIN_EDGE_THRESHOLD) {
        const msg = `Edge too small (${formatPercentage(ev, 2)}). No trade recommended.`;
        callback?.({ text: ` ${msg}` });
        return {
          text: ` ${msg}`,
          success: true,
          data: { ev, marketPrice: yesPrice, yourProb, edgeTooSmall: true },
        };
      }

      const buyYes = ev > 0;
      const outcomePrice = buyYes ? yesPrice : noPrice;
      const outcomeProb = buyYes ? yourProb : 1 - yourProb;
      const payoutMultiple = buyYes
        ? 1 / outcomePrice - 1
        : 1 / (1 - outcomePrice) - 1;

      const kellyFull = calculateKelly(outcomeProb, payoutMultiple);
      const kellyFraction =
        Number(runtime.getSetting?.("POLYMARKET_DESK_KELLY_FRACTION") ?? 0) ||
        DEFAULT_KELLY_FRACTION;
      const bankroll =
        Number(runtime.getSetting?.("POLYMARKET_DESK_BANKROLL_USD") ?? 0) ||
        DEFAULT_BANKROLL;
      const kellyApplied = kellyFull * kellyFraction;
      const positionUsd = bankroll * kellyApplied;
      const shares = positionUsd / outcomePrice;

      const yesToken = marketDetail.tokens?.find(
        (t) => t.outcome?.toLowerCase() === "yes",
      );
      const noToken = marketDetail.tokens?.find(
        (t) => t.outcome?.toLowerCase() === "no",
      );
      const tokenId = buyYes ? yesToken?.token_id : noToken?.token_id;

      let impactResult: {
        avgFill: number;
        finalPrice: number;
        totalCost: number;
      } = {
        avgFill: outcomePrice,
        finalPrice: outcomePrice,
        totalCost: positionUsd,
      };
      let impactWarning: string | null = null;
      let reducedPositionUsd = positionUsd;

      if (tokenId) {
        const orderbook = await service.getOrderbook(tokenId);
        const levels = parseOrderbookLevels(
          buyYes ? orderbook.asks : orderbook.asks,
        );
        if (levels.length > 0) {
          impactResult = simulateOrderbookImpact(levels, shares);
          if (checkImpactEatsEdge(ev, impactResult.avgFill, outcomePrice)) {
            reducedPositionUsd = positionUsd / 2;
            impactWarning = `Price impact eats >50% of edge at full size. Halved to ${formatCurrency(reducedPositionUsd)}.`;
          }
        }
      }

      const baseRateWarning = getBaseRateWarning(outcomePrice);

      let out = `**EV Analysis**\n\n`;
      out += `**Market:** ${marketDetail.question ?? "Unknown"}\n\n`;
      out += `**Prices:**\n`;
      out += `   Market YES: ${formatPercentage(yesPrice)} | Your estimate: ${formatPercentage(yourProb)}\n`;
      out += `   Raw edge: ${ev >= 0 ? "+" : ""}${formatPercentage(ev)}\n\n`;

      out += `**Direction:** Buy ${buyYes ? "YES" : "NO"}\n`;
      out += `   Full Kelly: ${formatPercentage(kellyFull)} | Quarter-Kelly: ${formatPercentage(kellyApplied)}\n`;
      out += `   Position size: ${formatCurrency(reducedPositionUsd)} (bankroll $${bankroll})\n\n`;

      if (impactWarning) {
        out += `⚠️ ${impactWarning}\n\n`;
      }
      if (baseRateWarning) {
        out += `⚠️ ${baseRateWarning}\n\n`;
      }

      out += `_Cut losers when the math says edge is gone. Size with Kelly, not ego._`;

      const result: ActionResult = {
        text: out,
        success: true,
        data: {
          condition_id: conditionId,
          market_question: marketDetail.question,
          marketPrice: yesPrice,
          yourProb,
          ev,
          direction: buyYes ? "YES" : "NO",
          kellyFull,
          kellyApplied,
          positionUsd: reducedPositionUsd,
          impactWarning: impactWarning ?? undefined,
          baseRateWarning: baseRateWarning ?? undefined,
        },
      };

      logger.info(
        `[ANALYZE_MARKET_EV] EV=${ev.toFixed(4)} dir=${buyYes ? "YES" : "NO"} size=$${reducedPositionUsd}`,
      );
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[ANALYZE_MARKET_EV] Error: ${errorMsg}`);
      callback?.({
        text: ` Failed to analyze EV: ${errorMsg}`,
        content: { error: "analysis_failed", details: errorMsg },
      });
      return {
        text: ` Failed to analyze EV: ${errorMsg}`,
        success: false,
        error: errorMsg,
      };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: {
          text: "I think there's 60% chance this Fed cut market resolves YES, it's at 40¢ — how much should I put in?",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Running EV analysis...",
          action: "ANALYZE_MARKET_EV",
          yourProb: 0.6,
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "analyze ev for that market, my estimate is 55%" },
      },
      {
        name: "{{agent}}",
        content: {
          text: " Computing expected value and Kelly size...",
          action: "ANALYZE_MARKET_EV",
          yourProb: 0.55,
        },
      },
    ],
  ],
};

export default analyzeMarketEvAction;
