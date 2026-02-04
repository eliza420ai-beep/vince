/**
 * Eliza Agent — 24/7 RESEARCH & KNOWLEDGE EXPANSION
 *
 * Core use case: Eliza works the knowledge folder 24/7 and ingests content
 * you send—especially YouTube. You brainstorm with her; when you find
 * really good content (videos, articles), you suggest it and she ingests it
 * into the right knowledge folder. No need to "chat" for routine research;
 * she's built to expand the corpus and answer from it.
 *
 * - 24/7 research on the knowledge base; brainstorm ideas and frameworks.
 * - YouTube (and articles/PDFs): paste a link → Eliza runs UPLOAD (transcript
 *   + summary) and saves to the right folder. You can suggest content manually
 *   whenever something is worth ingesting.
 * - Same DNA as VINCE: trade well, live well; edge and equilibrium. Execution
 *   and live data → VINCE.
 *
 * See: src/character.ts (full character), knowledge/teammate/SOUL.md
 */

import { type IAgentRuntime, type ProjectAgent, type Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { character } from "../character.ts";
import sqlPlugin from "@elizaos/plugin-sql";
import bootstrapPlugin from "@elizaos/plugin-bootstrap";
import anthropicPlugin from "@elizaos/plugin-anthropic";
import openaiPlugin from "@elizaos/plugin-openai";
import { vincePlugin } from "../plugins/plugin-vince/src/index.ts";

const buildPlugins = (): Plugin[] => [
  sqlPlugin,
  bootstrapPlugin,
  ...(process.env.ANTHROPIC_API_KEY?.trim() ? [anthropicPlugin] : []),
  ...(process.env.OPENAI_API_KEY?.trim() ? [openaiPlugin] : []),
  vincePlugin, // UPLOAD + knowledge actions so Eliza can expand the corpus; execution/live data → VINCE
] as Plugin[];

const initEliza = async (_runtime: IAgentRuntime) => {
  logger.info("[Eliza] ✅ 24/7 research & knowledge expansion ready — YouTube + UPLOAD; execution → VINCE");
};

const elizaAgent: ProjectAgent = {
  character,
  init: initEliza,
  plugins: buildPlugins(),
};

export { elizaAgent };
