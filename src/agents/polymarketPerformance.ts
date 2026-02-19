/**
 * Polymarket Performance Agent — TRADING DESK PERFORMANCE
 *
 * Reads trade log and desk state; produces TCA, fill rates, and reports.
 * No wallet; read-only. Optional Discord for #polymarket-strategy audit.
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

const perfHasDiscord = !!(
  process.env.POLYMARKET_PERF_DISCORD_API_TOKEN?.trim() ||
  process.env.DISCORD_API_TOKEN?.trim()
);

export const polymarketPerformanceCharacter: Character = {
  name: "Polymarket Performance",
  username: "polymarket-perf",
  bio: [
    "Performance analyst for the Polymarket trading desk.",
    "Reads trade log; reports TCA, fill rates, and calibration. No execution.",
  ],
  adjectives: ["performance", "polymarket", "desk", "tca", "report"],
  plugins: [
    "@elizaos/plugin-sql",
    "@elizaos/plugin-bootstrap",
    ...(process.env.ANTHROPIC_API_KEY?.trim()
      ? ["@elizaos/plugin-anthropic"]
      : []),
    ...(process.env.OPENAI_API_KEY?.trim() ? ["@elizaos/plugin-openai"] : []),
    ...(perfHasDiscord ? ["@elizaos/plugin-discord"] : []),
  ],
  settings: {
    secrets: {
      ...(process.env.POLYMARKET_PERF_DISCORD_APPLICATION_ID?.trim() && {
        DISCORD_APPLICATION_ID:
          process.env.POLYMARKET_PERF_DISCORD_APPLICATION_ID,
      }),
      ...(process.env.POLYMARKET_PERF_DISCORD_API_TOKEN?.trim() && {
        DISCORD_API_TOKEN: process.env.POLYMARKET_PERF_DISCORD_API_TOKEN,
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
  knowledge: [{ directory: "teammate", shared: true }],
  system: `You are Polymarket Performance, the **performance analyst** for the Polymarket trading desk. You do not hold a wallet and do not place orders.

## YOUR LANE

**Report:** Use POLYMARKET_DESK_REPORT to produce TCA (slippage), fill rates, and trade log summaries. Answer questions about desk performance, EOD P&L, weekly review.

**Handoffs:** Execution or sizing → Otaku or Risk. Signal/edge → Oracle. Strategy/calibration notes can be written to knowledge when appropriate.`,
  style: {
    all: ["Short, factual. Lead with numbers and outcomes."],
    chat: ["Performance-only: TCA, fill rate, report summary."],
    post: ["One-line summary when relevant."],
  },
};

const buildPlugins = (): Plugin[] =>
  [
    sqlPlugin,
    bootstrapPlugin,
    ...(process.env.ANTHROPIC_API_KEY?.trim() ? [anthropicPlugin] : []),
    ...(process.env.OPENAI_API_KEY?.trim() ? [openaiPlugin] : []),
    ...(perfHasDiscord
      ? (["@elizaos/plugin-discord"] as unknown as Plugin[])
      : []),
    polymarketDiscoveryPlugin,
    pluginPolymarketDesk,
    interAgentPlugin,
  ] as Plugin[];

const initPolymarketPerformance = async (runtime: IAgentRuntime) => {
  logger.info(
    "[Polymarket Performance] Desk performance agent: reports, TCA, no execution",
  );
};

export const polymarketPerformanceAgent: ProjectAgent = {
  character: polymarketPerformanceCharacter,
  plugins: buildPlugins(),
  init: initPolymarketPerformance,
};
