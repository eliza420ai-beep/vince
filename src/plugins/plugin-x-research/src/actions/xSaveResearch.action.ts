/**
 * X Save Research Action
 *
 * Saves the last pulse/vibe/news output to a file (e.g. skills/x-research/data/drafts/).
 * Trigger: "save that", "save this research", "save to file".
 */

import {
  type Action,
  type ActionResult,
  logger,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
} from "@elizaos/core";
import { mkdir, access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getLastResearch } from "../store/lastResearchStore";
import { sendActionResponse } from "./helpers/actionResponse";

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
  const sec = String(now.getSeconds()).padStart(2, "0");
  return `research-${y}-${m}-${d}-${h}${min}${sec}.md`;
}

function looksLowValue(content: string): boolean {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact.length < 40;
}

async function resolveUniquePath(
  dir: string,
  baseName: string,
): Promise<string> {
  const candidate = join(dir, baseName);
  try {
    await access(candidate);
  } catch {
    return candidate;
  }
  const stamp = Date.now().toString().slice(-5);
  return join(dir, baseName.replace(/\.md$/, `-${stamp}.md`));
}

function buildDocumentBody(content: string, roomId: string): string {
  const iso = new Date().toISOString();
  return [
    "---",
    "source: plugin-x-research",
    "action: X_SAVE_RESEARCH",
    `roomId: ${roomId}`,
    `savedAt: ${iso}`,
    "---",
    "",
    content.trim(),
    "",
  ].join("\n");
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
    _options?: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const roomId = message.roomId;
    if (!roomId) {
      await sendActionResponse(callback, "X_SAVE_RESEARCH", {
        text: 'Couldn\'t determine room; try running a pulse or vibe first, then say "save that".',
        reason: "no_room",
      });
      return { success: true };
    }

    const text = getLastResearch(roomId);
    if (!text) {
      await sendActionResponse(callback, "X_SAVE_RESEARCH", {
        text: 'Nothing to save — run an X pulse, vibe, or news first, then say "save that" within a few minutes.',
        reason: "no_recent_data",
      });
      return { success: true };
    }
    if (looksLowValue(text)) {
      await sendActionResponse(callback, "X_SAVE_RESEARCH", {
        text: "Latest research looks too short to save safely (reason: low_value_filtered). Run pulse/vibe/news again and retry.",
        reason: "low_value_filtered",
      });
      return { success: true };
    }

    try {
      const dir = getSaveDir();
      await mkdir(dir, { recursive: true });
      const filepath = await resolveUniquePath(dir, generateFilename());
      const body = buildDocumentBody(text, roomId);
      await writeFile(filepath, body, "utf-8");
      await sendActionResponse(callback, "X_SAVE_RESEARCH", {
        text: `Saved to \`${filepath}\`.`,
        saveMeta: {
          chars: body.length,
          hasMetadataHeader: true,
        },
      });
      return { success: true };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.warn({ err: error }, "[X_SAVE_RESEARCH] write failed");
      await sendActionResponse(callback, "X_SAVE_RESEARCH", {
        text: `Failed to save (reason: write_failed): ${errMsg}`,
        reason: "write_failed",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

export default xSaveResearchAction;
