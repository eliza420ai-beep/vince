/**
 * VINCE Notification Service
 *
 * Pushes proactive messages to connected channels (Discord, Slack, Telegram).
 * Used for: alerts, paper trade open/close, and other high-signal events.
 *
 * Relies on runtime.sendMessageToTarget() — Discord/Slack/Telegram plugins
 * register send handlers. When those plugins are loaded and channels are
 * connected, pushes are delivered. When not configured, we no-op gracefully.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { UUID } from "@elizaos/core";

const PUSH_SOURCES = ["discord", "slack", "telegram"] as const;
const ZERO_UUID = "00000000-0000-0000-0000-000000000000" as UUID;

export interface PushOptions {
  /** Optional room IDs to target (otherwise uses all push-capable rooms) */
  roomIds?: UUID[];
  /** Filter to specific sources; default: all (discord, slack, telegram) */
  sources?: readonly string[];
  /** Only push to rooms whose name contains this string (case-insensitive). E.g. "daily" for #vince-daily-reports */
  roomNameContains?: string;
}

export class VinceNotificationService extends Service {
  static serviceType = "VINCE_NOTIFICATION_SERVICE";
  capabilityDescription =
    "Pushes proactive messages to Discord, Slack, and Telegram";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceNotificationService> {
    const service = new VinceNotificationService(runtime);
    logger.info(
      "[VinceNotification] ✅ Service started (push to Discord/Slack/Telegram when connected)",
    );
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[VinceNotification] Service stopped");
  }

  /**
   * Push a text message to connected channels.
   * No-op when no Discord/Slack/Telegram rooms exist.
   */
  async push(text: string, options?: PushOptions): Promise<number> {
    if (!text?.trim()) return 0;

    const targets = await this.getPushTargets(options);
    if (targets.length === 0) {
      logger.debug(
        "[VinceNotification] No push targets (Discord/Slack/Telegram rooms) — skipping",
      );
      return 0;
    }

    let sent = 0;
    const failed: string[] = [];
    for (const target of targets) {
      try {
        await this.runtime.sendMessageToTarget(target, { text });
        sent++;
        logger.debug(
          `[VinceNotification] Pushed to ${target.source} room ${target.roomId ?? target.channelId ?? "?"}`,
        );
      } catch (err) {
        failed.push(`${target.source}: ${err}`);
      }
    }

    if (sent > 0) {
      logger.info(
        `[VinceNotification] Pushed to ${sent} channel(s): ${text.slice(0, 60)}…`,
      );
    }
    if (failed.length > 0) {
      logger.warn(
        `[VinceNotification] Failed ${failed.length}/${targets.length}: ${failed.slice(0, 2).join("; ")}${failed.length > 2 ? "…" : ""}`,
      );
    }
    return sent;
  }

  private async getPushTargets(options?: PushOptions): Promise<
    Array<{
      source: string;
      roomId?: UUID;
      channelId?: string;
      serverId?: string;
    }>
  > {
    const sources =
      (options?.sources as readonly string[] | undefined) ?? PUSH_SOURCES;
    const roomIdsFilter = options?.roomIds;
    const nameContains = options?.roomNameContains?.toLowerCase();

    const matchesRoomName = (room: { name?: string }): boolean => {
      if (!nameContains) return true;
      const name = (room.name ?? "").toLowerCase();
      return name.includes(nameContains);
    };

    const targets: Array<{
      source: string;
      roomId?: UUID;
      channelId?: string;
      serverId?: string;
    }> = [];

    try {
      const worlds = await this.runtime.getAllWorlds();

      for (const world of worlds) {
        const rooms = await this.runtime.getRooms(world.id);
        for (const room of rooms) {
          const src = (room.source ?? "").toLowerCase();
          if (!sources.includes(src)) continue;
          if (
            roomIdsFilter?.length &&
            room.id &&
            !roomIdsFilter.includes(room.id)
          )
            continue;
          if (!room.id) continue;
          if (!matchesRoomName(room)) continue;

          targets.push({
            source: room.source,
            roomId: room.id,
            channelId: room.channelId,
            serverId:
              room.messageServerId ?? (room as { serverId?: string }).serverId,
          });
        }
      }

      if (worlds.length === 0) {
        const fallbackRooms = await this.runtime.getRooms(ZERO_UUID);
        for (const room of fallbackRooms) {
          const src = (room.source ?? "").toLowerCase();
          if (!sources.includes(src)) continue;
          if (
            roomIdsFilter?.length &&
            room.id &&
            !roomIdsFilter.includes(room.id)
          )
            continue;
          if (!matchesRoomName(room)) continue;
          targets.push({
            source: room.source,
            roomId: room.id,
            channelId: room.channelId,
            serverId:
              room.messageServerId ?? (room as { serverId?: string }).serverId,
          });
        }
      }
    } catch (err) {
      logger.debug(`[VinceNotification] Could not get rooms: ${err}`);
    }

    return targets;
  }
}
