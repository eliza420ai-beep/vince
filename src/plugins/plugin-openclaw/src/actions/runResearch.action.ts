import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from "@elizaos/core";
import { shouldOpenclawPluginBeInContext } from "../../matcher";
import {
  initCache,
  getCachedResult,
  cacheResult,
  checkRateLimit,
  getDailyCost,
  checkBudget,
  formatCost,
  executeAgentWithStreaming,
  executeAllAgentsWithStreaming,
} from "../services/openclaw.service";

interface ResearchActionParams {
  tokens?: string;
  agent?: string;
  query?: string;
}

const SUPPORTED_AGENTS = ["alpha", "market", "onchain", "news", "all"];

const AGENT_DESCRIPTIONS: Record<string, { icon: string; name: string; features: string[] }> = {
  alpha: {
    icon: "🐦",
    name: "Alpha Research",
    features: ["X/Twitter sentiment", "KOL tracking", "Narrative identification", "Market sentiment"],
  },
  market: {
    icon: "📊",
    name: "Market Data",
    features: ["Current price", "Volume", "Funding rates", "Open interest", "Market cap"],
  },
  onchain: {
    icon: "⛓️",
    name: "On-Chain Analysis",
    features: ["Whale flows", "Smart money", "DEX liquidity", "Large transfers"],
  },
  news: {
    icon: "📰",
    name: "News Research",
    features: ["Breaking news", "Sentiment", "Key developments"],
  },
  all: {
    icon: "🔬",
    name: "Multi-Agent Research",
    features: ["Alpha", "Market", "On-chain", "News"],
  },
};

export const runResearchAction: Action = {
  name: "RUN_OPENCLAW_RESEARCH",
  similes: [
    "OPENCLAW_RESEARCH",
    "RUN_RESEARCH",
    "RESEARCH_TOKENS",
    "ALPHA_RESEARCH",
    "MARKET_RESEARCH",
    "ONCHAIN_RESEARCH",
    "CRYPTO_RESEARCH",
    "SPAWN_AGENT",
  ],
  description: `Delegate crypto research to OpenClaw's isolated sub-agents with real-time streaming, cost tracking, budget alerts, and caching.

Agents:
- alpha: X/Twitter sentiment, KOL tracking
- market: Prices, volume, funding, OI
- onchain: Whale flows, smart money, DEX
- news: News aggregation, sentiment
- all: All agents in parallel

V2 Features:
- Real-time streaming progress updates
- Budget alerts ($5/day warning, $10/day limit)
- 1-hour result caching
- Rate limiting (5 req/min)`,

  parameters: {
    tokens: {
      type: "string",
      description: "Token symbols (e.g., 'SOL BTC ETH')",
      required: false,
    },
    agent: {
      type: "string",
      description: `Which agent: ${SUPPORTED_AGENTS.join(", ")}. Default: all`,
      required: false,
    },
    query: {
      type: "string",
      description: "Custom query",
      required: false,
    },
  },

  validate: async (_runtime: IAgentRuntime, _message: Memory, state?: State): Promise<boolean> => {
    if (!shouldOpenclawPluginBeInContext(state, _message)) {
      return false;
    }
    initCache();
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: ResearchActionParams,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams || options || {}) as ResearchActionParams;

      const agent = (params.agent || "all").toLowerCase();
      const tokens = params.tokens || params.query || "SOL BTC ETH";
      const userId = message.content?.id || "unknown";

      if (!SUPPORTED_AGENTS.includes(agent)) {
        throw new Error(`Unknown agent: ${agent}. Supported: ${SUPPORTED_AGENTS.join(", ")}`);
      }

      // Check rate limit
      const rateLimit = checkRateLimit(userId);
      if (!rateLimit.allowed) {
        const errorText = `⏰ **Rate Limited**\n\nToo many requests. Try again in ${rateLimit.retryAfter}s.\n\nLimit: 5 requests per minute.`;
        if (callback) {
          await callback({ text: errorText, content: { error: "rate_limited", retryAfter: rateLimit.retryAfter } });
        }
        return { text: errorText, success: false, error: "rate_limited", data: { retryAfter: rateLimit.retryAfter } };
      }

      // Check budget
      const budgetAlert = checkBudget(0.01); // Estimated cost
      if (budgetAlert?.type === "limit") {
        const errorText = `🚫 **Budget Limit Reached**\n\n${budgetAlert.message}\n\nDaily spending: $${budgetAlert.current.toFixed(2)} / $${budgetAlert.limit.toFixed(2)}`;
        if (callback) {
          await callback({ text: errorText, content: { error: "budget_limit", alert: budgetAlert } });
        }
        return { text: errorText, success: false, error: "budget_limit", data: { alert: budgetAlert } };
      }

      logger.info(`[RUN_OPENCLAW_RESEARCH] ${agent} for ${tokens} (${rateLimit.remaining} remaining)`);

      // Check cache first
      const cached = getCachedResult(agent, tokens);
      if (cached?.cached) {
        const desc = AGENT_DESCRIPTIONS[agent];
        const text = `${desc.icon} **${desc.name}: ${tokens}** ♻️ *Cached*

${cached.result}

---
♻️ *Cached result* • ${formatCost(cached.cost)} • ${rateLimit.remaining}/5 req/min

📊 **Daily Usage:** ${formatCost(getDailyCost())}`;

        if (callback) {
          await callback({
            text,
            content: { agent, tokens, cached: true, cost: cached.cost },
            actions: ["RUN_OPENCLAW_RESEARCH"],
            source: message.content.source,
          });
        }
        return { text, success: true, data: { agent, tokens, cached: true, cost: cached.cost } };
      }

      // Execute with streaming
      const desc = AGENT_DESCRIPTIONS[agent];
      const streamUpdates: string[] = [];
      
      // Send initial message
      let text = `${desc.icon} **${desc.name}: ${tokens}**

⏳ *Starting research...*`;

      if (budgetAlert?.type === "warning") {
        text += `\n\n${budgetAlert.message}`;
      }

      if (callback) {
        await callback({
          text,
          content: { agent, tokens, streaming: true },
          actions: ["RUN_OPENCLAW_RESEARCH"],
          source: message.content.source,
        });
      }

      // Execute agent(s)
      let result: string;
      let cost: { inputTokens: number; outputTokens: number; estimatedCost: number; timestamp: number };

      if (agent === "all") {
        const { results, totalCost } = await executeAllAgentsWithStreaming(
          tokens,
          (update) => {
            streamUpdates.push(`${update.progress || 0}% - ${update.message}`);
          },
          runtime,
        );
        
        result = `
🐦 **Alpha Research**
${results.alpha || "N/A"}

📊 **Market Data**
${results.market || "N/A"}

⛓️ **On-Chain Analysis**
${results.onchain || "N/A"}

📰 **News Summary**
${results.news || "N/A"}
`;
        cost = totalCost;
      } else {
        const agentResult = await executeAgentWithStreaming(
          agent,
          tokens,
          (update) => {
            streamUpdates.push(`${update.progress || 0}% - ${update.message}`);
          },
          runtime,
        );
        result = agentResult.result;
        cost = agentResult.cost;
      }

      // Cache the result
      cacheResult(agent, tokens, result, cost);

      // Final response
      const daily = getDailyCost();
      const finalText = `${desc.icon} **${desc.name}: ${tokens}** ✅

${result}

---
✅ *Complete* • 💰 ${formatCost(cost)} • ${rateLimit.remaining}/5 req/min

📊 **Daily Usage:** ${formatCost(daily)}${daily.estimatedCost > 5 ? " ⚠️" : ""}`;

      if (callback) {
        await callback({
          text: finalText,
          content: {
            agent,
            tokens,
            cost,
            dailyCost: daily,
            rateLimitRemaining: rateLimit.remaining,
            streamUpdates,
          },
          actions: ["RUN_OPENCLAW_RESEARCH"],
          source: message.content.source,
        });
      }

      return {
        text: finalText,
        success: true,
        data: {
          agent,
          tokens,
          cost,
          dailyCost: daily,
          rateLimitRemaining: rateLimit.remaining,
          streamUpdates,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[RUN_OPENCLAW_RESEARCH] Failed: ${msg}`);

      const errorText = `❌ **Research Failed**

Error: ${msg}

**Setup:**
\`\`\`bash
npm install -g openclaw
openclaw gateway start
\`\`\``;

      if (callback) {
        await callback({ text: errorText, content: { error: msg } });
      }

      return { text: errorText, success: false, error: msg };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Research SOL and BTC" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "🔬 **Multi-Agent Research: SOL and BTC** ✅\n\n🐦 **Alpha Research**\n...\n\n📊 **Daily Usage:** $0.02",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Check alpha on ETH" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "🐦 **Alpha Research: ETH** ✅\n\n**Sentiment:** Bullish...\n\n📊 **Daily Usage:** $0.01",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "What's the whale activity on BONK?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "⛓️ **On-Chain Analysis: BONK** ✅\n\n🐋 **Whale Activity:** Large transfers detected...\n\n📊 **Daily Usage:** $0.01",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
  ],
};
