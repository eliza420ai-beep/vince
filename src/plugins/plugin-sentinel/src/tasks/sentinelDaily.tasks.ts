/**
 * Sentinel daily digest task.
 * Optional: SENTINEL_DAILY_ENABLED=true. Digest: ONNX/feature-store status, openclaw reminder, ART gem, task-brief suggestion for Claude 4.6.
 * Pushes to sentinel/ops channels. Includes optional ONNX nudge (e.g. if 90+ rows suggest run train_models).
 */

import {
  type IAgentRuntime,
  type UUID,
  logger,
  ModelType,
} from "@elizaos/core";

const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;
const ZERO_UUID = "00000000-0000-0000-0000-000000000000" as UUID;

const PUSH_SOURCES = ["discord", "slack", "telegram"] as const;

async function pushToSentinelChannels(
  runtime: IAgentRuntime,
  message: string,
): Promise<number> {
  const nameLower = (s: string) => (s ?? "").toLowerCase();
  const isSentinelChannel = (name: string) =>
    nameLower(name).includes("sentinel") || nameLower(name).includes("ops");

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
        if (!isSentinelChannel(room.name ?? "")) continue;
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
        if (!isSentinelChannel(room.name ?? "")) continue;
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
    logger.debug("[SentinelDaily] Could not get rooms:", err);
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
      if (!isNoSendHandler(e)) logger.warn("[SentinelDaily] Send failed:", e);
    }
  }
  return sent;
}

async function generateDailyDigest(runtime: IAgentRuntime): Promise<string> {
  const state = await runtime.composeState(
    {
      id: "" as UUID,
      content: { text: "Daily digest" },
      roomId: ZERO_UUID,
      entityId: runtime.agentId,
      agentId: runtime.agentId,
      createdAt: Date.now(),
    },
    undefined,
  );
  const contextBlock = typeof state.text === "string" ? state.text : "";
  const prompt = `You are Sentinel. North star: 24/7 coding, ML/ONNX, ART, openclaw, best settings. You use all .md in knowledge and improve docs and consolidate progress. Produce a SHORT daily digest (4 items max, one line each):
1) ONNX/feature-store: one line status (e.g. "N new rows; ready for training" or "Run train_models if 90+ rows" or "Enable Supabase dual-write").
2) openclaw/knowledge research: one reminder or link (e.g. "Spin up openclaw" or "Create #vince-research").
3) ART or docs: one gem from examples/art OR one doc improvement (e.g. "Run sync-sentinel-docs.sh" or "Update PROGRESS-CONSOLIDATED").
4) Claude 4.6: one task-brief suggestion (e.g. "Next: refactor X" or "Add ARCHITECTURE.md").
No intro. Just 4 short lines. Context:\n${contextBlock}`;
  const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
  return typeof response === "string"
    ? response
    : ((response as { text?: string })?.text ?? String(response));
}

export async function registerSentinelDailyTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.SENTINEL_DAILY_ENABLED === "true";
  if (!enabled) {
    logger.debug(
      "[SentinelDaily] Task disabled (set SENTINEL_DAILY_ENABLED=true to enable).",
    );
    return;
  }

  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "SENTINEL_DAILY_DIGEST",
    validate: async () => true,
    execute: async (rt: IAgentRuntime) => {
      if (process.env.SENTINEL_DAILY_ENABLED !== "true") return;
      logger.info("[SentinelDaily] Building digest...");
      try {
        const digest = await generateDailyDigest(rt);
        const message = [
          "**Sentinel — daily digest**",
          "",
          digest.trim(),
          "",
          "---",
          "_Ask me: ONNX status, openclaw guide, best settings, art gems, task brief for Claude 4.6._",
        ].join("\n");
        const sent = await pushToSentinelChannels(rt, message);
        if (sent > 0) {
          logger.info(`[SentinelDaily] Pushed to ${sent} channel(s)`);
        } else {
          logger.debug(
            "[SentinelDaily] No channels matched (sentinel or ops).",
          );
        }
      } catch (error) {
        logger.error("[SentinelDaily] Failed:", error);
      }
    },
  });

  await runtime.createTask({
    name: "SENTINEL_DAILY_DIGEST",
    description:
      "Daily digest: ONNX/feature-store status, openclaw reminder, ART gem, Claude 4.6 task-brief suggestion. Pushed to sentinel/ops channels.",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["sentinel", "ops", "repeat", "daily"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: DAILY_INTERVAL_MS,
    },
  });

  const hourUtc = process.env.SENTINEL_DAILY_HOUR_UTC ?? "8";
  logger.info(
    `[SentinelDaily] Task registered (daily; SENTINEL_DAILY_HOUR_UTC=${hourUtc} for reference).`,
  );
}
