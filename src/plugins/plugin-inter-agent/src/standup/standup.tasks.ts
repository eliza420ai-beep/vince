/**
 * Agent standup task: 2x/day agents meet in a dedicated room to discuss
 * crypto performance, recent code, and produce action items + lessons learned.
 * Only the coordinator runtime (e.g. Sentinel) registers and runs this task.
 */

import { type IAgentRuntime, type UUID, logger, ChannelType, ModelType } from "@elizaos/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { v4 as uuidv4 } from "uuid";
import {
  getStandupWorldId,
  getStandupRoomId,
  getStandupFacilitatorId,
  STANDUP_INTERVAL_MS,
  TASK_NAME,
  STANDUP_ACTION_ITEM_TASK_NAME,
  STANDUP_REPORT_ORDER,
  isStandupTime,
  getStandupHours,
} from "./standup.constants";
import { buildShortStandupKickoff } from "./standup.context";
import { parseStandupTranscript, type StandupActionItem } from "./standup.parse";
import { getElizaOS, type IElizaOSRegistry } from "../types";
import { executeBuildActionItem, isNorthStarType } from "./standup.build";
import { buildDayReportPrompt } from "./standupDayReport";
import { saveDayReport, updateDayReportManifest } from "./dayReportPersistence";

const STANDUP_SOURCE = "standup";

/** Channel name keywords for Discord push (one team, one dream). Create #daily-standup and invite the coordinator (Kelly). */
const STANDUP_CHANNEL_NAME_PARTS = ["standup", "daily-standup"];
const PUSH_SOURCES = ["discord", "slack", "telegram"] as const;
const ZERO_UUID = "00000000-0000-0000-0000-000000000000" as UUID;

export interface StandupRoomResult {
  worldId: UUID;
  roomId: UUID;
  facilitatorEntityId: UUID;
}

/**
 * Ensure the standup world and room exist, and all in-process agents are
 * participants. Returns worldId, roomId, and facilitator entity ID.
 */
export async function ensureStandupWorldAndRoom(
  runtime: IAgentRuntime,
): Promise<StandupRoomResult> {
  const worldId = getStandupWorldId(runtime);
  const roomId = getStandupRoomId(runtime);
  const facilitatorEntityId = getStandupFacilitatorId(runtime);

  await runtime.ensureWorldExists({
    id: worldId,
    name: "Standup",
    agentId: runtime.agentId,
    messageServerId: worldId,
  });

  await runtime.ensureRoomExists({
    id: roomId,
    name: "daily-standup",
    source: STANDUP_SOURCE,
    type: ChannelType.GROUP,
    channelId: roomId,
    messageServerId: worldId,
    worldId,
    agentId: runtime.agentId,
  });

  const eliza = getElizaOS(runtime);
  if (eliza?.getAgents && typeof runtime.ensureConnection === "function") {
    const agents = eliza.getAgents();
    for (const a of agents) {
      const agentId = a?.agentId;
      if (!agentId) continue;
      const name = a?.character?.name ?? agentId.slice(0, 8);
      try {
        await runtime.ensureConnection({
          entityId: agentId as UUID,
          roomId,
          worldId,
          source: STANDUP_SOURCE,
          channelId: roomId,
          name,
          userName: name,
        });
      } catch (err) {
        logger.debug({ agentId, roomId, err }, "[Standup] ensureConnection skip");
      }
    }
    try {
      await runtime.ensureConnection({
        entityId: facilitatorEntityId,
        roomId,
        worldId,
        source: STANDUP_SOURCE,
        channelId: roomId,
        name: "Standup Facilitator",
        userName: "Standup Facilitator",
      });
    } catch (err) {
      logger.debug({ err }, "[Standup] ensureConnection facilitator skip");
    }
  }

  return { worldId, roomId, facilitatorEntityId };
}

const STANDUP_TURN_TIMEOUT_MS = 90_000;
const MAX_TRANSCRIPT_CHARS = 12_000;

function extractReplyFromResponse(resp: unknown): string | null {
  if (!resp || typeof resp !== "object") return null;
  const c = resp as { text?: string; message?: string; thought?: string; actions?: string[]; actionCallbacks?: unknown[] };
  let text = typeof c?.text === "string" ? c.text : typeof c?.message === "string" ? c.message : "";
  if (!text.trim() && c?.thought && Array.isArray(c?.actions) && c.actions.includes("REPLY")) text = String(c.thought);
  if (!text.trim() && Array.isArray(c?.actionCallbacks) && c.actionCallbacks.length > 0) {
    const last = c.actionCallbacks[c.actionCallbacks.length - 1] as { text?: string } | undefined;
    if (typeof last?.text === "string" && last.text.trim()) text = last.text;
  }
  return text.trim() ? text.trim() : null;
}

/**
 * Run one agent's turn: send transcript as the "user" message, get reply text.
 */
async function runOneStandupTurn(
  runtime: IAgentRuntime,
  eliza: IElizaOSRegistry,
  agentId: string,
  agentName: string,
  roomId: UUID,
  facilitatorEntityId: UUID,
  transcript: string,
): Promise<string | null> {
  const truncated =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? transcript.slice(-MAX_TRANSCRIPT_CHARS)
      : transcript;
  const userMsg = {
    id: uuidv4(),
    entityId: facilitatorEntityId,
    roomId,
    content: { text: truncated, source: STANDUP_SOURCE },
    createdAt: Date.now(),
  };
  return new Promise<string | null>((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, STANDUP_TURN_TIMEOUT_MS);
    const opts = {
      onResponse: (resp: unknown) => {
        const text = extractReplyFromResponse(resp);
        if (text && !settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve(text);
        }
      },
      onError: (err: Error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          reject(err);
        }
      },
    };
    eliza.handleMessage(agentId, userMsg, opts).catch((err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  });
}

/**
 * Run round-robin: each agent gets the current transcript and replies once.
 * Returns full transcript (kickoff + each agent's reply) and list of { agentId, agentName, reply }.
 */
export async function runStandupRoundRobin(
  runtime: IAgentRuntime,
  roomId: UUID,
  facilitatorEntityId: UUID,
  kickoffText: string,
): Promise<{ transcript: string; replies: { agentId: string; agentName: string; text: string }[] }> {
  const eliza = getElizaOS(runtime);
  if (!eliza?.getAgents || !eliza?.handleMessage) {
    logger.warn("[Standup] elizaOS or handleMessage not available; skipping round-robin.");
    return { transcript: kickoffText, replies: [] };
  }
  const agents = eliza.getAgents();
  const byName = new Map<string, (typeof agents)[number]>();
  for (const a of agents) {
    const name = a?.character?.name?.trim();
    if (name) byName.set(name.toLowerCase(), a);
  }
  const ordered: { agentId: string; agentName: string }[] = [];
  for (const name of STANDUP_REPORT_ORDER) {
    const a = byName.get(name.toLowerCase());
    if (a?.agentId) ordered.push({ agentId: a.agentId, agentName: a.character?.name ?? name });
  }
  const replies: { agentId: string; agentName: string; text: string }[] = [];
  let transcript = `[Standup kickoff]\n${kickoffText}`;
  for (const { agentId, agentName } of ordered) {
    try {
      const reply = await runOneStandupTurn(
        runtime,
        eliza,
        agentId,
        agentName,
        roomId,
        facilitatorEntityId,
        transcript,
      );
      const line = reply ? `${agentName}: ${reply}` : `${agentName}: (no reply)`;
      transcript += `\n\n${line}`;
      if (reply) replies.push({ agentId, agentName, text: reply });
      logger.info(`[Standup] ${agentName} replied (${reply?.length ?? 0} chars).`);
    } catch (err) {
      logger.warn({ err, agentName }, "[Standup] Turn failed");
      transcript += `\n\n${agentName}: (error)`;
    }
  }
  return { transcript, replies };
}

/**
 * Persist lessons to each agent's memory (facts table).
 */
async function persistStandupLessons(
  runtime: IAgentRuntime,
  roomId: UUID,
  lessonsByAgentName: Record<string, string>,
): Promise<void> {
  const eliza = getElizaOS(runtime);
  if (!eliza?.getAgents || !eliza?.getAgent) return;
  const agents = eliza.getAgents();
  const nameToId = new Map<string, string>();
  for (const a of agents) {
    const name = a?.character?.name?.trim();
    if (name && a?.agentId) nameToId.set(name, a.agentId);
  }
  for (const [agentName, lesson] of Object.entries(lessonsByAgentName)) {
    if (!lesson?.trim()) continue;
    const agentId = nameToId.get(agentName);
    if (!agentId) {
      logger.debug(`[Standup] No agentId for name "${agentName}", skip lesson.`);
      continue;
    }
    const targetRuntime = eliza.getAgent(agentId);
    if (!targetRuntime?.createMemory) continue;
    const memory = {
      id: uuidv4() as UUID,
      entityId: agentId as UUID,
      agentId: targetRuntime.agentId,
      roomId,
      content: { text: `[Standup lesson] ${lesson.trim()}` },
      createdAt: Date.now(),
    };
    await targetRuntime.createMemory(memory, "facts");
    logger.info(`[Standup] Persisted lesson for ${agentName}.`);
  }
}

const OPINION_DECAY = 0.1;

/**
 * Update inter-agent relationship opinion when disagreements are detected.
 * For each pair (A,B), both A→B and B→A get metadata.opinion decreased and metadata.disagreements incremented.
 */
async function persistStandupDisagreements(
  runtime: IAgentRuntime,
  disagreements: { agentA: string; agentB: string }[],
): Promise<void> {
  const eliza = getElizaOS(runtime);
  if (!eliza?.getAgents) return;
  const agents = eliza.getAgents();
  const nameToId = new Map<string, string>();
  for (const a of agents) {
    const name = a?.character?.name?.trim();
    if (name && a?.agentId) nameToId.set(name, a.agentId);
  }
  for (const { agentA, agentB } of disagreements) {
    const idA = agentA?.trim() ? nameToId.get(agentA.trim()) : undefined;
    const idB = agentB?.trim() ? nameToId.get(agentB.trim()) : undefined;
    if (!idA || !idB || idA === idB) continue;
    const entityIdA = idA as UUID;
    const entityIdB = idB as UUID;
    for (const [source, target] of [[entityIdA, entityIdB], [entityIdB, entityIdA]] as const) {
      try {
        let rel = await runtime.getRelationship({ sourceEntityId: source, targetEntityId: target });
        const existingOpinion = (rel?.metadata?.opinion as number | undefined) ?? 0;
        const existingDisagreements = (rel?.metadata?.disagreements as number | undefined) ?? 0;
        if (!rel) {
          await runtime.createRelationship({
            sourceEntityId: source,
            targetEntityId: target,
            tags: ["standup"],
            metadata: { opinion: existingOpinion - OPINION_DECAY, disagreements: existingDisagreements + 1 },
          });
        } else {
          await runtime.updateRelationship({
            ...rel,
            metadata: { ...rel.metadata, opinion: existingOpinion - OPINION_DECAY, disagreements: existingDisagreements + 1 },
          });
        }
      } catch (err) {
        logger.warn({ err, source, target }, "[Standup] Failed to update relationship opinion");
      }
    }
    logger.info(`[Standup] Updated relationship opinion for ${agentA} <-> ${agentB}.`);
  }
}

/** Resolve deliverables dir for suggestions file (same as standup.build). */
function getStandupDeliverablesDir(): string {
  const dir = process.env.STANDUP_DELIVERABLES_DIR?.trim();
  const base = dir ? (path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir)) : path.join(process.cwd(), "standup-deliverables");
  return base;
}

/**
 * Append agent-suggested improvements to standup-deliverables/agent-suggestions.md for human review.
 */
function persistStandupSuggestions(suggestions: string[] | undefined): void {
  if (!suggestions?.length) return;
  const dir = getStandupDeliverablesDir();
  const filepath = path.join(dir, "agent-suggestions.md");
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const block = [`## ${date}`, "", ...suggestions.map((s) => `- ${s}`), ""].join("\n");
    fs.appendFileSync(filepath, block, "utf-8");
    logger.info(`[Standup] Appended ${suggestions.length} suggestion(s) to ${filepath}`);
  } catch (err) {
    logger.warn({ err, filepath }, "[Standup] Failed to persist suggestions");
  }
}

/**
 * Create one-time tasks for each action item; worker sends reminder (remind) or runs build (build).
 */
async function createActionItemTasks(
  runtime: IAgentRuntime,
  actionItems: StandupActionItem[],
  roomId: UUID,
  facilitatorEntityId: UUID,
): Promise<void> {
  const taskWorldId = runtime.agentId as UUID;
  for (const item of actionItems) {
    await runtime.createTask({
      name: STANDUP_ACTION_ITEM_TASK_NAME,
      description: `Standup action: ${item.description.slice(0, 80)}...`,
      roomId: taskWorldId,
      worldId: taskWorldId,
      tags: ["queue", "standup"],
      metadata: {
        assigneeAgentName: item.assigneeAgentName,
        description: item.description,
        type: item.type ?? "remind",
        standupRoomId: roomId,
        facilitatorEntityId,
      },
    });
  }
}

/**
 * Push standup summary to Discord/Slack/Telegram channels whose name contains "standup" or "daily-standup".
 * Create #daily-standup and keep all team agents in that channel for "one team, one dream."
 */
async function pushStandupSummaryToChannels(
  runtime: IAgentRuntime,
  summary: string,
): Promise<number> {
  if (!summary?.trim()) return 0;
  const nameMatches = (room: { name?: string }): boolean => {
    const name = (room.name ?? "").toLowerCase();
    return STANDUP_CHANNEL_NAME_PARTS.some((part) => name.includes(part));
  };
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
        const src = (room.source ?? "").toLowerCase();
        if (!PUSH_SOURCES.includes(src as (typeof PUSH_SOURCES)[number])) continue;
        if (!room.id) continue;
        if (!nameMatches(room)) continue;
        targets.push({
          source: (room.source ?? "").toLowerCase(),
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
        const src = (room.source ?? "").toLowerCase();
        if (!PUSH_SOURCES.includes(src as (typeof PUSH_SOURCES)[number])) continue;
        if (!nameMatches(room)) continue;
        targets.push({
          source: (room.source ?? "").toLowerCase(),
          roomId: room.id,
          channelId: room.channelId,
          serverId:
            (room as { messageServerId?: string }).messageServerId ??
            (room as { serverId?: string }).serverId,
        });
      }
    }
  } catch (err) {
    logger.debug("[Standup] Could not get rooms for push:", err);
    return 0;
  }
  const isNoSendHandler = (e: unknown): boolean =>
    String(e).includes("No send handler") || String(e).includes("Send handler not found");
  let sent = 0;
  for (const target of targets) {
    try {
      await runtime.sendMessageToTarget(target, { text: summary });
      sent++;
    } catch (e) {
      if (!isNoSendHandler(e)) logger.warn("[Standup] Push to channel failed:", e);
    }
  }
  if (sent > 0) logger.info(`[Standup] Pushed summary to ${sent} channel(s).`);
  return sent;
}

/**
 * Register the standup action-item worker: build → executeBuildActionItem + notify; remind → handleMessage to assignee.
 */
function registerStandupActionItemWorker(runtime: IAgentRuntime): void {
  runtime.registerTaskWorker({
    name: STANDUP_ACTION_ITEM_TASK_NAME,
    validate: async () => true,
    execute: async (rt: IAgentRuntime, options: Record<string, unknown>) => {
      const assigneeAgentName = String(options.assigneeAgentName ?? "").trim();
      const description = String(options.description ?? "").trim();
      const type = (options.type as string | undefined) ?? "remind";
      const standupRoomId = options.standupRoomId as UUID | undefined;
      const facilitatorEntityId = options.facilitatorEntityId as UUID | undefined;
      if (!assigneeAgentName || !description || !standupRoomId || !facilitatorEntityId) {
        logger.debug("[Standup] ACTION_ITEM missing metadata, skip.");
        return;
      }

      const item: StandupActionItem = {
        assigneeAgentName,
        description,
        type: type as StandupActionItem["type"],
      };
      if (type === "build" || isNorthStarType(item.type)) {
        const result = await executeBuildActionItem(rt, item);
        if (result?.path || result?.message) {
          const line = result.path
            ? `Standup deliverable: ${description.slice(0, 60)}… → \`${result.path}\` (from ${assigneeAgentName})`
            : `Standup deliverable: ${result.message} (from ${assigneeAgentName})`;
          await pushStandupSummaryToChannels(rt, line);
        }
        return;
      }

      const eliza = getElizaOS(rt);
      if (!eliza?.getAgents || !eliza?.handleMessage) return;
      const agents = eliza.getAgents();
      const agent = agents.find(
        (a) => (a?.character?.name ?? "").trim().toLowerCase() === assigneeAgentName.toLowerCase(),
      );
      if (!agent?.agentId) {
        logger.debug(`[Standup] No agent found for "${assigneeAgentName}", skip reminder.`);
        return;
      }
      const msg = {
        id: uuidv4(),
        entityId: facilitatorEntityId,
        roomId: standupRoomId,
        content: { text: `[Standup action item for you] ${description}`, source: STANDUP_SOURCE },
        createdAt: Date.now(),
      };
      try {
        await eliza.handleMessage(agent.agentId, msg);
        logger.info(`[Standup] Sent action item reminder to ${assigneeAgentName}.`);
      } catch (err) {
        logger.warn({ err, assigneeAgentName }, "[Standup] Action item handleMessage failed");
      }
    },
  });
}

// Track last standup execution to prevent duplicate runs in the same hour
let lastStandupHour: number | null = null;

/**
 * Register the standup task worker and create the recurring task.
 * Call only from the coordinator agent's plugin init (when isStandupCoordinator(runtime)).
 *
 * Schedule: STANDUP_UTC_HOURS (default: "9" for 09:00 UTC daily)
 */
export async function registerStandupTask(runtime: IAgentRuntime): Promise<void> {
  registerStandupActionItemWorker(runtime);
  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt: IAgentRuntime) => {
      if (process.env.STANDUP_ENABLED !== "true") return;

      // Check if it's standup time
      const currentHour = new Date().getUTCHours();
      if (!isStandupTime()) {
        logger.debug(`[Standup] Not standup time (current: ${currentHour}:00 UTC, scheduled: ${getStandupHours().join(",")}:00 UTC)`);
        return;
      }

      // Prevent duplicate runs in the same hour
      if (lastStandupHour === currentHour) {
        logger.debug(`[Standup] Already ran standup at ${currentHour}:00 UTC this hour, skipping`);
        return;
      }

      lastStandupHour = currentHour;
      logger.info(`[Standup] 🎬 Starting scheduled standup (${currentHour}:00 UTC)...`);
      try {
        const { roomId, facilitatorEntityId } = await ensureStandupWorldAndRoom(rt);
        const kickoffText = buildShortStandupKickoff();
        const kickoffMemory = {
          id: uuidv4() as UUID,
          entityId: facilitatorEntityId,
          agentId: rt.agentId,
          roomId,
          content: { text: kickoffText, source: STANDUP_SOURCE },
          createdAt: Date.now(),
        };
        await rt.createMemory(kickoffMemory, "messages");
        const { transcript, replies } = await runStandupRoundRobin(
          rt,
          roomId,
          facilitatorEntityId,
          kickoffText,
        );
        for (const r of replies) {
          const replyMemory = {
            id: uuidv4() as UUID,
            entityId: r.agentId as UUID,
            agentId: rt.agentId,
            roomId,
            content: { text: r.text, source: STANDUP_SOURCE },
            createdAt: Date.now(),
          };
          await rt.createMemory(replyMemory, "messages");
        }
        const parsed = await parseStandupTranscript(rt, transcript);
        await persistStandupLessons(rt, roomId, parsed.lessonsByAgentName);
        await createActionItemTasks(
          rt,
          parsed.actionItems,
          roomId,
          facilitatorEntityId,
        );
        await persistStandupDisagreements(rt, parsed.disagreements);
        const buildCount = parsed.actionItems.filter((i) => i.type === "build").length;
        const northStarCount = parsed.actionItems.filter((i) => isNorthStarType(i.type)).length;
        const deliverableCount = buildCount + northStarCount;
        const remindCount = parsed.actionItems.length - deliverableCount;
        logger.info(
          `[Standup] Done: ${replies.length} replies, ${Object.keys(parsed.lessonsByAgentName).length} lessons, ${parsed.actionItems.length} action items (${buildCount} build, ${northStarCount} north-star, ${remindCount} remind), ${parsed.disagreements.length} disagreements.`,
        );
        await persistStandupSuggestions(parsed.suggestions);
        let dayReportPath: string | null = null;
        try {
          const dayReportPrompt = buildDayReportPrompt(transcript);
          const dayReport = await rt.useModel(ModelType.TEXT_LARGE, {
            prompt: dayReportPrompt,
            maxTokens: 1200,
            temperature: 0.7,
          });
          const reportText = String(dayReport).trim();
          dayReportPath = saveDayReport(reportText);
          if (dayReportPath) {
            const tldrMatch = reportText.match(/### TL;DR\n([^\n#]+)/);
            const summary = tldrMatch ? tldrMatch[1].trim() : "Day report generated";
            updateDayReportManifest(dayReportPath, summary);
            logger.info(`[Standup] Day Report saved to ${dayReportPath}`);
          }
        } catch (dayReportErr) {
          logger.warn({ err: dayReportErr }, "[Standup] Day Report generation failed; continuing with summary only");
        }
        const dateStr = new Date().toISOString().slice(0, 10);
        const summaryLines = [
          `**Standup ${dateStr}** (one team, one dream)`,
          `• ${replies.length} agents spoke`,
          `• Lessons: ${Object.keys(parsed.lessonsByAgentName).length}`,
          `• Action items: ${parsed.actionItems.length}${deliverableCount > 0 ? ` (${deliverableCount} deliverables — will be posted when ready)` : ""}`,
          dayReportPath ? `• Day Report: \`${dayReportPath}\`` : "",
          parsed.disagreements.length > 0 ? `• Disagreements noted: ${parsed.disagreements.length}` : "",
          "",
          transcript.slice(-2000),
        ].filter(Boolean);
        await pushStandupSummaryToChannels(rt, summaryLines.join("\n"));
      } catch (error) {
        logger.error("[Standup] Failed:", error);
      }
    },
  });

  const taskWorldId = runtime.agentId as UUID;
  const intervalMs =
    typeof process.env.STANDUP_INTERVAL_MS === "string"
      ? parseInt(process.env.STANDUP_INTERVAL_MS, 10)
      : STANDUP_INTERVAL_MS;

  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Scheduled standup: market data, reports, action items, lessons learned.",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["queue", "repeat", "standup"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: Number.isFinite(intervalMs) ? intervalMs : STANDUP_INTERVAL_MS,
    },
  });

  const scheduledHours = getStandupHours();
  const hoursStr = scheduledHours.map((h) => `${h.toString().padStart(2, "0")}:00`).join(", ");
  logger.info(
    `[Standup] ✅ Task registered — scheduled at ${hoursStr} UTC (check every ${intervalMs / 60000} min). Set STANDUP_ENABLED=true to activate.`,
  );
}
