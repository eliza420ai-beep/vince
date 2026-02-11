import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from "@elizaos/core";
import { compareTokens, formatComparison } from "../services/watchlist.service";
import { checkRateLimit, getDailyCost, formatCost, calculateCost } from "../services/openclaw.service";

interface CompareActionParams {
  tokens?: string;
}

export const compareAction: Action = {
  name: "COMPARE_TOKENS",
  similes: [
    "COMPARE",
    "VERSUS",
    "VS",
    "WHICH_IS_BETTER",
    "HEAD_TO_HEAD",
  ],
  description: `Compare multiple tokens side-by-side for sentiment, alpha score, whale activity, and momentum.

Usage:
- compare SOL ETH
- SOL vs BTC
- which is better SOL or ETH

Returns a comparison table with winner recommendation.`,

  parameters: {
    tokens: {
      type: "string",
      description: "Tokens to compare (e.g., 'SOL ETH BTC')",
      required: true,
    },
  },

  validate: async (): Promise<boolean> => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: CompareActionParams,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams || options || {}) as CompareActionParams;

      const tokensStr = params.tokens || "";
      const tokens = tokensStr
        .toUpperCase()
        .split(/[\s,]+/)
        .filter(t => t.length > 0 && !["VS", "AND", "OR", "VERSUS"].includes(t));

      if (tokens.length < 2) {
        const text = `❌ **Need at least 2 tokens to compare**

Example: \`@VINCE compare SOL ETH BTC\``;
        if (callback) {
          await callback({ text, content: { error: "insufficient_tokens" } });
        }
        return { text, success: false, error: "insufficient_tokens" };
      }

      // Rate limit check
      const userId = message.content?.id || "unknown";
      const rateLimit = checkRateLimit(userId);
      if (!rateLimit.allowed) {
        const text = `⏰ Rate limited. Try again in ${rateLimit.retryAfter}s.`;
        if (callback) {
          await callback({ text, content: { error: "rate_limited" } });
        }
        return { text, success: false, error: "rate_limited" };
      }

      logger.info(`[COMPARE_TOKENS] Comparing: ${tokens.join(" vs ")}`);

      // Perform comparison
      const result = compareTokens(tokens);
      const cost = calculateCost(500 * tokens.length, 200 * tokens.length);

      // Format output
      let text = formatComparison(result);

      // Add cost footer
      const daily = getDailyCost();
      text += `

---
💰 ${formatCost(cost)} • ${rateLimit.remaining}/5 req/min

📊 **Daily Usage:** ${formatCost(daily)}`;

      if (callback) {
        await callback({
          text,
          content: { tokens, result, cost },
          actions: ["COMPARE_TOKENS"],
          source: message.content.source,
        });
      }

      return { text, success: true, data: { tokens, result, cost } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[COMPARE_TOKENS] Failed: ${msg}`);

      const errorText = `❌ Comparison failed: ${msg}`;
      if (callback) {
        await callback({ text: errorText, content: { error: msg } });
      }
      return { text: errorText, success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Compare SOL and ETH" } },
      { name: "{{agent}}", content: { text: "⚖️ **Token Comparison**\n\n| Token | Sentiment |...", actions: ["COMPARE_TOKENS"] } },
    ],
    [
      { name: "{{user}}", content: { text: "SOL vs BTC vs ETH" } },
      { name: "{{agent}}", content: { text: "⚖️ **Token Comparison**\n\n🏆 **Winner:** SOL...", actions: ["COMPARE_TOKENS"] } },
    ],
  ],
};
