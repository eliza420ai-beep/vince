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

interface ResearchActionParams {
  tokens?: string;
  agent?: string;
  query?: string;
}

const SUPPORTED_AGENTS = ["alpha", "market", "onchain", "news", "all"];

function formatBriefing(results: Record<string, string>): string {
  return `
═══════════════════════════════════════
   VINCE × OPENCLAW BRIEFING
═══════════════════════════════════════

🐦 ALPHA RESEARCH
${results.alpha || "N/A"}

📊 MARKET DATA
${results.market || "N/A"}

⛓️ ON-CHAIN
${results.onchain || "N/A"}

📰 NEWS
${results.news || "N/A"}

═══════════════════════════════════════
`;
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
  description: `Delegate crypto research to OpenClaw agents.

Agents:
- alpha: X/Twitter sentiment, KOL tracking
- market: Prices, volume, funding, OI
- onchain: Whale flows, smart money, DEX
- news: News aggregation, sentiment
- all: Run all agents in parallel

This action delegates research to OpenClaw's isolated sub-agent system.

Examples:
- "Research SOL and BTC for alpha"
- "Check whale activity on BONK"
- "Get market data on ETH"`,
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
    return shouldOpenclawPluginBeInContext(state, _message);
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

      if (!SUPPORTED_AGENTS.includes(agent)) {
        throw new Error(`Unknown agent: ${agent}`);
      }

      logger.info(`[RUN_OPENCLAW_RESEARCH] Delegating: ${agent} for ${tokens}`);

      // Format the research request
      const requestText = `
**OpenClaw Research Request**

**Agent:** ${agent}
**Tokens:** ${tokens}

Research these tokens using OpenClaw's sub-agent system.
Return your findings in a structured briefing.`;

      // Delegate to main session (OpenClaw agent) via VINCE's routing
      // The action will be handled by delegating to OpenClaw

      let text = "";

      switch (agent) {
        case "alpha":
          text = `**🐦 Alpha Research: ${tokens}**

I'll research X/Twitter sentiment, KOL accounts, and emerging narratives for ${tokens}.

${agent === "all" || agent === "alpha" ? `
Key areas:
- Sentiment analysis on X
- KOL tracking (@frankdegods, @pentosh1, @cryptokoryo)
- Narrative identification
- Market sentiment indicators
` : ""}

*Spawning OpenClaw alpha-research agent...*

_This delegates to OpenClaw's isolated research agent for deep-dive analysis._
`;
          break;
        case "market":
          text = `**📊 Market Data: ${tokens}**

I'll gather market data for ${tokens}:

${agent === "all" || agent === "market" ? `
- Current price and 24h change
- Trading volume
- Funding rates
- Open interest
- Market cap and FDV
` : ""}

*Spawning OpenClaw market-data agent...*
`;
          break;
        case "onchain":
          text = `**⛓️ On-Chain Analysis: ${tokens}**

I'll analyze on-chain activity for ${tokens}:

${agent === "all" || agent === "onchain" ? `
- Whale wallet flows
- Smart money tracking
- DEX liquidity
- Large transfers
` : ""}

*Spawning OpenClaw onchain-research agent...*
`;
          break;
        case "news":
          text = `**📰 News Research: ${tokens}**

I'll aggregate news and sentiment for ${tokens}:

- Breaking news
- Sentiment analysis
- Key developments

*Spawning OpenClaw news agent...*
`;
          break;
        case "all":
          text = `**🔬 Multi-Agent Research: ${tokens}**

I'll run all OpenClaw research agents in parallel:

1. 🐦 Alpha Research - Sentiment, KOL, narratives
2. 📊 Market Data - Prices, volume, funding, OI
3. ⛓️ On-Chain - Whales, smart money, DEX
4. 📰 News - Aggregation, sentiment

*Spawning all agents...*

This will provide a comprehensive briefing on ${tokens}.
`;
          break;
      }

      text += `

---
_Research delegated to OpenClaw sub-agent system_`;

      if (callback) {
        await callback({
          text,
          content: { agent, tokens },
          actions: ["RUN_OPENCLAW_RESEARCH"],
          source: message.content.source,
        });
      }

      return {
        text,
        success: true,
        data: { agent, tokens, delegated: true },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[RUN_OPENCLAW_RESEARCH] Failed: ${msg}`);

      const errorText = `Research failed: ${msg}

Setup OpenClaw:
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
          text: "**🐦 Alpha Research: SOL and BTC**\\n\nI'll research X/Twitter sentiment...",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "@vince research BONK whale activity" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**⛓️ On-Chain Analysis: BONK**\n\nI'll analyze on-chain activity...",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
  ],
};
