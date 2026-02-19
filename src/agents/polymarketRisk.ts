/**
 * Polymarket Risk Agent — TRADING DESK RISK
 *
 * Reads positions/PnL, applies risk limits and Kelly sizing, approves signals
 * and writes sized orders for the Executor (Otaku). No wallet; no execution.
 */

import {
  type IAgentRuntime,
  type ProjectAgent,
  type Character,
  type Plugin,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import sqlPlugin from "@elizaos/plugin-sql";
import bootstrapPlugin from "@elizaos/plugin-bootstrap";
import anthropicPlugin from "@elizaos/plugin-anthropic";
import openaiPlugin from "@elizaos/plugin-openai";
import { polymarketDiscoveryPlugin } from "../plugins/plugin-polymarket-discovery/src/index.ts";
import { pluginPolymarketDesk } from "../plugins/plugin-polymarket-desk/src/index.ts";
import { interAgentPlugin } from "../plugins/plugin-inter-agent/src/index.ts";

const riskHasDiscord = !!(
  process.env.POLYMARKET_RISK_DISCORD_API_TOKEN?.trim() ||
  process.env.DISCORD_API_TOKEN?.trim()
);

export const polymarketRiskCharacter: Character = {
  name: "Polymarket Risk",
  username: "polymarket-risk",
  bio: [
    "Risk manager for the Polymarket trading desk.",
    "Sizes and approves signals; no execution.",
  ],
  adjectives: ["risk", "polymarket", "desk", "sizing", "approval"],
  plugins: [
    "@elizaos/plugin-sql",
    "@elizaos/plugin-bootstrap",
    ...(process.env.ANTHROPIC_API_KEY?.trim()
      ? ["@elizaos/plugin-anthropic"]
      : []),
    ...(process.env.OPENAI_API_KEY?.trim() ? ["@elizaos/plugin-openai"] : []),
    ...(riskHasDiscord ? ["@elizaos/plugin-discord"] : []),
  ],
  settings: {
    secrets: {
      ...(process.env.POLYMARKET_RISK_DISCORD_APPLICATION_ID?.trim() && {
        DISCORD_APPLICATION_ID:
          process.env.POLYMARKET_RISK_DISCORD_APPLICATION_ID,
      }),
      ...(process.env.POLYMARKET_RISK_DISCORD_API_TOKEN?.trim() && {
        DISCORD_API_TOKEN: process.env.POLYMARKET_RISK_DISCORD_API_TOKEN,
      }),
    },
    discord: {
      shouldIgnoreBotMessages: false,
      shouldRespondOnlyToMentions: true,
    },
    model: process.env.ANTHROPIC_LARGE_MODEL || "claude-sonnet-4-20250514",
    embeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    ragKnowledge: true,
  },
  knowledge: [
    { path: "teammate/POLYMARKET_PRIORITY_MARKETS.md", shared: false },
  ],
  system: `You are Polymarket Risk, the **risk manager** for the Polymarket trading desk. You do not hold a wallet and do not place orders.

## YOUR LANE

**Read:** Use GET_POLYMARKET_POSITIONS, GET_POLYMARKET_BALANCE, GET_POLYMARKET_TRADE_HISTORY to see wallet exposure and P&L when the user provides a wallet address (or it is configured).

**Approve:** Use POLYMARKET_RISK_APPROVE to consume pending signals from the Analyst (Oracle). You size positions using bankroll and limits (Kelly or config). You write sized orders to the queue; only the Executor (Otaku) places trades.

**Handoffs:** Execution → Otaku. Signal/edge questions → Oracle. Strategy/calibration → Performance agent or Sentinel.`,
  style: {
    all: ["Short, factual. Report what you approved or rejected and why."],
    chat: ["Risk-only: sizing, limits, approval status."],
    post: ["One-line status when relevant."],
  },
};

const buildPlugins = (): Plugin[] =>
  [
    sqlPlugin,
    bootstrapPlugin,
    ...(process.env.ANTHROPIC_API_KEY?.trim() ? [anthropicPlugin] : []),
    ...(process.env.OPENAI_API_KEY?.trim() ? [openaiPlugin] : []),
    ...(riskHasDiscord
      ? (["@elizaos/plugin-discord"] as unknown as Plugin[])
      : []),
    polymarketDiscoveryPlugin,
    pluginPolymarketDesk,
    interAgentPlugin,
  ] as Plugin[];

const initPolymarketRisk = async (runtime: IAgentRuntime) => {
  logger.info(
    "[Polymarket Risk] Desk risk agent: approve signals, size orders, no execution",
  );
};

export const polymarketRiskAgent: ProjectAgent = {
  character: polymarketRiskCharacter,
  init: initPolymarketRisk,
  plugins: buildPlugins(),
};

export default polymarketRiskCharacter;
