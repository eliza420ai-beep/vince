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
import { existsSync, readFileSync } from "fs";
import path from "path";

const AGENTS_DIR = path.resolve(process.cwd(), "openclaw-agents");
const ORCHESTRATOR_PATH = path.join(AGENTS_DIR, "orchestrator.js");

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
  description: `Use this action to run OpenClaw research agents for crypto alpha, market data, on-chain analysis, or news.

Agents available:
- alpha: X/Twitter sentiment, KOL tracking, narratives
- market: Prices, volume, funding rates, open interest
- onchain: Whale flows, smart money, DEX liquidity
- news: News aggregation and sentiment
- all: Run all agents in parallel

Prerequisites:
1. npm install -g openclaw
2. openclaw gateway start
3. export X_BEARER_TOKEN="..."

Examples:
- "Research SOL and BTC for alpha"
- "Run market data on ETH"
- "Check whale activity on BONK"`,

  parameters: {
    tokens: {
      type: "string",
      description: "Token symbols to research (e.g., 'SOL BTC ETH' or 'BONK')",
      required: false,
    },
    agent: {
      type: "string",
      description: `Which agent: ${SUPPORTED_AGENTS.join(", ")}. Default: all`,
      required: false,
    },
    query: {
      type: "string",
      description: "Custom query (overrides tokens)",
      required: false,
    },
  },

  validate: async (_runtime: IAgentRuntime, _message: Memory, state?: State): Promise<boolean> => {
    if (!shouldOpenclawPluginBeInContext(state, _message)) {
      return false;
    }
    return existsSync(ORCHESTRATOR_PATH);
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

      if (!SUPPORTED_AGENTS.includes(agent)) {
        throw new Error(`Unknown agent: ${agent}. Supported: ${SUPPORTED_AGENTS.join(", ")}`);
      }

      logger.info(`[RUN_OPENCLAW_RESEARCH] Agent: ${agent}, Tokens: ${tokens}`);

      // For now, provide helpful response about OpenClaw integration
      // Full agent spawning requires OpenClaw SDK which isn't available in npm
      let text = "";

      switch (agent) {
        case "alpha":
          text = `**OpenClaw Alpha Research**

Requested: ${tokens}

To enable alpha research:
1. npm install -g openclaw
2. openclaw gateway start
3. export X_BEARER_TOKEN="..."

Alpha research covers:
- X/Twitter sentiment analysis
- KOL account tracking (@frankdegods, @pentosh1, @cryptokoryo)
- Narrative identification
- Market sentiment indicators

*This feature is coming soon with full OpenClaw SDK integration.*`;
          break;
        case "market":
          text = `**OpenClaw Market Data**

Requested: ${tokens}

Market data research covers:
- Current prices
- Trading volume
- Funding rates
- Open interest
- Market cap and FDV

*Full integration coming soon.*`;
          break;
        case "onchain":
          text = `**OpenClaw On-Chain Research**

Requested: ${tokens}

On-chain research covers:
- Whale wallet flows
- Smart money tracking
- DEX liquidity analysis
- Large transfers

*Full integration coming soon.*`;
          break;
        case "news":
          text = `**OpenClaw News Research**

Requested: ${tokens}

News research covers:
- Crypto news aggregation
- Sentiment analysis
- Breaking news alerts

*Full integration coming soon.*`;
          break;
        case "all":
          text = `**OpenClaw Multi-Agent Research**

Requested: ${tokens}

This would run all agents in parallel:
- Alpha (sentiment, KOL, narratives)
- Market (prices, volume, funding, OI)
- On-chain (whales, smart money, DEX)
- News (aggregation, sentiment)

*Full parallel execution coming soon.*`;
          break;
      }

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
        data: { agent, tokens, status: "placeholder" },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[RUN_OPENCLAW_RESEARCH] Failed: ${msg}`);

      const errorText = `OpenClaw research failed: ${msg}

Setup:
\`\`\`bash
npm install -g openclaw
openclaw gateway start
export X_BEARER_TOKEN="..."
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
          text: "**OpenClaw Alpha Research**...",
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
          text: "**OpenClaw On-Chain Research**...",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
  ],
};
