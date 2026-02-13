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
