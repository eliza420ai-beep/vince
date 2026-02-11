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
  getTokenTrend,
  formatTrend,
  analyzeRisk,
  formatRiskAnalysis,
  getStats,
  formatStats,
  getLeaderboard,
  formatLeaderboard,
} from "../services/analytics.service";

interface AnalyticsActionParams {
  action?: "trend" | "risk" | "stats" | "leaderboard";
  token?: string;
  tokens?: string;
}

export const analyticsAction: Action = {
  name: "VIEW_ANALYTICS",
  similes: [
    "ANALYTICS",
    "STATS",
    "STATISTICS",
    "TREND",
    "TRENDS",
    "RISK",
    "RISK_ANALYSIS",
    "LEADERBOARD",
    "TOP_TOKENS",
    "RANKING",
  ],
  description: `View analytics: sentiment trends, risk analysis, usage stats, and token leaderboard.

Commands:
- trend SOL - View sentiment trend for token
- risk SOL - Get risk analysis
- stats - View usage dashboard
- leaderboard - View top tokens by alpha score

Features:
- Sentiment trends over time
- Risk scoring (1-10)
- Usage statistics
- Token rankings`,

  parameters: {
    action: {
      type: "string",
      description: "Action: trend, risk, stats, leaderboard",
      required: false,
    },
    token: {
      type: "string",
      description: "Token for trend/risk analysis",
      required: false,
    },
    tokens: {
      type: "string",
      description: "Multiple tokens for leaderboard",
      required: false,
    },
  },

  validate: async (): Promise<boolean> => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: AnalyticsActionParams,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams || options || {}) as AnalyticsActionParams;

      const action = params.action || "stats";
      const token = params.token?.toUpperCase();
      let text = "";

      switch (action) {
        case "trend": {
          if (!token) {
            text = `❌ **Specify a token**

Example: \`@VINCE trend SOL\``;
            break;
          }
          
          const trend = getTokenTrend(token);
          if (!trend || trend.dataPoints.length === 0) {
            text = `📈 **No trend data for ${token}**

Trend data is collected during research. Run:
\`@VINCE research ${token}\``;
          } else {
            text = formatTrend(trend);
          }
          break;
        }

        case "risk": {
          if (!token) {
            text = `❌ **Specify a token**

Example: \`@VINCE risk SOL\``;
            break;
          }
          
          const analysis = analyzeRisk(token);
          text = formatRiskAnalysis(analysis);
          break;
        }

        case "leaderboard": {
          const tokensStr = params.tokens || "";
          const tokens = tokensStr
            .toUpperCase()
            .split(/[\s,]+/)
            .filter(t => t.length > 0);
          
          const entries = getLeaderboard(tokens.length > 0 ? tokens : undefined);
          text = formatLeaderboard(entries);
          break;
        }

        case "stats":
        default: {
          const stats = getStats();
          text = formatStats(stats);
          break;
        }
      }

      if (callback) {
        await callback({
          text,
          content: { action, token },
          actions: ["VIEW_ANALYTICS"],
          source: message.content.source,
        });
      }

      return { text, success: true, data: { action, token } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[VIEW_ANALYTICS] Failed: ${msg}`);

      const errorText = `❌ Analytics error: ${msg}`;
      if (callback) {
        await callback({ text: errorText, content: { error: msg } });
      }
      return { text: errorText, success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Show sentiment trend for SOL" } },
      { name: "{{agent}}", content: { text: "📈 **Sentiment Trend: SOL**\n\n**Current:** 7.2/10 📈...", actions: ["VIEW_ANALYTICS"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Analyze risk for ETH" } },
      { name: "{{agent}}", content: { text: "⚠️ **Risk Analysis: ETH**\n\n**Risk Score:** 5/10...", actions: ["VIEW_ANALYTICS"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Show stats" } },
      { name: "{{agent}}", content: { text: "📊 **Stats Dashboard**\n\n**Total queries:** 150...", actions: ["VIEW_ANALYTICS"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Show leaderboard" } },
      { name: "{{agent}}", content: { text: "🏆 **Token Leaderboard**\n\n🥇 **SOL** - Alpha: 9/10...", actions: ["VIEW_ANALYTICS"] } },
    ],
  ],
};
