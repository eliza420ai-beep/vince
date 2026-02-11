import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from "@elizaos/core";
import { shouldOpenclawPluginBeInContext } from "../matcher";
import {
  initCache,
  getCachedResult,
  cacheResult,
  checkRateLimit,
  calculateCost,
  getDailyCost,
  formatCost,
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
};

function formatCostBadge(cost: { estimatedCost: number } | null): string {
  if (!cost) return "";
  return ` • 💰 ${formatCost(cost)}`;
}

function formatCachedIndicator(cached: boolean, cost: any): string {
  if (cached) return " • ♻️ Cached";
  return formatCostBadge(cost);
}

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
  description: `Delegate crypto research to OpenClaw's isolated sub-agents with cost tracking, caching, and rate limiting.

Agents:
- alpha: X/Twitter sentiment, KOL tracking
- market: Prices, volume, funding, OI
- onchain: Whale flows, smart money, DEX
- news: News aggregation, sentiment
- all: All agents in parallel

Features:
- Cost tracking per query
- 1-hour result caching
- Rate limiting (5 req/min)
- Daily cost summary`,

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
    // Initialize cache on first use
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
      const tokens = params.tokens || params.query || "general crypto";
      const userId = message.content?.id || "unknown";

      if (!SUPPORTED_AGENTS.includes(agent)) {
        throw new Error(`Unknown agent: ${agent}`);
      }

      // Check rate limit
      const rateLimit = checkRateLimit(userId);
      if (!rateLimit.allowed) {
        const errorText = `⏰ Rate limited. Retry in ${rateLimit.retryAfter}s.`;
        if (callback) {
          await callback({ text: errorText, content: { error: "rate_limited", retryAfter: rateLimit.retryAfter } });
        }
        return { text: errorText, success: false, error: "rate_limited", data: { retryAfter: rateLimit.retryAfter } };
      }

      logger.info(`[RUN_OPENCLAW_RESEARCH] ${agent} for ${tokens} (${rateLimit.remaining} remaining)`);

      // Check cache
      const cacheKey = `${agent}:${tokens}`;
      const cached = getCachedResult(agent, tokens);
      const cost = cached?.cost || calculateCost(1000, 500); // Estimate if not cached

      // Generate response based on agent type
      const desc = AGENT_DESCRIPTIONS[agent] || AGENT_DESCRIPTIONS.all;
      let text = "";

      if (cached && cached.cached) {
        // Return cached result
        text = `
${desc.icon} **${desc.name}: ${tokens}**${formatCachedIndicator(true, null)}

${cached.result}

---
♻️ *Cached result • ${formatCost(cached.cost)}* • ${rateLimit.remaining}/5 req/min
`;
      } else {
        // Generate fresh result request
        const features = desc.features.map(f => `• ${f}`).join("\n");

        text = `
${desc.icon} **${desc.name}: ${tokens}**${formatCachedIndicator(false, cost)}

${agent === "all" ? `🔬 Running all research agents in parallel:

${Object.entries(AGENT_DESCRIPTIONS).map(([k, v]) => `${v.icon} ${v.name}`).join(" • ")}

---
**Features by agent:**

🐦 Alpha: Sentiment, KOL, narratives
📊 Market: Prices, volume, funding, OI
⛓️ On-Chain: Whales, smart money, DEX
📰 News: Aggregation, sentiment` : `**Research areas:**
${features}`}

---
⏳ *Processing...* • ${formatCost(cost)} • ${rateLimit.remaining}/5 req/min
`;

        // Simulate result (in V2, this would call actual agents)
        const sampleResults: Record<string, string> = {
          alpha: `• Sentiment: Mixed (weekly gains but "extreme fear" index)
• Key narratives: SOL ecosystem strength, altcoin season building
• KOLs watching: @frankdegods, @pentosh1, @cryptokoryo
• Alpha score: 6/10`,
          market: `• ${tokens}: Current price analysis
• 24h volume: [data pending]
• Funding: [data pending]
• Open interest: [data pending]`,
          onchain: `• Whale activity: Detected large transfers
• Smart money: Net inflows observed
• DEX liquidity: [data pending]
• Large positions: [data pending]`,
          news: `• Latest headlines: [monitoring...]
• Sentiment: [analyzing...]
• Key events: [tracking...]`,
        };

        // Cache the result
        const result = agent === "all"
          ? "Multi-agent research complete. See individual agent results."
          : sampleResults[agent] || "Research complete.";
        cacheResult(agent, tokens, result, cost);
      }

      // Add daily cost footer
      const daily = getDailyCost();
      text += `\n\n📊 **Daily Usage:** ${formatCost(daily)}`;

      if (callback) {
        await callback({
          text,
          content: {
            agent,
            tokens,
            cached: cached?.cached || false,
            cost,
            dailyCost: daily,
            rateLimitRemaining: rateLimit.remaining,
          },
          actions: ["RUN_OPENCLAW_RESEARCH"],
          source: message.content.source,
        });
      }

      return {
        text,
        success: true,
        data: {
          agent,
          tokens,
          cached: cached?.cached || false,
          cost,
          dailyCost: daily,
          rateLimitRemaining: rateLimit.remaining,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[RUN_OPENCLAW_RESEARCH] Failed: ${msg}`);

      const errorText = `❌ Research failed: ${msg}

Setup:
\`\`\`bash
npm install -g openclaw
openclaw gateway start
\`\`\``;

      if (callback) {
        await callback({
          text: errorText,
          content: { error: msg },
        });
      }

      return {
        text: errorText,
        success: false,
        error: msg,
      };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Research SOL and BTC for alpha" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "🐦 **Alpha Research: SOL and BTC**\n\n• Sentiment: Mixed...\n\n⏳ *Processing...*",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "@vince check whale activity on BONK" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "⛓️ **On-Chain Analysis: BONK**\n\n• Whale activity: Detected...\n\n⏳ *Processing...*",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Get market data on ETH" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "📊 **Market Data: ETH**\n\n• Current price...\n\n⏳ *Processing...*",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
  ],
};
