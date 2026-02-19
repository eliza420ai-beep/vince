/**
 * X Save Research Action
 *
 * Saves the last pulse/vibe/news output to a file (e.g. skills/x-research/data/drafts/).
 * Trigger: "save that", "save this research", "save to file".
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
} from "@elizaos/core";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getLastResearch } from "../store/lastResearchStore";

function getSaveDir(): string {
  const env = process.env.X_RESEARCH_SAVE_DIR;
  if (env) return env;
  return join(process.cwd(), "skills", "x-research", "data", "drafts");
}

function generateFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `research-${y}-${m}-${d}-${h}${min}.md`;
}

export const xSaveResearchAction: Action = {
  name: "X_SAVE_RESEARCH",
  description:
    'Save the last X research (pulse/vibe/news) to a markdown file. Use when the user says "save that", "save this research", or "save to file".',

  similes: ["SAVE_RESEARCH", "SAVE_TO_FILE", "EXPORT_RESEARCH"],

  examples: [
    [
      { name: "{{user1}}", content: { text: "Save that" } },
      {
        name: "{{agentName}}",
        content: {
          text: "Saved to skills/x-research/data/drafts/research-2025-02-12-1430.md",
          action: "X_SAVE_RESEARCH",
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    const triggers = [
      "save that",
      "save this research",
      "save to file",
      "save research",
      "export that",
    ];
    return triggers.some((t) => text.includes(t));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    const roomId = message.roomId;
    if (!roomId) {
      callback({
        text: 'Couldn\'t determine room; try running a pulse or vibe first, then say "save that".',
        action: "X_SAVE_RESEARCH",
      });
      return { success: true };
    }

    const text = getLastResearch(roomId);
    if (!text) {
      callback({
        text: 'Nothing to save — run an X pulse, vibe, or news first, then say "save that" within a few minutes.',
        action: "X_SAVE_RESEARCH",
      });
      return { success: true };
    }

    try {
      const dir = getSaveDir();
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const filepath = join(dir, generateFilename());
      writeFileSync(filepath, text, "utf-8");
      callback({
        text: `Saved to \`${filepath}\`.`,
        action: "X_SAVE_RESEARCH",
      });
      return { success: true };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      callback({
        text: `Failed to save: ${errMsg}`,
        action: "X_SAVE_RESEARCH",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

export default xSaveResearchAction;
