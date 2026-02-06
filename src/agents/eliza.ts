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
 * - UPLOAD: Same pipeline as VINCE. Paste a URL or YouTube link → runs the
 *   summarize CLI (Ikigai Labs fork) → transcript + summary for video, full
 *   content/summary for articles/PDFs → saves to knowledge/<category>/.
 * - Same DNA as VINCE: trade well, live well; edge and equilibrium. Execution
 *   and live data → VINCE.
 *
 * See: src/character.ts (full character), knowledge/teammate/SOUL.md
 */

import {
  type IAgentRuntime,
  type ProjectAgent,
  type Plugin,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { character } from "../character.ts";
import sqlPlugin from "@elizaos/plugin-sql";
import bootstrapPlugin from "@elizaos/plugin-bootstrap";
import anthropicPlugin from "@elizaos/plugin-anthropic";
import openaiPlugin from "@elizaos/plugin-openai";
import openrouterPlugin from "@elizaos/plugin-openrouter";
import webSearchPlugin from "@elizaos/plugin-web-search";
import { vincePlugin } from "../plugins/plugin-vince/src/index.ts";

const buildPlugins = (): Plugin[] =>
  [
    sqlPlugin,
    bootstrapPlugin,
    ...(process.env.ANTHROPIC_API_KEY?.trim() ? [anthropicPlugin] : []),
    ...(process.env.OPENAI_API_KEY?.trim() ? [openaiPlugin] : []),
    ...(process.env.OPENROUTER_API_KEY?.trim() ? [openrouterPlugin] : []),
    ...(process.env.TAVILY_API_KEY?.trim() ? [webSearchPlugin] : []),
    vincePlugin, // UPLOAD + knowledge actions so Eliza can expand the corpus; execution/live data → VINCE
  ] as Plugin[];

const initEliza = async (_runtime: IAgentRuntime) => {
  const webSearch = process.env.TAVILY_API_KEY?.trim()
    ? " web search when corpus is limited;"
    : "";
  logger.info(
    `[Eliza] ✅ 24/7 research & knowledge expansion ready — UPLOAD (same summarize CLI as VINCE);${webSearch} execution → VINCE`,
  );
};

const elizaAgent: ProjectAgent = {
  character,
  init: initEliza,
  plugins: buildPlugins(),
};

export { elizaAgent };
