/**
 * Build context for standup kickoff: crypto performance (placeholder or Vince data)
 * and recent code (git log or placeholder).
 */

import { type IAgentRuntime, logger } from "@elizaos/core";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getStandupDiscordMentionId, SHARED_INSIGHTS_SENTINEL, STANDUP_REPORT_ORDER } from "./standup.constants";
import { AGENT_ROLES } from "./standupReports";
import { formatPredictionScoreboard } from "./predictionTracker";

const execAsync = promisify(exec);
const STANDUP_REPO_ROOT = typeof process !== "undefined" && process.cwd ? process.cwd() : ".";
const GIT_TIMEOUT_MS = 5000;

/** Curated Naval quotes (external advisor / inspiration). Rotates daily by day-of-year. */
const NAVAL_QUOTES = [
  "Find the simplest thing that works.",
  "Work as hard as you can. Even though who you work with and what you work on are more important.",
  "Blame yourself for everything, and preserve your agency.",
  "If you want to learn, do.",
  "Inspiration all the way down.",
  "Find your specific knowledge through action.",
  "When you truly work for yourself, every hour counts.",
  "In most difficult things in life, the solution is indirect.",
  "Life is lived in the arena.",
  "Good products are hard to vary.",
  "Curate people. Your network is your net worth, but not in the way most people think.",
  "Most books should be skimmed, a few should be devoured.",
  "You have to enjoy it a lot. Otherwise, someone who enjoys it more will outperform you.",
  "The best authors respect the reader's time.",
  "It is impossible to fool Mother Nature.",
  "Pause, reflect, see how well it did.",
  "Escape competition through authenticity.",
  "Specific knowledge is found by pursuing your genuine curiosity.",
  "Play long-term games with long-term people.",
  "All the returns in life come from compound interest.",
  "Reading is faster than listening. Doing is faster than watching.",
  "A calm mind, a fit body, a house full of love. These things cannot be bought.",
  "Desire is a contract you make with yourself to be unhappy until you get what you want.",
  "The means of learning are abundant; it is the desire to learn that is scarce.",
  "Code and media are permissionless leverage.",
  "Productize yourself.",
  "If you can't decide, the answer is no.",
  "The people who succeed are irrationally passionate about something.",
  "Earn with your mind, not your time.",
  "Peace is happiness at rest. Happiness is peace in motion.",
];

/** Get today's Naval quote, rotating by day-of-year. */
export function getDailyNavalQuote(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  return NAVAL_QUOTES[dayOfYear % NAVAL_QUOTES.length];
}

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
  const naval = getDailyNavalQuote();
  return `> "${naval}" -- Naval\n\nStandup ${date}. ${call}`;
}

/**
 * Kickoff when shared insights failed — include agent role instructions so agents know what to report.
 * Used as fallback when buildAndSaveSharedDailyInsights fails.
 */
export function buildKickoffWithRoles(): string {
  const date = new Date().toISOString().slice(0, 10);
  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const vinceMentionId = getStandupDiscordMentionId("vince");
  const call = vinceMentionId ? `<@${vinceMentionId}> go.` : "@VINCE, market data — go.";
  const roleLines: string[] = [];
  for (const name of STANDUP_REPORT_ORDER) {
    const role = AGENT_ROLES[name as keyof typeof AGENT_ROLES];
    if (role && !("isStandupFacilitator" in role && role.isStandupFacilitator)) {
      roleLines.push(`- **${name}**: ${role.focus}`);
    }
  }
  const naval = getDailyNavalQuote();
  return `> "${naval}" -- Naval

## Standup ${date} (${day})

BTC · SOL · HYPE · HIP-3 — Numbers only, no fluff.

**Report focus:**
${roleLines.join("\n")}

${call}`;
}

/**
 * Kickoff when shared daily insights were pre-written. Prepends prediction scoreboard and shared content.
 * Synthesis-first: link, fact-check, brainstorm — then Day Report.
 */
export async function buildKickoffWithSharedInsights(sharedContent: string): Promise<string> {
  const date = new Date().toISOString().slice(0, 10);
  const vinceMentionId = getStandupDiscordMentionId("vince");
  const call = vinceMentionId ? `<@${vinceMentionId}> go.` : "@VINCE, go.";
  let scoreboard = "";
  try {
    scoreboard = await formatPredictionScoreboard(10);
  } catch {
    scoreboard = "## Prediction scoreboard\n(Unavailable)";
  }
  const naval = getDailyNavalQuote();
  return (
    `> "${naval}" -- Naval\n\n` +
    scoreboard +
    "\n\n---\n\n" +
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
