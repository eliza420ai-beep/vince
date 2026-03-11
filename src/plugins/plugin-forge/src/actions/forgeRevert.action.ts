/**
 * FORGE_REVERT — Revert policies/trading-policy.yaml to the main branch version.
 *
 * Usage: "forge revert", "revert forge", "@Forge revert policy"
 * Safely undoes any uncommitted Forge mutations.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const REPO_ROOT = process.cwd();

const REVERTABLE_FILES = [
  "policies/trading-policy.yaml",
  "prompts/vince-entry-gate.md",
  "prompts/solus-strike-ritual.md",
];

export const forgeRevertAction: Action = {
  name: "FORGE_REVERT",
  similes: [
    "REVERT_FORGE",
    "FORGE_ROLLBACK",
    "ROLLBACK_FORGE",
    "RESET_FORGE",
    "UNDO_FORGE",
  ],
  description:
    "Revert Forge-mutable files (policies/trading-policy.yaml, prompts/) to the current HEAD version. Use after a bad experiment mutation.",

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content.text ?? "").toLowerCase();
    return (
      text.includes("forge") &&
      (text.includes("revert") ||
        text.includes("rollback") ||
        text.includes("reset") ||
        text.includes("undo"))
    );
  },

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback,
  ) => {
    const reverted: string[] = [];
    const failed: string[] = [];

    for (const file of REVERTABLE_FILES) {
      try {
        await execAsync(`git checkout -- ${file}`, {
          cwd: REPO_ROOT,
          timeout: 10_000,
          encoding: "utf-8",
        });
        reverted.push(file);
        logger.debug(`[ForgeRevert] Reverted: ${file}`);
      } catch (err: any) {
        // File may not exist or have no changes — that's fine
        if (!String(err).includes("did not match any file")) {
          failed.push(file);
          logger.warn(`[ForgeRevert] Could not revert ${file}:`, err?.message);
        }
      }
    }

    const text =
      reverted.length > 0
        ? `Reverted to HEAD:\n${reverted.map((f) => `• ${f}`).join("\n")}` +
          (failed.length > 0
            ? `\n\nFailed:\n${failed.map((f) => `• ${f}`).join("\n")}`
            : "")
        : failed.length > 0
          ? `Could not revert: ${failed.join(", ")}`
          : "Nothing to revert — files are already at HEAD.";

    await callback?.({
      thought: "Reverting Forge-mutable files to HEAD.",
      text,
      actions: ["FORGE_REVERT"],
    });
  },

  examples: [
    [
      { name: "user", content: { text: "forge revert" } },
      {
        name: "Forge",
        content: {
          text: "Reverted to HEAD:\n• policies/trading-policy.yaml\n• prompts/vince-entry-gate.md",
          actions: ["FORGE_REVERT"],
        },
      },
    ],
    [
      { name: "user", content: { text: "revert the forge policy changes" } },
      {
        name: "Forge",
        content: {
          text: "Reverted to HEAD:\n• policies/trading-policy.yaml",
          actions: ["FORGE_REVERT"],
        },
      },
    ],
  ],
};
