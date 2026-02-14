/**
 * Build context for standup kickoff: crypto performance (placeholder or Vince data)
 * and recent code (git log or placeholder).
 */

import { type IAgentRuntime, logger } from "@elizaos/core";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getStandupDiscordMentionId, SHARED_INSIGHTS_SENTINEL } from "./standup.constants";

const execAsync = promisify(exec);
const STANDUP_REPO_ROOT = typeof process !== "undefined" && process.cwd ? process.cwd() : ".";
const GIT_TIMEOUT_MS = 5000;

/**
 * Get recent git commits (oneline) from repo root. Returns placeholder on error or timeout.
 * Uses async exec with a 5s timeout; handles non-git repos and empty repos.
 */
export async function getRecentCodeContext(maxLines = 20): Promise<string> {
  try {
    const { stdout } = await execAsync(`git log -n ${maxLines} --oneline`, {
      encoding: "utf-8",
      cwd: STANDUP_REPO_ROOT,
      timeout: GIT_TIMEOUT_MS,
    });
    const lines = (stdout || "").trim().split("\n").filter(Boolean);
    if (lines.length === 0) return "Recent code: (no commits or not a git repo).";
    return "Recent code (git log --oneline):\n" + lines.join("\n");
  } catch (err) {
    logger.debug({ err }, "[Standup] getRecentCodeContext failed");
    return "Recent code: (unable to read git log; check repo root).";
  }
}

/**
 * Build crypto performance summary for standup.
 * Crypto context is supplied by VINCE data in the standup (market snapshot, signals, etc.);
 * this is a sentinel so callers know to use that data rather than a separate summary here.
 */
export async function getCryptoContext(_runtime: IAgentRuntime): Promise<string> {
  return "(Crypto context: see VINCE data in standup.)";
}

/**
 * Short Kelly-style kickoff for scheduled standup (PRD: coordinator keeps it very short).
 * One line: date + first call. Uses Discord mention for VINCE when A2A_STANDUP_DISCORD_MENTION_IDS or VINCE_DISCORD_BOT_USER_ID is set.
 */
export function buildShortStandupKickoff(): string {
  const date = new Date().toISOString().slice(0, 10);
  const vinceMentionId = getStandupDiscordMentionId("vince");
  const call = vinceMentionId ? `<@${vinceMentionId}> go.` : "@VINCE, go.";
  return `Standup ${date}. ${call}`;
}

/**
 * Kickoff when shared daily insights were pre-written. Prepends shared content and sentinel so standup is synthesis-first (link, fact-check, brainstorm).
 */
export function buildKickoffWithSharedInsights(sharedContent: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const vinceMentionId = getStandupDiscordMentionId("vince");
  const call = vinceMentionId ? `<@${vinceMentionId}> go.` : "@VINCE, go.";
  return (
    sharedContent.trim() +
    "\n\n---\n\n" +
    SHARED_INSIGHTS_SENTINEL +
    " Link, fact-check, brainstorm — then we get to the Day Report.\n\nStandup " +
    date +
    ". " +
    call
  );
}

/**
 * Build full standup kickoff text: date, crypto context, recent code, and instructions.
 */
export async function buildStandupKickoffText(runtime: IAgentRuntime): Promise<string> {
  const date = new Date().toISOString().slice(0, 10);
  const crypto = await getCryptoContext(runtime);
  const code = await getRecentCodeContext(15);
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
