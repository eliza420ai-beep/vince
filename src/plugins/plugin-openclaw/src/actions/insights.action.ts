import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from "@elizaos/core";
import {
  generateInsights,
  formatInsights,
  getMarketOverview,
  formatMarketOverview,
  screenTokens,
  formatScreenerResults,
  getWhaleMovements,
  formatWhaleMovements,
  getNewsDigest,
  formatNewsDigest,
  getFearGreedIndex,
  formatFearGreed,
} from "../services/insights.service";
import { checkRateLimit, getDailyCost, formatCost, calculateCost } from "../services/openclaw.service";

interface InsightsActionParams {
  action?: "insights" | "market" | "screen" | "whales" | "news" | "feargreed";
  token?: string;
  minAlpha?: number;
  maxRisk?: number;
  sentiment?: string;
}

export const insightsAction: Action = {
  name: "VIEW_INSIGHTS",
  similes: [
    "INSIGHTS",
    "AI_INSIGHTS",
    "MARKET",
    "MARKET_OVERVIEW",
    "SCREEN",
    "SCREENER",
    "FILTER",
    "WHALES",
    "WHALE_TRACKER",
    "NEWS",
    "NEWS_DIGEST",
    "FEAR",
    "GREED",
    "FEAR_GREED",
    "SENTIMENT_INDEX",
  ],
  description: `Advanced market insights and analysis tools.

Commands:
- insights SOL - AI trading insights for token
- market - Market overview (cap, volume, gainers/losers)
- screen minAlpha:7 maxRisk:5 - Token screener
- whales - Whale tracker
- whales SOL - Whale movements for token
- news - News digest
- news SOL - News for token
- feargreed - Fear & Greed index`,

  parameters: {
    action: {
      type: "string",
      description: "Action: insights, market, screen, whales, news, feargreed",
      required: false,
    },
    token: {
      type: "string",
      description: "Token for insights/whales/news",
      required: false,
    },
    minAlpha: {
      type: "number",
      description: "Screener: minimum alpha score",
      required: false,
    },
    maxRisk: {
      type: "number",
      description: "Screener: maximum risk score",
      required: false,
    },
    sentiment: {
      type: "string",
      description: "Screener: bullish, bearish, or any",
      required: false,
    },
  },

  validate: async (): Promise<boolean> => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: InsightsActionParams,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams || options || {}) as InsightsActionParams;

      const action = params.action || "market";
      const token = params.token?.toUpperCase();

      // Rate limit
      const userId = message.content?.id || "unknown";
      const rateLimit = checkRateLimit(userId);
      if (!rateLimit.allowed) {
        const text = `⏰ Rate limited. Try again in ${rateLimit.retryAfter}s.`;
        if (callback) await callback({ text, content: { error: "rate_limited" } });
        return { text, success: false, error: "rate_limited" };
      }

      let text = "";
      const cost = calculateCost(500, 200);

      switch (action) {
        case "insights": {
          if (!token) {
            text = `❌ **Specify a token**

Example: \`@VINCE insights SOL\``;
            break;
          }
          const insight = generateInsights(token);
          text = formatInsights(insight);
          break;
        }

        case "market": {
          const overview = getMarketOverview();
          text = formatMarketOverview(overview);
          break;
        }

        case "screen": {
          const criteria = {
            minAlpha: params.minAlpha,
            maxRisk: params.maxRisk,
            sentiment: params.sentiment as any,
          };
          const results = screenTokens(criteria);
          text = formatScreenerResults(results, criteria);
          break;
        }

        case "whales": {
          const movements = getWhaleMovements(token);
          text = formatWhaleMovements(movements);
          if (token) {
            text = text.replace("**Whale Tracker**", `**Whale Tracker: ${token}**`);
          }
          break;
        }

        case "news": {
          const news = getNewsDigest(token);
          text = formatNewsDigest(news);
          if (token) {
            text = text.replace("**News Digest**", `**News Digest: ${token}**`);
          }
          break;
        }

        case "feargreed": {
          const data = getFearGreedIndex();
          text = formatFearGreed(data);
          break;
        }

        default: {
          const overview = getMarketOverview();
          text = formatMarketOverview(overview);
          break;
        }
      }

      // Add footer
      const daily = getDailyCost();
      text += `\n\n💰 ${formatCost(cost)} • ${rateLimit.remaining}/5 req/min`;

      if (callback) {
        await callback({
          text,
          content: { action, token, cost },
          actions: ["VIEW_INSIGHTS"],
          source: message.content.source,
        });
      }

      return { text, success: true, data: { action, token, cost } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[VIEW_INSIGHTS] Failed: ${msg}`);

      const errorText = `❌ Insights error: ${msg}`;
      if (callback) await callback({ text: errorText, content: { error: msg } });
      return { text: errorText, success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Give me AI insights on SOL" } },
      { name: "{{agent}}", content: { text: "🧠 **AI Insights: SOL**\n\n🟢 **Signal:** BULLISH...", actions: ["VIEW_INSIGHTS"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Show market overview" } },
      { name: "{{agent}}", content: { text: "🌍 **Market Overview**\n\n💰 **Market Cap:** $2.1T...", actions: ["VIEW_INSIGHTS"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Screen tokens with alpha above 7" } },
      { name: "{{agent}}", content: { text: "🔍 **Token Screener**\n\n**Results:** 5 tokens...", actions: ["VIEW_INSIGHTS"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Show whale movements" } },
      { name: "{{agent}}", content: { text: "🐋 **Whale Tracker**\n\n🟢 **SOL** BUY...", actions: ["VIEW_INSIGHTS"] } },
    ],
    [
      { name: "{{user}}", content: { text: "What's the fear greed index?" } },
      { name: "{{agent}}", content: { text: "😱 **Fear & Greed Index**\n\n😨 **Current:** 35/100...", actions: ["VIEW_INSIGHTS"] } },
    ],
  ],
};
