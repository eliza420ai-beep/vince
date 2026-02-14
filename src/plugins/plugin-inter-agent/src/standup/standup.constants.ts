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

import type { UUID } from "@elizaos/core";
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

export const TASK_NAME = "AGENT_STANDUP";
export const STANDUP_ACTION_ITEM_TASK_NAME = "STANDUP_ACTION_ITEM";

/** Canonical standup report order (Kelly wraps up; not in list). Used by task round-robin and facilitator. */
export const STANDUP_REPORT_ORDER = [
  "VINCE",
  "Eliza",
  "ECHO",
  "Oracle",
  "Solus",
  "Otaku",
  "Sentinel",
  "Clawterm",
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
 * Essential question we want answered every daily standup (Solus).
 * Level can be overridden via ESSENTIAL_STANDUP_BTC_LEVEL env (e.g. "70000").
 */
export function getEssentialStandupQuestion(): string {
  const level = process.env.ESSENTIAL_STANDUP_BTC_LEVEL?.trim() || "70K";
  return `Based on current market sentiment, do you think BTC will be above $${level} by next Friday?`;
}

/** Default essential question (static fallback). */
export const ESSENTIAL_STANDUP_QUESTION =
  "Based on current market sentiment, do you think BTC will be above $70K by next Friday?";

/** Resolve standup world ID for the coordinator runtime (deterministic). */
export function getStandupWorldId(runtime: { agentId: UUID }): UUID {
  return createUniqueUuid(runtime, STANDUP_WORLD_SERVER_ID) as UUID;
}

/** Resolve standup room ID for the coordinator runtime (deterministic). */
export function getStandupRoomId(runtime: { agentId: UUID }): UUID {
  return createUniqueUuid(runtime, STANDUP_ROOM_CHANNEL_ID) as UUID;
}

/** Resolve facilitator entity ID (who "posts" the kickoff message). */
export function getStandupFacilitatorId(runtime: { agentId: UUID }): UUID {
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
