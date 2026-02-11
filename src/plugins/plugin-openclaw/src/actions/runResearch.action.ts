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
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import path from "path";

const AGENTS_DIR = path.resolve(process.cwd(), "openclaw-agents");
const ORCHESTRATOR_PATH = path.join(AGENTS_DIR, "orchestrator.js");

interface ResearchActionParams {
  tokens?: string;
  agent?: string;
  query?: string;
}

const SUPPORTED_AGENTS = ["alpha", "market", "onchain", "news", "all"];

function runOrchestrator(args: string[]): string {
  if (!existsSync(ORCHESTRATOR_PATH)) {
    throw new Error("OpenClaw orchestrator not found. Run: node openclaw-agents/orchestrator.js");
  }
  try {
    const result = execSync(`node ${ORCHESTRATOR_PATH} ${args.join(" ")}`, {
      encoding: "utf-8",
      timeout: 300000, // 5 min
    });
    return result;
  } catch (e) {
    throw new Error(`Orchestrator failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

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
    // Check if orchestrator exists
    if (!existsSync(ORCHESTRATOR_PATH)) {
      logger.warn("[RUN_OPENCLAW_RESEARCH] OpenClaw orchestrator not found");
      return false;
    }
    return true;
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

      if (!SUPPORTED_AGENTS.includes(agent)) {
        throw new Error(`Unknown agent: ${agent}. Supported: ${SUPPORTED_AGENTS.join(", ")}`);
      }

      logger.info(`[RUN_OPENCLAW_RESEARCH] Running ${agent} agent for: ${tokens}`);

      // Run orchestrator via subprocess
      const args = [agent, ...tokens.split(" ").filter(Boolean)];
      const result = runOrchestrator(args);

      logger.info(`[RUN_OPENCLAW_RESEARCH] Orchestrator completed`);

      // Parse results from briefing file
      const briefingPath = path.join(AGENTS_DIR, "last-briefing.md");
      let briefing = "";
      if (existsSync(briefingPath)) {
        briefing = readFileSync(briefingPath, "utf-8");
      } else {
        briefing = result; // Fallback to stdout
      }

      // Generate a response based on the agent
      let text: string;
      if (agent === "all") {
        text = briefing || formatBriefing({
          alpha: "Research completed",
          market: "Research completed",
          onchain: "Research completed",
        });
      } else {
        text = `**OpenClaw ${agent.toUpperCase()} Research**

${briefing || "Research completed successfully."}

---
*Run with VINCE: @vince ${agent === "all" ? "research" : agent} ${tokens}*`;
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
        data: { agent, tokens },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[RUN_OPENCLAW_RESEARCH] Failed: ${msg}`);

      const errorText = `OpenClaw research failed: ${msg}

Make sure:
1. OpenClaw is installed: \`npm install -g openclaw\`
2. OpenClaw gateway is running: \`openclaw gateway start\`
3. Required API keys are configured (X_BEARER_TOKEN, etc.)

Quick test:
\`\`\`bash
node openclaw-agents/orchestrator.js all SOL
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
          text: "**OpenClaw ALPHA Research**\n\n...",
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
          text: "**OpenClaw MARKET Research**\n\n...",
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
          text: "**OpenClaw ONCHAIN Research**\n\n...",
          actions: ["RUN_OPENCLAW_RESEARCH"],
        },
      },
    ],
  ],
};
