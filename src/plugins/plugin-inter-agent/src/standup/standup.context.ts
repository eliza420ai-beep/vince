/**
 * Build context for standup kickoff: crypto performance (placeholder or Vince data)
 * and recent code (git log or placeholder).
 */

import { type IAgentRuntime, logger } from "@elizaos/core";
import { execSync } from "node:child_process";

const STANDUP_REPO_ROOT = typeof process !== "undefined" && process.cwd ? process.cwd() : ".";

/** Get recent git commits (oneline) from repo root. Returns placeholder on error. */
export function getRecentCodeContext(maxLines = 20): string {
  try {
    const out = execSync(`git log -n ${maxLines} --oneline`, {
      encoding: "utf-8",
      cwd: STANDUP_REPO_ROOT,
    });
    const lines = (out || "").trim().split("\n").filter(Boolean);
    if (lines.length === 0) return "Recent code: (no commits or not a git repo).";
    return "Recent code (git log --oneline):\n" + lines.join("\n");
  } catch (err) {
    logger.debug({ err }, "[Standup] getRecentCodeContext failed");
    return "Recent code: (unable to read git log; check repo root).";
  }
}

/**
 * Build crypto performance summary for standup.
 * Placeholder for now; can be wired to Vince daily report or a shared provider later.
 */
export async function getCryptoContext(_runtime: IAgentRuntime): Promise<string> {
  return "Crypto: [Vince daily summary to be wired; use VINCE_GM or daily report for now.]";
}

/**
 * Short Kelly-style kickoff for scheduled standup (PRD: coordinator keeps it very short).
 * One line: date + first call. Use in standup task; keep buildStandupKickoffText for manual/long context.
 */
export function buildShortStandupKickoff(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `Standup ${date}. @VINCE, go.`;
}

/**
 * Build full standup kickoff text: date, crypto context, recent code, and instructions.
 */
export async function buildStandupKickoffText(runtime: IAgentRuntime): Promise<string> {
  const date = new Date().toISOString().slice(0, 10);
  const crypto = await getCryptoContext(runtime);
  const code = getRecentCodeContext(15);
  return [
    `Standup ${date}.`,
    "",
    crypto,
    "",
    code,
    "",
    "Discuss: crypto performance from the last day, recent code shipped, and ideas to improve the crypto terminal. Suggest action items and one lesson learned per agent. Keep replies concise.",
  ].join("\n");
}
