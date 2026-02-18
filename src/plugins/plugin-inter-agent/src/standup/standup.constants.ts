/**
 * Standup constants: world/room IDs and task config.
 * Uses deterministic IDs so the same standup world/room are reused.
 *
 * Schedule options:
 * - STANDUP_UTC_HOURS: comma-separated hours (e.g., "9" for 09:00 UTC, "9,21" for twice daily)
 * - STANDUP_INTERVAL_MS: interval between checks (default 1h)
 *
 * Default: 09:00 UTC daily (morning standup)
 */

import type { IAgentRuntime, UUID } from "@elizaos/core";
import { createUniqueUuid } from "@elizaos/core";

export const STANDUP_WORLD_SERVER_ID = "standup-world";
export const STANDUP_ROOM_CHANNEL_ID = "standup-room";
export const STANDUP_FACILITATOR_ID_SEED = "standup-facilitator";

/** Default standup hour: 09:00 UTC */
export const DEFAULT_STANDUP_HOUR_UTC = 9;

/** Check interval: hourly to catch the scheduled time */
export const STANDUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/** 
 * Response delay between agent turns (ms).
 * Helps avoid rate limits by staggering responses.
 * Set via STANDUP_RESPONSE_DELAY_MS env var.
 */
export function getStandupResponseDelay(): number {
  const delay = parseInt(process.env.STANDUP_RESPONSE_DELAY_MS || "2000", 10);
  return isNaN(delay) ? 2000 : delay;
}

/** Session timeout (ms). Env: STANDUP_SESSION_TIMEOUT_MS. Default: 30 min. */
export function getStandupSessionTimeoutMs(): number {
  const v = parseInt(process.env.STANDUP_SESSION_TIMEOUT_MS || String(30 * 60 * 1000), 10);
  return isNaN(v) || v < 60_000 ? 30 * 60 * 1000 : v;
}

/** Inactivity timeout (ms); skip agent if no response. Env: STANDUP_INACTIVITY_TIMEOUT_MS. Default: 5 min. */
export function getStandupInactivityTimeoutMs(): number {
  const v = parseInt(process.env.STANDUP_INACTIVITY_TIMEOUT_MS || String(5 * 60 * 1000), 10);
  return isNaN(v) || v < 10_000 ? 5 * 60 * 1000 : v;
}

/** Skip timeout (ms) for stuck agent; should align with inactivity. Env: STANDUP_SKIP_TIMEOUT_MS. Default: same as inactivity. */
export function getStandupSkipTimeoutMs(): number {
  const v = process.env.STANDUP_SKIP_TIMEOUT_MS?.trim();
  if (v) {
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 0) return n;
  }
  return getStandupInactivityTimeoutMs();
}

/** Tracked assets for cross-agent validation. Env: STANDUP_TRACKED_ASSETS (comma-separated). Default: BTC,SOL,HYPE. */
export function getStandupTrackedAssets(): string[] {
  const raw = process.env.STANDUP_TRACKED_ASSETS?.trim();
  if (!raw) return ["BTC", "SOL", "HYPE"];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Max snippet length for X/tweet context. Env: STANDUP_SNIPPET_LEN. Default: 120. */
export function getStandupSnippetLen(): number {
  const v = parseInt(process.env.STANDUP_SNIPPET_LEN || "120", 10);
  return isNaN(v) || v < 20 ? 120 : v;
}

/** Human display name in standup (prompts, review). Env: STANDUP_HUMAN_NAME. Default: livethelifetv. */
export function getStandupHumanName(): string {
  return process.env.STANDUP_HUMAN_NAME?.trim() || "livethelifetv";
}

/** Discord user ID for the human (for @mention pings). Env: STANDUP_HUMAN_DISCORD_ID. Default: 711974052322869322 (livethelifetv). */
export function getStandupHumanDiscordId(): string {
  return process.env.STANDUP_HUMAN_DISCORD_ID?.trim() || "711974052322869322";
}

/** Agent turn timeout (ms) for round-robin. Env: STANDUP_AGENT_TURN_TIMEOUT_MS. Default: 90s. */
export function getStandupAgentTurnTimeoutMs(): number {
  const v = parseInt(process.env.STANDUP_AGENT_TURN_TIMEOUT_MS || "90000", 10);
  return isNaN(v) || v < 5000 ? 90_000 : v;
}

export const TASK_NAME = "AGENT_STANDUP";
export const STANDUP_ACTION_ITEM_TASK_NAME = "STANDUP_ACTION_ITEM";
export const STANDUP_RALPH_LOOP_TASK_NAME = "STANDUP_RALPH_LOOP";

/** Ralph loop interval (ms). Env: STANDUP_RALPH_INTERVAL_MS. Default: 5 min. */
export function getStandupRalphIntervalMs(): number {
  const v = parseInt(process.env.STANDUP_RALPH_INTERVAL_MS || String(5 * 60 * 1000), 10);
  return Number.isFinite(v) && v >= 60_000 ? v : 5 * 60 * 1000;
}

/**
 * Action item types that require human approval before execution.
 * Env: STANDUP_REQUIRE_APPROVAL_TYPES (comma-separated, e.g. trades,prd).
 * When an item's type is in this set, the Ralph loop writes it to pending-approval and does not execute.
 */
export function getStandupRequireApprovalTypes(): Set<string> {
  const raw = process.env.STANDUP_REQUIRE_APPROVAL_TYPES?.trim();
  if (!raw) return new Set();
  return new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
}

/** Canonical standup report order (Kelly wraps up; not in list). Used by task round-robin and facilitator. Naval last = writes conclusion. */
export const STANDUP_REPORT_ORDER = [
  "VINCE",
  "Eliza",
  "ECHO",
  "Oracle",
  "Solus",
  "Otaku",
  "Sentinel",
  "Clawterm",
  "Naval",
] as const;

/** Get configured standup hours (UTC). Returns array of hours [0-23]. */
export function getStandupHours(): number[] {
  const hoursEnv = process.env.STANDUP_UTC_HOURS?.trim();
  if (!hoursEnv) {
    return [DEFAULT_STANDUP_HOUR_UTC];
  }
  const hours = hoursEnv
    .split(",")
    .map((h) => parseInt(h.trim(), 10))
    .filter((h) => !isNaN(h) && h >= 0 && h <= 23);
  return hours.length > 0 ? hours : [DEFAULT_STANDUP_HOUR_UTC];
}

/** Check if current UTC hour matches any configured standup hour */
export function isStandupTime(): boolean {
  const currentHour = new Date().getUTCHours();
  const scheduledHours = getStandupHours();
  return scheduledHours.includes(currentHour);
}

/**
 * Essential questions we want answered every daily standup.
 * Q1 (Solus): Hypersurface options -- BTC level by Friday.
 * Q2 (VINCE): Paper trading bot perps on Hyperliquid.
 * Level can be overridden via ESSENTIAL_STANDUP_BTC_LEVEL env (e.g. "70000").
 */
export function getEssentialStandupQuestion(): string {
  const level = process.env.ESSENTIAL_STANDUP_BTC_LEVEL?.trim() || "70K";
  return `1. Based on current market sentiment, do you think BTC will be above $${level} by next Friday? (Hypersurface options)\n2. What is the best paper trading bot perps setup on Hyperliquid right now? (direction, entry, stop, size)`;
}

/** Returns essential questions as array for callers that need them separately. */
export function getEssentialStandupQuestions(): string[] {
  const level = process.env.ESSENTIAL_STANDUP_BTC_LEVEL?.trim() || "70K";
  return [
    `Based on current market sentiment, do you think BTC will be above $${level} by next Friday?`,
    `What is the best paper trading bot perps setup on Hyperliquid right now? (direction, entry, stop, size)`,
  ];
}

/** Default essential question (static fallback). */
export const ESSENTIAL_STANDUP_QUESTION =
  "1. Based on current market sentiment, do you think BTC will be above $70K by next Friday? (Hypersurface options)\n2. What is the best paper trading bot perps setup on Hyperliquid right now? (direction, entry, stop, size)";

/** Resolve standup world ID for the coordinator runtime (deterministic). */
export function getStandupWorldId(runtime: IAgentRuntime): UUID {
  return createUniqueUuid(runtime, STANDUP_WORLD_SERVER_ID) as UUID;
}

/** Resolve standup room ID for the coordinator runtime (deterministic). */
export function getStandupRoomId(runtime: IAgentRuntime): UUID {
  return createUniqueUuid(runtime, STANDUP_ROOM_CHANNEL_ID) as UUID;
}

/** Resolve facilitator entity ID (who "posts" the kickoff message). */
export function getStandupFacilitatorId(runtime: IAgentRuntime): UUID {
  return createUniqueUuid(runtime, STANDUP_FACILITATOR_ID_SEED) as UUID;
}

export function isStandupCoordinator(runtime: { character?: { name?: string } }): boolean {
  const enabled = process.env.STANDUP_ENABLED === "true";
  const coordinatorName = (process.env.STANDUP_COORDINATOR_AGENT ?? "Kelly").trim();
  const name = runtime.character?.name?.trim();
  return enabled && !!name && name === coordinatorName;
}

/** Optional: Discord bot user IDs for standup turn-taking. When set, progression message uses <@ID> so only that bot is notified. */
let _mentionIdsMap: Map<string, string> | null = null;

function parseStandupDiscordMentionIds(): Map<string, string> {
  if (_mentionIdsMap !== null) return _mentionIdsMap;
  const map = new Map<string, string>();
  const raw = process.env.A2A_STANDUP_DISCORD_MENTION_IDS?.trim();
  if (raw) {
    try {
      if (raw.startsWith("{")) {
        const obj = JSON.parse(raw) as Record<string, string>;
        for (const [name, id] of Object.entries(obj)) {
          if (id?.trim()) map.set(name.toLowerCase(), id.trim());
        }
      } else {
        for (const part of raw.split(",")) {
          const [name, id] = part.split(":").map((s) => s?.trim());
          if (name && id) map.set(name.toLowerCase(), id);
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  _mentionIdsMap = map;
  return map;
}

/**
 * Get Discord bot user ID for an agent (lowercase id e.g. "vince", "clawterm").
 * Checks A2A_STANDUP_DISCORD_MENTION_IDS first, then per-agent env e.g. VINCE_DISCORD_BOT_USER_ID, CLAWTERM_DISCORD_BOT_USER_ID.
 */
export function getStandupDiscordMentionId(agentId: string): string | null {
  const key = agentId.toLowerCase();
  const fromMap = parseStandupDiscordMentionIds().get(key);
  if (fromMap) return fromMap;
  const envKey = `${agentId.toUpperCase()}_DISCORD_BOT_USER_ID`;
  const fromEnv = process.env[envKey]?.trim();
  return fromEnv || null;
}

/** Sentinel line in kickoff when shared daily insights are present. a2aContext uses this to switch to synthesis turn. */
export const SHARED_INSIGHTS_SENTINEL = "*Above: shared daily insights*";

/**
 * Phrases that indicate the user wants to start/kick off a standup.
 * Used by STANDUP_FACILITATE action and A2A context so Kelly runs standup instead of a lifestyle reply.
 * Only multi-word phrases — bare "standup" / "stand up" removed because they match agent status messages like "standup already complete".
 */
export const STANDUP_KICKOFF_PHRASES = [
  "start standup",
  "kick off standup",
  "begin standup",
  "daily standup",
  "daily stand up",
  "morning standup",
  "let's do standup",
  "let's do a standup",
  "let's do a new standup",
  "let's do a stand up",
  "do a standup",
  "do a stand up",
  "do the standup",
  "run standup",
  "run the standup",
  "team standup",
  "standup time",
  "facilitate standup",
  "new standup",
] as const;

/** Words near "standup" that indicate a status report, not a kickoff request. */
const STANDUP_NEGATIVE_WORDS = ["already", "complete", "done", "finished", "locked", "delivered"];

/**
 * Returns true if the message is asking to start/kick off a standup.
 * Normalizes text (collapse spaces, "stand up" -> "standup") so "let's do a daily stand up kelly" matches.
 * Returns false for status messages like "standup already complete" or "standup done".
 */
export function isStandupKickoffRequest(text: string): boolean {
  if (!text?.trim()) return false;
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\bstand up\b/g, "standup");
  // Reject status messages: "standup already complete", "standup done", etc.
  if (STANDUP_NEGATIVE_WORDS.some((w) => normalized.includes(w) && normalized.includes("standup"))) {
    return false;
  }
  return STANDUP_KICKOFF_PHRASES.some((phrase) => {
    const phraseNorm = phrase.replace(/\s+/g, " ").replace(/\bstand up\b/g, "standup");
    return normalized.includes(phraseNorm);
  });
}
