/**
 * Standup constants: world/room IDs and task config.
 * Uses deterministic IDs so the same standup world/room are reused.
 */

import type { UUID } from "@elizaos/core";
import { createUniqueUuid } from "@elizaos/core";

export const STANDUP_WORLD_SERVER_ID = "standup-world";
export const STANDUP_ROOM_CHANNEL_ID = "standup-room";
export const STANDUP_FACILITATOR_ID_SEED = "standup-facilitator";

export const STANDUP_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12h -> 2x/day
export const TASK_NAME = "AGENT_STANDUP";
export const STANDUP_ACTION_ITEM_TASK_NAME = "STANDUP_ACTION_ITEM";

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
