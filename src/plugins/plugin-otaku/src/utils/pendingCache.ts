/**
 * Pending operation cache helpers for Otaku confirmation flows.
 * Persists pending state between messages so "type confirm" works end-to-end.
 */

import type { IAgentRuntime, Memory } from "@elizaos/core";

const PREFIX = "otaku:pending";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

function cacheKey(
  action:
    | "swap"
    | "bridge"
    | "morpho"
    | "stopLoss"
    | "approve"
    | "nftMint"
    | "vinceSignal",
  roomId: string,
  entityId: string,
): string {
  return `${PREFIX}:${action}:${roomId}:${entityId}`;
}

export type PendingActionType =
  | "swap"
  | "bridge"
  | "morpho"
  | "stopLoss"
  | "approve"
  | "nftMint"
  | "vinceSignal";

export async function setPending<T>(
  runtime: IAgentRuntime,
  message: Memory,
  action: PendingActionType,
  payload: T,
): Promise<void> {
  const key = cacheKey(action, message.roomId, message.entityId ?? "");
  await runtime.setCache(key, { payload, at: Date.now() });
}

export async function getPending<T>(
  runtime: IAgentRuntime,
  message: Memory,
  action: PendingActionType,
): Promise<T | null> {
  const key = cacheKey(action, message.roomId, message.entityId ?? "");
  const entry = await runtime.getCache<{ payload: T; at: number }>(key);
  if (!entry?.payload) return null;
  if (Date.now() - entry.at > TTL_MS) {
    await runtime.deleteCache(key);
    return null;
  }
  return entry.payload;
}

export async function clearPending(
  runtime: IAgentRuntime,
  message: Memory,
  action: PendingActionType,
): Promise<void> {
  const key = cacheKey(action, message.roomId, message.entityId ?? "");
  await runtime.deleteCache(key);
}

const CONFIRM_PHRASES = [
  "confirm",
  "yes",
  "go ahead",
  "do it",
  "proceed",
  "execute",
  "approved",
];

export function isConfirmation(text: string): boolean {
  const t = text.toLowerCase().trim();
  return CONFIRM_PHRASES.some(
    (p) => t === p || t.startsWith(p + " ") || t.endsWith(" " + p),
  );
}

export async function hasPending(
  runtime: IAgentRuntime,
  message: Memory,
  action: PendingActionType,
): Promise<boolean> {
  const payload = await getPending(runtime, message, action);
  return payload != null;
}
