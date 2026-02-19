/**
 * Otaku completion-event store (database) and socket notify.
 * Used by action handlers to persist "Swap completed", "DCA created", etc.,
 * and by GET /otaku/notifications to return recent events.
 * Events are stored as memories (table notification_events) and can be filtered by userId.
 */

import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { randomUUID } from "node:crypto";

const NOTIFICATION_EVENTS_TABLE = "notification_events";
const MAX_EVENTS = 50;

export type NotificationEventAction =
  | "swap_completed"
  | "dca_created"
  | "bridge_completed"
  | "morpho_deposit"
  | "morpho_withdraw"
  | "stop_loss_created"
  | "nft_minted"
  | "vince_signal_completed";

export interface NotificationEvent {
  id: string;
  action: string;
  title: string;
  subtitle?: string;
  time: number;
  metadata?: Record<string, unknown>;
}

export interface AppendNotificationEventInput {
  action: string;
  title: string;
  subtitle?: string;
  metadata?: Record<string, unknown>;
}

function memoryToEvent(m: Memory): NotificationEvent | null {
  const c = m.content as Record<string, unknown> | undefined;
  if (!c || typeof c.title !== "string" || typeof c.action !== "string")
    return null;
  return {
    id: (c.id as string) ?? m.id,
    action: c.action as string,
    title: c.title as string,
    subtitle: c.subtitle as string | undefined,
    time: typeof c.time === "number" ? c.time : (m.createdAt ?? 0),
    metadata: c.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Append a completion event to the agent's event store (database). Newest first; cap at MAX_EVENTS per agent.
 * After persisting, emits 'notifications:update' via message-bus if available.
 * @param userId - entityId of the user who triggered the action; used for per-user filtering.
 */
export async function appendNotificationEvent(
  runtime: IAgentRuntime,
  input: AppendNotificationEventInput,
  userId?: string,
): Promise<void> {
  const time = Date.now();
  const event: NotificationEvent = {
    id: randomUUID(),
    action: input.action,
    title: input.title,
    subtitle: input.subtitle,
    time,
    metadata: input.metadata,
  };
  const entityId = (userId ?? runtime.agentId) as UUID;
  await runtime.createMemory(
    {
      entityId,
      agentId: runtime.agentId,
      roomId: runtime.agentId,
      content: {
        id: event.id,
        action: event.action,
        title: event.title,
        subtitle: event.subtitle,
        time: event.time,
        metadata: event.metadata,
      },
      createdAt: time,
    },
    NOTIFICATION_EVENTS_TABLE,
  );

  const existing = await runtime.getMemories({
    tableName: NOTIFICATION_EVENTS_TABLE,
    roomId: runtime.agentId,
    count: MAX_EVENTS + 20,
  });
  if (existing.length > MAX_EVENTS) {
    const byAge = [...existing].sort(
      (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
    );
    const toDelete = byAge.slice(0, existing.length - MAX_EVENTS);
    for (const m of toDelete) {
      if (m.id) await runtime.deleteMemory(m.id);
    }
  }

  const messageBus = runtime.getService("message-bus-service") as {
    io?: {
      to: (room: string) => { emit: (ev: string, payload: object) => void };
      emit?: (ev: string, payload: object) => void;
    };
    emit?: (ev: string, payload: object) => void;
  } | null;
  const payload = { agentId: runtime.agentId };
  if (messageBus?.io) {
    const room = `notifications:${runtime.agentId}`;
    messageBus.io.to(room).emit("notifications:update", payload);
    if (typeof messageBus.io.emit === "function") {
      messageBus.io.emit("notifications:update", payload);
    }
  } else if (messageBus?.emit) {
    messageBus.emit("notifications:update", payload);
  }
}

/**
 * Read recent notification events for this agent from the database.
 * @param userId - when provided, return only events attributed to this entityId (per-user filtering).
 */
export async function getNotificationEvents(
  runtime: IAgentRuntime,
  userId?: string,
): Promise<NotificationEvent[]> {
  const memories = await runtime.getMemories({
    tableName: NOTIFICATION_EVENTS_TABLE,
    roomId: runtime.agentId,
    count: MAX_EVENTS + 50,
  });
  let filtered = memories;
  if (userId) {
    filtered = memories.filter((m) => m.entityId === userId);
  }
  const list = filtered
    .map(memoryToEvent)
    .filter(Boolean) as NotificationEvent[];
  list.sort((a, b) => b.time - a.time);
  return list.slice(0, MAX_EVENTS);
}
