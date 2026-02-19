/**
 * SENTINEL_DOC_IMPROVE — Suggest improvements to repo .md and consolidate progress.txt (plugin-vince, plugin-kelly, frontend).
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { NO_AI_SLOP } from "../utils/alohaStyle";

const TRIGGERS = [
  "improve docs",
  "improve documentation",
  "consolidate progress",
  "progress.txt",
  "update docs",
  "update documentation",
  "doc improvements",
  "progress consolidation",
];

function wantsDocImprove(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelDocImproveAction: Action = {
  name: "SENTINEL_DOC_IMPROVE",
  similes: ["DOC_IMPROVE", "CONSOLIDATE_PROGRESS", "PROGRESS_CONSOLIDATION"],
  description:
    "Suggests improvements to repo .md (internal-docs, sentinel-docs, teammate) and consolidation of progress.txt files (plugin-vince, plugin-kelly, frontend). Uses PROGRESS-CONSOLIDATED and knowledge.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsDocImprove(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SENTINEL_DOC_IMPROVE] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const prompt = `You are Sentinel. You use all .md in knowledge (internal-docs, sentinel-docs, teammate) and are responsible for keeping docs improved and consolidating progress. The user asked about improving docs or consolidating progress.

Using the context below (PROGRESS-CONSOLIDATED, sentinel-docs README, internal-docs), write one short paragraph summarizing the main doc improvements and progress consolidation steps (flowing prose). Then add a short numbered list: which file, what to add/change (one line per item). Prefer README, CLAUDE.md, FEATURE-STORE, DEPLOY. Remind to run scripts/sync-sentinel-docs.sh after updating progress.

${NO_AI_SLOP}

Context:\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? String(response));
      const out = "Here's a doc-improvement pass—\n\n" + text.trim();
      await callback({ text: out });
      return { success: true };
    } catch (error) {
      logger.error("[SENTINEL_DOC_IMPROVE] Failed:", error);
      await callback({
        text: "Doc improvements: 1) Run scripts/sync-sentinel-docs.sh to refresh knowledge/sentinel-docs and PROGRESS-CONSOLIDATED. 2) Update README/CLAUDE.md if Sentinel or new actions are missing. 3) Consolidate: keep plugin-vince, plugin-kelly, frontend progress.txt as sources; PROGRESS-CONSOLIDATED is the merged view—sync after edits. Refs: knowledge/sentinel-docs/README.md.",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Improve our docs and consolidate progress." },
      },
      {
        name: "{{agent}}",
        content: {
          text: "1) Run scripts/sync-sentinel-docs.sh to refresh sentinel-docs and PROGRESS-CONSOLIDATED. 2) README: add Sentinel to agents table. 3) internal-docs: link FEATURE-STORE in KNOWLEDGE-QUALITY-GUIDE. 4) Progress: keep three progress.txt; sync consolidated view weekly. Refs: sentinel-docs/README.md.",
        },
      },
    ],
  ],
};
