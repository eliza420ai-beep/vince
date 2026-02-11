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
import { sessions_spawn, sessions_history } from "openclaw";
import { readFileSync } from "fs";
import path from "path";

const AGENTS_DIR = path.resolve(process.cwd(), "openclaw-agents");
const DEFAULT_MODEL = "minimax-portal/MiniMax-M2.1";

interface ResearchActionParams {
  tokens?: string;
  agent?: string;
  query?: string;
}

const SUPPORTED_AGENTS = ["alpha-research", "market-data", "onchain", "news", "all"];

const AGENT_SPECS: Record<string, string> = {
  "alpha-research": readFileSync(path.join(AGENTS_DIR, "alpha-research.md"), "utf-8"),
  "market-data": readFileSync(path.join(AGENTS_DIR, "market-data.md"), "utf-8"),
  "onchain": readFileSync(path.join(AGENTS_DIR, "onchain.md"), "utf-8"),
  "news": readFileSync(path.join(AGENTS_DIR, "news.md"), "utf-8"),
};

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
- alpha-research: X/Twitter sentiment, KOL tracking, narratives
- market-data: Prices, volume, funding rates, open interest
- onchain: Whale flows, smart money, DEX liquidity
- news: News aggregation and sentiment
- all: Run all agents in parallel

Examples:
- "Research SOL and BTC for alpha"
- "Run market data on ETH"
- "Check whale activity on BONK"
- "Get news on crypto"`,

  parameters: {
    tokens: {
      type: "string",
      description: "Token symbols to research (e.g., 'SOL BTC ETH' or 'BONK')",
      required: false,
    },
    agent: {
      type: "string",
      description: `Which agent to run: ${SUPPORTED_AGENTS.join(", ")}. Default: all`,
      required: false,
    },
    query: {
      type: "string",
      description: "Custom research query (overrides tokens)",
      required: false,
    },
  },

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    if (!shouldOpenclawPluginBeInContext(state, message)) {
      return false;
    }
    // Check if OpenClaw gateway is available
    try {
      const { execSync } = await import("child_process");
      execSync("openclaw health --timeout 5", { encoding: "utf-8" });
      return true;
    } catch {
      logger.warn("[RUN_OPENCLAW_RESEARCH] OpenClaw gateway not available");
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: ResearchActionParams,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams || options || {}) as ResearchActionParams;

      const agent = (params.agent || "all").toLowerCase();
      const tokens = params.tokens || params.query || "SOL BTC ETH";
      const query = params.query || `Research these tokens: ${tokens}`;

      if (!SUPPORTED_AGENTS.includes(agent)) {
        throw new Error(`Unknown agent: ${agent}. Supported: ${SUPPORTED_AGENTS.join(", ")}`);
      }

      logger.info(`[RUN_OPENCLAW_RESEARCH] Spawning ${agent} agent for: ${tokens}`);

      // Spawn OpenClaw agent
      const result = await sessions_spawn({
        task: `${AGENT_SPECS[agent] || AGENT_SPECS["all"]}

QUERY: ${query}

Provide your findings in a structured briefing.`,
        label: `vince-plugin-${agent}-${Date.now()}`,
        model: DEFAULT_MODEL,
        timeoutSeconds: 150,
      });

      const sessionKey = result.sessionKey;
      logger.info(`[RUN_OPENCLAW_RESEARCH] Agent spawned: ${sessionKey}`);

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 60s

      // Fetch results
      const history = await sessions_history({
        sessionKey,
        includeTools: false,
        limit: 100,
      });

      const messages = history.messages || [];
      const lastMsg = messages[messages.length - 1];
      const content = lastMsg?.content?.text || lastMsg?.content || "No response";

      // Format based on agent count
      let text: string;
      if (agent === "all") {
        // Parse multi-agent results (simplified - actual parsing would be more robust)
        text = formatBriefing({
          alpha: content,
          market: "See full briefing above",
          onchain: "See full briefing above",
        });
      } else {
        text = `**OpenClaw ${agent} Research**

${content}`;
      }

      if (callback) {
        await callback({
          text,
          content: { sessionKey, agent, tokens },
          actions: ["RUN_OPENCLAW_RESEARCH"],
          source: message.content.source,
        });
      }

      return {
        text,
        success: true,
        data: { sessionKey, agent, tokens },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[RUN_OPENCLAW_RESEARCH] Failed: ${msg}`);

      const errorText = `OpenClaw research failed: ${msg}

Make sure:
1. OpenClaw gateway is running (\`openclaw gateway start\`)
2. Required API keys are configured (X_BEARER_TOKEN, etc.)`;

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
          text: "**OpenClaw Alpha Research**\n\n...",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Run market data on ETH and check funding rates" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**OpenClaw Market Data**\n\n...",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "@openclaw research BONK whale activity" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**OpenClaw On-Chain Research**\n\n...",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
  ],
};
