/**
 * Solus assignment resolve reminder — Friday post-expiry (after 08:00 UTC).
 * When SOLUS_RESOLVE_REMINDER_ENABLED=true, lists open predictions and nudges user to resolve
 * with "we got assigned on BTC" or "we didn't get assigned on HYPE" so Brier stays populated.
 */

import type { IAgentRuntime, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";
import {
  getOpenPredictions,
  getResolvedCount,
} from "../utils/assignmentPredictionsStore";

const TASK_NAME = "SOLUS_ASSIGNMENT_RESOLVE_REMINDER";
const HOURLY_INTERVAL_MS = 60 * 60 * 1000;
const ZERO_UUID = "00000000-0000-0000-0000-000000000000" as UUID;

const PUSH_SOURCES = ["discord", "slack", "telegram"] as const;

const MIN_RESOLVED_FOR_TRAINING = 50;

function isFridayAndAfter10Utc(): boolean {
  const now = new Date();
  const dow = now.getUTCDay();
  const hour = now.getUTCHours();
  return dow === 5 && hour >= 10;
}

/** Thursday 20:00+ UTC — remind to resolve predictions that expire next day (Friday 08:00 UTC). */
function isThursdayPreExpiry(): boolean {
  const now = new Date();
  const dow = now.getUTCDay();
  const hour = now.getUTCHours();
  return dow === 4 && hour >= 20;
}

async function pushToSolusChannels(
  runtime: IAgentRuntime,
  message: string,
): Promise<number> {
  const nameLower = (s: string) => (s ?? "").toLowerCase();
  const isSolusChannel = (name: string) =>
    nameLower(name).includes("solus") || nameLower(name).includes("ops");

  const targets: Array<{
    source: string;
    roomId?: UUID;
    channelId?: string;
    serverId?: string;
  }> = [];

  try {
    const worlds = await runtime.getAllWorlds();
    for (const world of worlds) {
      const rooms = await runtime.getRooms(world.id);
      for (const room of rooms) {
        const src = nameLower(room.source ?? "");
        if (!PUSH_SOURCES.includes(src as (typeof PUSH_SOURCES)[number]))
          continue;
        if (!room.id) continue;
        if (!isSolusChannel(room.name ?? "")) continue;
        targets.push({
          source: room.source ?? "discord",
          roomId: room.id,
          channelId: room.channelId,
          serverId:
            (room as { messageServerId?: string }).messageServerId ??
            (room as { serverId?: string }).serverId,
        });
      }
    }
    if (worlds.length === 0) {
      const fallbackRooms = await runtime.getRooms(ZERO_UUID);
      for (const room of fallbackRooms) {
        const src = nameLower(room.source ?? "");
        if (!PUSH_SOURCES.includes(src as (typeof PUSH_SOURCES)[number]))
          continue;
        if (!isSolusChannel(room.name ?? "")) continue;
        targets.push({
          source: room.source ?? "discord",
          roomId: room.id,
          channelId: room.channelId,
          serverId:
            (room as { messageServerId?: string }).messageServerId ??
            (room as { serverId?: string }).serverId,
        });
      }
    }
  } catch (err) {
    logger.debug("[SolusResolveReminder] Could not get rooms:", err);
    return 0;
  }

  const isNoSendHandler = (e: unknown): boolean =>
    String(e).includes("No send handler") ||
    String(e).includes("Send handler not found");

  let sent = 0;
  for (const target of targets) {
    try {
      await runtime.sendMessageToTarget(target, { text: message });
      sent++;
    } catch (e) {
      if (!isNoSendHandler(e))
        logger.warn("[SolusResolveReminder] Send failed:", e);
    }
  }
  return sent;
}

export async function registerSolusAssignmentResolveReminderTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.SOLUS_RESOLVE_REMINDER_ENABLED !== "false";
  if (!enabled) {
    logger.debug(
      "[SolusResolveReminder] Task disabled (set SOLUS_RESOLVE_REMINDER_ENABLED=true to enable).",
    );
    return;
  }

  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt: IAgentRuntime) => {
      if (process.env.SOLUS_RESOLVE_REMINDER_ENABLED === "false") return;
      const isFriday = isFridayAndAfter10Utc();
      const isThursday = isThursdayPreExpiry();
      if (!isFriday && !isThursday) return;

      const open = getOpenPredictions();
      if (open.length === 0) return;

      const resolvedCount = getResolvedCount();
      const lines = open.map(
        (r) =>
          `• ${r.asset} $${r.strike.toLocaleString()} (${Math.round(r.predictedAssignProb * 100)}%)`,
      );
      const resolvedLine =
        resolvedCount >= MIN_RESOLVED_FOR_TRAINING
          ? `Resolved: ${resolvedCount}/${MIN_RESOLVED_FOR_TRAINING} (ready for calibration training).`
          : `Resolved: ${resolvedCount}/${MIN_RESOLVED_FOR_TRAINING} for calibration training.`;
      const header = isThursday
        ? "**Solus — predictions expiring tomorrow**"
        : "**Solus — resolve assignment predictions**";
      const message = [
        header,
        "",
        resolvedLine,
        "",
        `You have ${open.length} open prediction(s):`,
        ...lines,
        "",
        isThursday
          ? 'After expiry, resolve with: "we got assigned on BTC" or "we didn\'t get assigned on HYPE" (or the relevant asset).'
          : 'Resolve with: "we got assigned on BTC" or "we didn\'t get assigned on HYPE" (or the relevant asset).',
        "",
        "---",
        '_Say "assignment calibration" for current Brier score._',
      ].join("\n");

      try {
        const sent = await pushToSolusChannels(rt, message);
        if (sent > 0) {
          logger.info(
            `[SolusResolveReminder] Pushed reminder to ${sent} channel(s) (${open.length} open predictions).`,
          );
        } else {
          logger.debug(
            "[SolusResolveReminder] No solus/ops channels found; reminder not sent.",
          );
        }
      } catch (error) {
        logger.error("[SolusResolveReminder] Failed:", error);
      }
    },
  });

  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Friday post-expiry (and Thursday 20:00 UTC pre-expiry): list open assignment predictions, show resolved N/50, remind to resolve (we got assigned / we didn't get assigned). Pushed to solus/ops channels.",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["solus", "ops", "repeat", "weekly", "calibration"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: HOURLY_INTERVAL_MS,
    },
  });

  logger.info(
    "[SolusResolveReminder] Task registered (hourly; runs Friday 10:00+ UTC when open predictions exist).",
  );
}
