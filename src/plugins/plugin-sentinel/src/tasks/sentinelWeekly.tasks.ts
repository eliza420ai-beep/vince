/**
 * Sentinel weekly suggestions task.
 * Runs on an interval (default 7 days); composes state, generates suggestions and investor update, optionally pushes to Discord channels named "sentinel" or "ops".
 */

import {
  type IAgentRuntime,
  type Memory,
  type UUID,
  logger,
  ModelType,
} from "@elizaos/core";
import { generateInvestorBlock } from "../actions/sentinelInvestorReport.action";

const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const ZERO_UUID = "00000000-0000-0000-0000-000000000000" as UUID;

function syntheticMessage(text: string, runtime: IAgentRuntime): Memory {
  return {
    id: "" as UUID,
    content: { text },
    roomId: ZERO_UUID,
    entityId: runtime.agentId,
    agentId: runtime.agentId,
    createdAt: Date.now(),
  };
}

async function generateWeeklySuggestions(runtime: IAgentRuntime): Promise<string> {
  const state = await runtime.composeState(
    syntheticMessage("Weekly suggestions", runtime),
    undefined,
  );
  const contextBlock = typeof state.text === "string" ? state.text : "";
  const prompt = `You are Sentinel. North star: 24/7 coding, self-improving, ML/ONNX obsessed, ART, openclaw, best settings. You use all .md in knowledge and are responsible for doc improvements and consolidating progress. Using the context below, produce a short prioritized list of improvement suggestions. Categories: **24/7 market research (top priority):** Vince push, X research, signals, knowledge pipeline—ensure this is running and improving before other work; architecture/ops, ONNX/feature-store health (run train_models if 90+ rows), openclaw spin-up, ART gems from elizaOS examples (especially art), best-settings nudge, benchmarks alignment (use ELIZAOS_BENCHMARKS in sentinel-docs for run commands: context_bench, agentbench, solana, gauntlet), relevant plugins (openclaw-adapter—OPENCLAW_ADAPTER; plugin-elevenlabs—PLUGIN_ELEVENLABS; plugin-mcp—PLUGIN_MCP; plugin-xai for Grok/xAI—PLUGIN_XAI; we underuse Grok), tech debt, doc improvements (outdated sections, missing refs), progress consolidation (PROGRESS-CONSOLIDATED, run sync-sentinel-docs.sh). Number each item; one line per item with a short ref. No intro—just the numbered list.\n\nContext:\n${contextBlock}`;
  const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
  return typeof response === "string"
    ? response
    : (response as { text?: string })?.text ?? String(response);
}

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
    logger.debug("[SentinelWeekly] Could not get rooms:", err);
    return 0;
  }

  const isNoSendHandler = (e: unknown): boolean =>
    String(e).includes("No send handler") || String(e).includes("Send handler not found");

  let sent = 0;
  for (const target of targets) {
    try {
      await runtime.sendMessageToTarget(target, { text: message });
      sent++;
    } catch (e) {
      if (!isNoSendHandler(e)) logger.warn("[SentinelWeekly] Send failed:", e);
    }
  }
  return sent;
}

export async function registerSentinelWeeklyTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.SENTINEL_WEEKLY_ENABLED !== "false";
  if (!enabled) {
    logger.debug(
      "[SentinelWeekly] Task disabled (SENTINEL_WEEKLY_ENABLED=false)",
    );
    return;
  }

  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "SENTINEL_WEEKLY_SUGGESTIONS",
    validate: async () => true,
    execute: async (rt: IAgentRuntime) => {
      if (process.env.SENTINEL_WEEKLY_ENABLED === "false") return;
      logger.debug("[SentinelWeekly] Building suggestions and investor update...");
      try {
        const list = await generateWeeklySuggestions(rt);
        const suggestionsMessage = [
          "**Sentinel — weekly suggestions**",
          "",
          list.trim(),
          "",
          "---",
          "_Ask me: suggest, what should we improve, task brief for Claude 4.6, ONNX status, openclaw guide, best settings, art gems._",
        ].join("\n");
        let sent = await pushToSentinelChannels(rt, suggestionsMessage);

        const investorBlock = await generateInvestorBlock(
          rt,
          syntheticMessage("Investor update", rt),
        );
        const investorMessage = [
          "**Investor update**",
          "",
          investorBlock.trim(),
        ].join("\n");
        sent += await pushToSentinelChannels(rt, investorMessage);

        if (sent > 0) {
          logger.debug(`[SentinelWeekly] Pushed to ${sent} channel(s)`);
        } else {
          logger.debug(
            "[SentinelWeekly] No channels matched (name contains 'sentinel' or 'ops').",
          );
        }
      } catch (error) {
        logger.error("[SentinelWeekly] Failed:", error);
      }
    },
  });

  await runtime.createTask({
    name: "SENTINEL_WEEKLY_SUGGESTIONS",
    description:
      "Weekly improvement suggestions (architecture, ops, benchmarks, examples, plugins) pushed to sentinel/ops channels",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["sentinel", "ops", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: WEEKLY_INTERVAL_MS,
    },
  });

  logger.debug(
    "[SentinelWeekly] Task registered (weekly; push to channels with 'sentinel' or 'ops' in name). Set SENTINEL_WEEKLY_ENABLED=false to disable.",
  );
}
