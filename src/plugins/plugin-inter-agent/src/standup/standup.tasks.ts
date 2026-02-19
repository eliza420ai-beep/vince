/**
 * Agent standup task: 2x/day agents meet in a dedicated room to discuss
 * crypto performance, recent code, and produce action items + lessons learned.
 * Only the coordinator runtime (e.g. Sentinel) registers and runs this task.
 */

import {
  type IAgentRuntime,
  type UUID,
  logger,
  ChannelType,
  ModelType,
} from "@elizaos/core";
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
  STANDUP_RALPH_LOOP_TASK_NAME,
  getStandupRalphIntervalMs,
  getStandupRequireApprovalTypes,
  STANDUP_REPORT_ORDER,
  isStandupTime,
  getStandupHours,
  getStandupAgentTurnTimeoutMs,
} from "./standup.constants";
import { buildShortStandupKickoff } from "./standup.context";
import {
  parseStandupTranscript,
  countCrossAgentLinks,
  type StandupActionItem,
} from "./standup.parse";
import {
  parseStructuredBlockFromText,
  type ParsedStructuredBlock,
} from "./crossAgentValidation";
import { getElizaOS, type IElizaOSRegistry } from "../types";
import { executeBuildActionItem, isNorthStarType } from "./standup.build";
import { generateAndSaveDayReport } from "./standupDayReport";
import {
  getPendingActionItems,
  claimActionItem,
  updateActionItem,
} from "./actionItemTracker";
import type { ActionItem } from "./actionItemTracker";
import { verifyActionItem } from "./standupVerifier";
import { appendLearning } from "./standupLearnings";
import {
  saveSharedDailyInsights,
  loadSharedDailyInsights,
} from "./dayReportPersistence";
import {
  fetchAgentData,
  extractKeyEventsFromVinceData,
} from "./standupDataFetcher";
import {
  AGENT_ROLES,
  buildStandupPrompt,
  extractAgentSection,
  formatReportDate,
  getReportTemplate,
} from "./standupReports";
import { buildKickoffWithSharedInsights } from "./standup.context";
import { isStandupRunning, markAgentReported } from "./standupState";
import { validatePredictions } from "./predictionTracker";

const STANDUP_SOURCE = "standup";

/** Default per-agent caps (chars). Raised so every agent can bring enough value; override via STANDUP_INSIGHTS_CAP_<AGENT>=N. */
const DEFAULT_INSIGHTS_CAP_BY_AGENT: Record<string, number> = {
  vince: 2800,
  oracle: 1200,
  echo: 1100,
  solus: 1000,
  sentinel: 1200,
  clawterm: 1200,
  eliza: 900,
  otaku: 500,
  kelly: 400,
};

function getSharedInsightsCapForAgent(displayName: string): number {
  const key = (displayName ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  const envKey = `STANDUP_INSIGHTS_CAP_${key.toUpperCase().replace(/-/g, "_")}`;
  const envVal = process.env[envKey]?.trim();
  if (envVal !== undefined && envVal !== "") {
    const n = parseInt(envVal, 10);
    if (!isNaN(n) && n > 0) {
      const max = key === "vince" ? 3500 : 2000;
      return Math.min(n, max);
    }
  }
  return DEFAULT_INSIGHTS_CAP_BY_AGENT[key] ?? 500;
}

/** Channel name keywords for Discord push (one team, one dream). Create #daily-standup and invite the coordinator (Kelly). */
const STANDUP_CHANNEL_NAME_PARTS = ["standup", "daily-standup"];
const PUSH_SOURCES = ["discord", "slack", "telegram"] as const;
const ZERO_UUID = "00000000-0000-0000-0000-000000000000" as UUID;
/** Discord message limit 2000; use 1900 for safe margin. */
const DISCORD_MAX_MESSAGE_CHARS = 1900;

type PushTarget = {
  source: string;
  roomId?: UUID;
  channelId?: string;
  serverId?: string;
  name?: string;
};

function chunkForDiscord(text: string): string[] {
  if (!text?.trim()) return [];
  if (text.length <= DISCORD_MAX_MESSAGE_CHARS) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= DISCORD_MAX_MESSAGE_CHARS) {
      chunks.push(remaining);
      break;
    }
    const slice = remaining.slice(0, DISCORD_MAX_MESSAGE_CHARS);
    const lastNewline = slice.lastIndexOf("\n");
    const lastSpace = slice.lastIndexOf(" ");
    const splitAt =
      lastNewline >= DISCORD_MAX_MESSAGE_CHARS / 2
        ? lastNewline + 1
        : lastSpace >= DISCORD_MAX_MESSAGE_CHARS / 2
          ? lastSpace + 1
          : DISCORD_MAX_MESSAGE_CHARS;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}

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
        logger.debug(
          { agentId, roomId, err },
          "[Standup] ensureConnection skip",
        );
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

const MAX_TRANSCRIPT_CHARS = 12_000;

/**
 * Build shared daily insights from each agent's data and save to daily-insights/YYYY-MM-DD-shared-insights.md.
 * Each agent's data is fetched from that agent's runtime (so services like VINCE_MARKET_DATA_SERVICE are available).
 * Per-agent section capped so total doc stays ~6k and fits in transcript.
 */
export async function buildAndSaveSharedDailyInsights(
  runtime: IAgentRuntime,
  eliza: IElizaOSRegistry,
): Promise<void> {
  if (!eliza.getAgent) {
    logger.debug("[Standup] No getAgent — skip shared insights pre-write");
    return;
  }
  // Bind getAgent so `this` is preserved (unbound call throws "Cannot read properties of undefined (reading 'runtimes')")
  const getAgent = eliza.getAgent.bind(eliza);
  if (typeof eliza.getAgents !== "function") {
    logger.debug("[Standup] No getAgents — skip shared insights pre-write");
    return;
  }
  let agents: { agentId: string; character?: { name?: string } }[];
  try {
    const raw = eliza.getAgents.call(eliza);
    agents = Array.isArray(raw) ? raw : [];
  } catch (err) {
    logger.warn(
      { err },
      "[Standup] eliza.getAgents() failed — skip shared insights (if err mentions 'runtimes', in-process registry may not be attached; standup continues with short kickoff)",
    );
    return;
  }
  const byName = new Map<string, { agentId: string; displayName: string }>();
  for (const a of agents) {
    const name = a?.character?.name?.trim();
    if (name && a?.agentId)
      byName.set(name.toLowerCase(), {
        agentId: a.agentId,
        displayName: a.character?.name ?? name,
      });
  }
  const sections: string[] = [];
  const date = new Date().toISOString().slice(0, 10);
  sections.push(`# Shared Daily Insights — ${date}\n`);
  let vinceContextHints: string[] = [];
  for (const displayName of STANDUP_REPORT_ORDER) {
    const entry = byName.get(displayName.toLowerCase());
    if (!entry) {
      sections.push(`## ${displayName}\n(no agent in registry)\n`);
      continue;
    }
    let agentRuntime: IAgentRuntime | undefined;
    try {
      agentRuntime = getAgent(entry.agentId);
    } catch (err) {
      logger.warn(
        { err, agent: displayName },
        "[Standup] getAgent() failed for shared insights",
      );
      sections.push(`## ${displayName}\n(runtime unavailable)\n`);
      continue;
    }
    if (!agentRuntime) {
      sections.push(`## ${displayName}\n(no runtime)\n`);
      continue;
    }
    const normalized = displayName.toLowerCase();
    const contextHints =
      normalized === "echo" || normalized === "clawterm"
        ? vinceContextHints
        : undefined;
    try {
      let data = await fetchAgentData(
        agentRuntime,
        entry.displayName,
        contextHints,
      );
      if (!data) data = "(no data)";
      if (normalized === "vince") {
        vinceContextHints = extractKeyEventsFromVinceData(data);
      }
      const cap = getSharedInsightsCapForAgent(displayName);
      if (data.length > cap) {
        data = data.slice(0, cap) + "…";
      }
      sections.push(`## ${displayName}\n${data}\n`);
    } catch (err) {
      logger.warn(
        { err, agent: displayName },
        "[Standup] fetchAgentData failed for shared insights",
      );
      sections.push(`## ${displayName}\n(fetch failed)\n`);
    }
  }
  const content = sections.join("\n");
  await saveSharedDailyInsights(content);
}

function extractReplyFromResponse(resp: unknown): string | null {
  if (!resp || typeof resp !== "object") return null;
  const c =
    (resp as { content?: typeof resp }).content ??
    (resp as {
      text?: string;
      message?: string;
      thought?: string;
      actions?: string[];
      actionCallbacks?: unknown[];
    });
  const obj = c as {
    text?: string;
    message?: string;
    thought?: string;
    actions?: string[];
    actionCallbacks?: unknown[];
  };

  // Reject IGNORE/NONE actions — these are "agent decided not to respond" placeholders, not real replies
  if (Array.isArray(obj?.actions)) {
    const actions = obj.actions.map((a) =>
      typeof a === "string" ? a.toUpperCase() : "",
    );
    if (actions.includes("IGNORE") || actions.includes("NONE")) {
      logger.info(
        "[Standup] extractReplyFromResponse: agent returned IGNORE/NONE — treating as no reply",
      );
      return null;
    }
  }

  let text =
    typeof obj?.text === "string"
      ? obj.text
      : typeof obj?.message === "string"
        ? obj.message
        : "";
  if (!text.trim() && typeof obj?.thought === "string" && obj.thought.trim())
    text = obj.thought;
  if (
    !text.trim() &&
    Array.isArray(obj?.actionCallbacks) &&
    obj.actionCallbacks.length > 0
  ) {
    const last = obj.actionCallbacks[obj.actionCallbacks.length - 1] as
      | { text?: string }
      | undefined;
    if (typeof last?.text === "string" && last.text.trim()) text = last.text;
  }
  const out = text.trim() ? text.trim() : null;
  if (!out && (obj?.thought || obj?.text !== undefined)) {
    logger.debug(
      {
        thoughtLen: (obj.thought ?? "").length,
        textLen: (obj.text ?? "").length,
      },
      "[Standup] extractReplyFromResponse: got response but no usable text/thought",
    );
  }
  if (out && out.length < 100) {
    logger.info(
      { len: out.length, preview: out.slice(0, 80) },
      "[Standup] extractReplyFromResponse: short reply (possibly canned)",
    );
  }
  return out;
}

/**
 * Run one agent's turn: use direct runtime.useModel to bypass shouldRespond/IGNORE,
 * fallback to handleMessage if getAgent or useModel unavailable.
 */
async function runOneStandupTurn(
  runtime: IAgentRuntime,
  eliza: IElizaOSRegistry,
  agentId: string,
  agentName: string,
  roomId: UUID,
  facilitatorEntityId: UUID,
  transcript: string,
  sharedInsights: string,
): Promise<string | null> {
  const truncated =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? transcript.slice(-MAX_TRANSCRIPT_CHARS)
      : transcript;

  const isConclusionTurn = agentName.toLowerCase() === "naval";

  // Direct path: bypass handleMessage / shouldRespond / IGNORE
  const getAgent = eliza.getAgent?.bind?.(eliza) ?? eliza.getAgent;
  const agentRuntime = getAgent?.(agentId);
  if (agentRuntime?.useModel) {
    try {
      const prompt = buildStandupPrompt(
        agentName,
        sharedInsights,
        truncated,
        formatReportDate(),
      );
      const resp = await agentRuntime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        maxTokens: isConclusionTurn ? 180 : 500,
        temperature: 0.7,
      });
      const text = String(resp ?? "").trim();
      return text || null;
    } catch (err) {
      logger.warn(
        { err, agentName },
        "[Standup] Direct useModel failed; falling back to handleMessage.",
      );
    }
  }

  // Fallback: handleMessage path (same restricted context)
  const contextBlock = isConclusionTurn
    ? truncated
    : extractAgentSection(sharedInsights, agentName);
  const agentRole = AGENT_ROLES[agentName as keyof typeof AGENT_ROLES];
  const roleHint = agentRole ? ` (${agentRole.focus})` : "";
  const directAddress = isConclusionTurn
    ? `@${agentName}, conclusion only. 2-4 short sentences: thesis, signal to watch, one team one dream. No bullets, no paragraphs.\n\n`
    : `@${agentName}${roleHint}, your turn. Report your domain only. Under 120 words.\n\n`;
  const userMsg = {
    id: uuidv4(),
    entityId: facilitatorEntityId,
    roomId,
    content: {
      text: directAddress + contextBlock,
      source: STANDUP_SOURCE,
    },
    createdAt: Date.now(),
  };
  return new Promise<string | null>((resolve, reject) => {
    let settled = false;
    let lastExtracted: string | null = null;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(lastExtracted);
    }, getStandupAgentTurnTimeoutMs());
    const opts = {
      onResponse: (resp: unknown) => {
        const text = extractReplyFromResponse(resp);
        if (text) lastExtracted = text;
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
 * Returns full transcript and list of replies with optional structured signals (parsed from JSON block).
 */
export async function runStandupRoundRobin(
  runtime: IAgentRuntime,
  roomId: UUID,
  facilitatorEntityId: UUID,
  kickoffText: string,
  sharedInsights: string,
): Promise<{
  transcript: string;
  replies: {
    agentId: string;
    agentName: string;
    text: string;
    structuredSignals?: ParsedStructuredBlock;
  }[];
}> {
  const eliza = getElizaOS(runtime);
  if (!eliza?.getAgents || !eliza?.handleMessage) {
    logger.warn(
      "[Standup] elizaOS or handleMessage not available; skipping round-robin.",
    );
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
    if (a?.agentId)
      ordered.push({
        agentId: a.agentId,
        agentName: a.character?.name ?? name,
      });
  }
  const replies: {
    agentId: string;
    agentName: string;
    text: string;
    structuredSignals?: ParsedStructuredBlock;
  }[] = [];
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
        sharedInsights,
      );
      const structuredSignals = reply
        ? (parseStructuredBlockFromText(reply) ?? undefined)
        : undefined;
      const line = reply
        ? `${agentName}: ${reply}`
        : `${agentName}: (no reply)`;
      transcript += `\n\n${line}`;
      if (reply) {
        replies.push({ agentId, agentName, text: reply, structuredSignals });
        markAgentReported(agentName);
      }
      logger.info(
        `[Standup] ${agentName} replied (${reply?.length ?? 0} chars).`,
      );
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
export async function persistStandupLessons(
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
      logger.debug(
        `[Standup] No agentId for name "${agentName}", skip lesson.`,
      );
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
export async function persistStandupDisagreements(
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
    for (const [source, target] of [
      [entityIdA, entityIdB],
      [entityIdB, entityIdA],
    ] as const) {
      try {
        let rel = await runtime.getRelationship({
          sourceEntityId: source,
          targetEntityId: target,
        });
        const existingOpinion =
          (rel?.metadata?.opinion as number | undefined) ?? 0;
        const existingDisagreements =
          (rel?.metadata?.disagreements as number | undefined) ?? 0;
        if (!rel) {
          await runtime.createRelationship({
            sourceEntityId: source,
            targetEntityId: target,
            tags: ["standup"],
            metadata: {
              opinion: existingOpinion - OPINION_DECAY,
              disagreements: existingDisagreements + 1,
            },
          });
        } else {
          await runtime.updateRelationship({
            ...rel,
            metadata: {
              ...rel.metadata,
              opinion: existingOpinion - OPINION_DECAY,
              disagreements: existingDisagreements + 1,
            },
          });
        }
      } catch (err) {
        logger.warn(
          { err, source, target },
          "[Standup] Failed to update relationship opinion",
        );
      }
    }
    logger.info(
      `[Standup] Updated relationship opinion for ${agentA} <-> ${agentB}.`,
    );
  }
}

/** Resolve deliverables dir for suggestions file (same as standup.build). */
function getStandupDeliverablesDir(): string {
  const dir = process.env.STANDUP_DELIVERABLES_DIR?.trim();
  const base = dir
    ? path.isAbsolute(dir)
      ? dir
      : path.join(process.cwd(), dir)
    : path.join(process.cwd(), "docs/standup");
  return base;
}

/**
 * Append an action item to STANDUP_DELIVERABLES_DIR/pending-approval.ndjson when its type is in STANDUP_REQUIRE_APPROVAL_TYPES.
 * Human (or an approve command) can move it back to executable status.
 */
function writePendingApprovalItem(
  item: ActionItem,
  standupItem: StandupActionItem,
): void {
  const dir = getStandupDeliverablesDir();
  const filepath = path.join(dir, "pending-approval.ndjson");
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const line =
      JSON.stringify({
        id: item.id,
        type: standupItem.type,
        what: item.what,
        owner: item.owner,
        date: item.date,
        createdAt: new Date().toISOString(),
      }) + "\n";
    fs.appendFileSync(filepath, line, "utf-8");
    logger.info(
      { itemId: item.id, type: standupItem.type },
      "[Standup] Appended item to pending approval",
    );
  } catch (err) {
    logger.warn(
      { err, filepath },
      "[Standup] Failed to write pending approval item",
    );
  }
}

/**
 * Append agent-suggested improvements to STANDUP_DELIVERABLES_DIR/agent-suggestions.md (default docs/standup) for human review.
 */
function persistStandupSuggestions(suggestions: string[] | undefined): void {
  if (!suggestions?.length) return;
  const dir = getStandupDeliverablesDir();
  const filepath = path.join(dir, "agent-suggestions.md");
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const block = [
      `## ${date}`,
      "",
      ...suggestions.map((s) => `- ${s}`),
      "",
    ].join("\n");
    fs.appendFileSync(filepath, block, "utf-8");
    logger.info(
      `[Standup] Appended ${suggestions.length} suggestion(s) to ${filepath}`,
    );
  } catch (err) {
    logger.warn({ err, filepath }, "[Standup] Failed to persist suggestions");
  }
}

/**
 * Create one-time tasks for each action item; worker sends reminder (remind) or runs build (build).
 */
export async function createActionItemTasks(
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
 * Chunks text when exceeding Discord 2000-char limit. Uses preferredRoomId (e.g. message.roomId) when provided.
 */
export async function pushStandupSummaryToChannels(
  runtime: IAgentRuntime,
  summary: string,
  options?: { preferredRoomId?: UUID },
): Promise<number> {
  if (!summary?.trim()) return 0;
  const nameMatches = (room: { name?: string }): boolean => {
    const name = (room.name ?? "").toLowerCase();
    return STANDUP_CHANNEL_NAME_PARTS.some((part) => name.includes(part));
  };
  const seenRoomIds = new Set<string>();
  const addTarget = (room: {
    id?: UUID;
    source?: string;
    channelId?: string;
    name?: string;
  }) => {
    const rid = room.id as string | undefined;
    if (!rid || seenRoomIds.has(rid)) return;
    const src = (room.source ?? "").toLowerCase();
    if (!PUSH_SOURCES.includes(src as (typeof PUSH_SOURCES)[number])) return;
    seenRoomIds.add(rid);
    targets.push({
      source: src,
      roomId: room.id as UUID,
      channelId: room.channelId,
      serverId:
        (room as { messageServerId?: string }).messageServerId ??
        (room as { serverId?: string }).serverId,
      name: room.name,
    });
  };

  const targets: PushTarget[] = [];
  let worldCount = 0;
  let totalRoomCount = 0;
  let matchedByName = 0;

  try {
    const worlds = await runtime.getAllWorlds();
    worldCount = worlds.length;
    for (const world of worlds) {
      const rooms = await runtime.getRooms(world.id);
      for (const room of rooms) {
        totalRoomCount++;
        const src = (room.source ?? "").toLowerCase();
        if (!PUSH_SOURCES.includes(src as (typeof PUSH_SOURCES)[number]))
          continue;
        if (!room.id) continue;
        if (nameMatches(room)) {
          matchedByName++;
          addTarget(room);
        }
      }
    }
    if (worlds.length === 0) {
      const fallbackRooms = await runtime.getRooms(ZERO_UUID);
      for (const room of fallbackRooms) {
        totalRoomCount++;
        const src = (room.source ?? "").toLowerCase();
        if (!PUSH_SOURCES.includes(src as (typeof PUSH_SOURCES)[number]))
          continue;
        if (nameMatches(room)) {
          matchedByName++;
          addTarget(room);
        }
      }
    }

    if (options?.preferredRoomId && !seenRoomIds.has(options.preferredRoomId)) {
      const prefRoom = await runtime.getRoom(options.preferredRoomId);
      if (prefRoom) {
        const src = (prefRoom.source ?? "").toLowerCase();
        if (PUSH_SOURCES.includes(src as (typeof PUSH_SOURCES)[number])) {
          addTarget(prefRoom);
          logger.info(
            {
              roomId: options.preferredRoomId,
              source: src,
              name: prefRoom.name,
            },
            "[Standup] Added preferred room to push targets",
          );
        }
      }
    }
  } catch (err) {
    logger.debug("[Standup] Could not get rooms for push:", err);
    return 0;
  }

  if (targets.length === 0) {
    logger.warn(
      { worldCount, totalRoomCount, matchedByName },
      "[Standup] No push targets found (standup/daily-standup channels with discord/slack/telegram)",
    );
    return 0;
  }

  logger.info(
    {
      targetCount: targets.length,
      targets: targets.map((t) => ({
        roomId: t.roomId,
        source: t.source,
        name: t.name,
        channelId: t.channelId,
      })),
    },
    "[Standup] Push targets resolved",
  );

  // ElizaOS 1.x framework bug: registerService calls serviceDef.constructor.registerSendHandlers
  // instead of serviceDef.registerSendHandlers, so the real Discord send handler is never registered.
  // We bypass sendMessageToTarget and call the Discord service's handleSendMessage directly.
  const discordSvc = runtime.getService("discord") as {
    handleSendMessage?: (
      r: IAgentRuntime,
      t: {
        source: string;
        roomId?: UUID;
        channelId?: string;
        serverId?: string | null;
      },
      c: { text: string },
    ) => Promise<void>;
  } | null;

  const sendToTarget = async (
    target: PushTarget,
    content: { text: string },
  ): Promise<void> => {
    if (
      target.source === "discord" &&
      discordSvc &&
      typeof discordSvc.handleSendMessage === "function"
    ) {
      await discordSvc.handleSendMessage(runtime, target, content);
    } else {
      await runtime.sendMessageToTarget(target, content);
    }
  };

  const chunks = chunkForDiscord(summary);
  const delayMs = 500;

  let sent = 0;
  for (const target of targets) {
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, delayMs));
        await sendToTarget(target, { text: chunks[i] });
      }
      sent++;
      if (chunks.length > 1) {
        logger.info(
          {
            roomId: target.roomId,
            source: target.source,
            name: target.name,
            chunkCount: chunks.length,
          },
          "[Standup] Pushed chunked summary to target",
        );
      }
    } catch (e) {
      logger.warn(
        {
          roomId: target.roomId,
          source: target.source,
          channelId: target.channelId,
          summaryLength: summary.length,
          chunkCount: chunks.length,
          err: e,
        },
        "[Standup] Push to channel failed",
      );
    }
  }
  if (sent > 0) {
    logger.info(
      { sent, chunkCount: chunks.length },
      `[Standup] Pushed summary to ${sent} channel(s)`,
    );
  }
  return sent;
}

/** When true (default), use Ralph loop only; do not create per-item queue tasks. Set STANDUP_USE_RALPH_LOOP=false for legacy. */
export function useRalphLoop(): boolean {
  return process.env.STANDUP_USE_RALPH_LOOP !== "false";
}

/** Infer remind vs build from action item what. */
function isRemindType(item: ActionItem): boolean {
  const w = (item.what || "").toLowerCase();
  return /remind|ping|follow up|check in|nudge|touch base/.test(w);
}

/** Map file-store ActionItem to StandupActionItem for executeBuildActionItem / remind. */
function toStandupActionItem(item: ActionItem): StandupActionItem {
  return {
    assigneeAgentName: item.owner,
    description: item.what,
    type: isRemindType(item) ? "remind" : "build",
  };
}

/**
 * Ralph loop worker: process one pending action item per run (priority order), execute, verify, update, log learning.
 */
function registerStandupRalphLoopWorker(runtime: IAgentRuntime): void {
  runtime.registerTaskWorker({
    name: STANDUP_RALPH_LOOP_TASK_NAME,
    validate: async () => true,
    execute: async (rt: IAgentRuntime) => {
      if (process.env.STANDUP_ENABLED !== "true") return;

      const pending = await getPendingActionItems();
      if (pending.length === 0) return;

      const sorted = [...pending].sort((a, b) => {
        const pa = a.priority ?? 999;
        const pb = b.priority ?? 999;
        if (pa !== pb) return pa - pb;
        return (a.createdAt || "").localeCompare(b.createdAt || "");
      });

      let item: ActionItem | null = null;
      for (const candidate of sorted) {
        if (!candidate?.id) continue;
        item = await claimActionItem(candidate.id);
        if (item) break;
      }
      if (!item) return;

      const standupItem = toStandupActionItem(item);
      const requireApprovalTypes = getStandupRequireApprovalTypes();
      if (
        requireApprovalTypes.size > 0 &&
        requireApprovalTypes.has((standupItem.type ?? "").toLowerCase())
      ) {
        writePendingApprovalItem(item, standupItem);
        await pushStandupSummaryToChannels(
          rt,
          `Action item requires approval: ${item.what.slice(0, 80)}… (type=${standupItem.type}) — see pending-approval.ndjson`,
        );
        await updateActionItem(item.id, { status: "pending_approval" });
        return;
      }

      let result: { path?: string; message?: string } | null = null;
      let outcome = "";

      try {
        if (standupItem.type === "remind") {
          const { roomId, facilitatorEntityId } =
            await ensureStandupWorldAndRoom(rt);
          const eliza = getElizaOS(rt);
          if (eliza?.getAgents && eliza?.handleMessage) {
            const agents = eliza.getAgents();
            const agent = agents.find(
              (a) =>
                (a?.character?.name ?? "").trim().toLowerCase() ===
                (item.owner || "").trim().toLowerCase(),
            );
            if (agent?.agentId) {
              const msg = {
                id: uuidv4(),
                entityId: facilitatorEntityId,
                roomId,
                content: {
                  text: `[Standup action item] ${item.what}`,
                  source: STANDUP_SOURCE,
                },
                createdAt: Date.now(),
              };
              await eliza.handleMessage(agent.agentId, msg);
              result = { message: "remind sent" };
              outcome = `Reminder sent to @${item.owner}`;
            }
          }
          if (!result) {
            result = { message: "remind skipped (no agent)" };
            outcome = "Remind skipped: assignee agent not found";
          }
        } else {
          result = await executeBuildActionItem(rt, standupItem);
          if (result?.path) outcome = result.path;
          else if (result?.message) outcome = result.message;
          else outcome = "No deliverable produced";
        }

        const verify = await verifyActionItem(rt, item, result);
        if (verify.ok) {
          await updateActionItem(item.id, { status: "done", outcome });
        } else {
          await updateActionItem(item.id, {
            status: "failed",
            outcome: verify.message || outcome,
          });
          outcome = verify.message || outcome;
        }
        await appendLearning(item, outcome);
        if (result?.path || result?.message) {
          const line = result.path
            ? `Standup deliverable: ${item.what.slice(0, 60)}… → \`${result.path}\` (${item.owner})`
            : `Standup deliverable: ${result.message} (${item.owner})`;
          await pushStandupSummaryToChannels(rt, line);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn(
          { err, itemId: item.id },
          "[Standup] Ralph loop execution failed",
        );
        await updateActionItem(item.id, { status: "failed", outcome: errMsg });
        await appendLearning(item, errMsg);
      }
    },
  });
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
      const facilitatorEntityId = options.facilitatorEntityId as
        | UUID
        | undefined;
      if (
        !assigneeAgentName ||
        !description ||
        !standupRoomId ||
        !facilitatorEntityId
      ) {
        logger.debug("[Standup] ACTION_ITEM missing metadata, skip.");
        return;
      }

      const item: StandupActionItem = {
        assigneeAgentName,
        description,
        type: type as StandupActionItem["type"],
      };
      if (type === "build" || isNorthStarType(item.type)) {
        const requireApprovalTypes = getStandupRequireApprovalTypes();
        if (
          requireApprovalTypes.size > 0 &&
          requireApprovalTypes.has((item.type ?? "").toLowerCase())
        ) {
          const pseudoItem: ActionItem = {
            id: `immediate-${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            what: description,
            how: "",
            why: "",
            owner: assigneeAgentName,
            urgency: "today",
            status: "pending_approval",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          writePendingApprovalItem(pseudoItem, item);
          await pushStandupSummaryToChannels(
            rt,
            `Action item requires approval: ${description.slice(0, 60)}… (type=${item.type}) — see pending-approval.ndjson`,
          );
          return;
        }
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
        (a) =>
          (a?.character?.name ?? "").trim().toLowerCase() ===
          assigneeAgentName.toLowerCase(),
      );
      if (!agent?.agentId) {
        logger.debug(
          `[Standup] No agent found for "${assigneeAgentName}", skip reminder.`,
        );
        return;
      }
      const msg = {
        id: uuidv4(),
        entityId: facilitatorEntityId,
        roomId: standupRoomId,
        content: {
          text: `[Standup action item for you] ${description}`,
          source: STANDUP_SOURCE,
        },
        createdAt: Date.now(),
      };
      try {
        await eliza.handleMessage(agent.agentId, msg);
        logger.info(
          `[Standup] Sent action item reminder to ${assigneeAgentName}.`,
        );
      } catch (err) {
        logger.warn(
          { err, assigneeAgentName },
          "[Standup] Action item handleMessage failed",
        );
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
export async function registerStandupTask(
  runtime: IAgentRuntime,
): Promise<void> {
  registerStandupActionItemWorker(runtime);
  registerStandupRalphLoopWorker(runtime);
  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt: IAgentRuntime) => {
      if (process.env.STANDUP_ENABLED !== "true") return;

      // Check if it's standup time
      const currentHour = new Date().getUTCHours();
      if (!isStandupTime()) {
        logger.debug(
          `[Standup] Not standup time (current: ${currentHour}:00 UTC, scheduled: ${getStandupHours().join(",")}:00 UTC)`,
        );
        return;
      }

      // Prevent duplicate runs in the same hour
      if (lastStandupHour === currentHour) {
        logger.debug(
          `[Standup] Already ran standup at ${currentHour}:00 UTC this hour, skipping`,
        );
        return;
      }

      // Skip if a manual standup is already running
      if (isStandupRunning()) {
        logger.info(
          "[Standup] Manual standup in progress — skipping scheduled run",
        );
        return;
      }

      lastStandupHour = currentHour;
      logger.info(
        `[Standup] 🎬 Starting scheduled standup (${currentHour}:00 UTC)...`,
      );
      try {
        const { roomId, facilitatorEntityId } =
          await ensureStandupWorldAndRoom(rt);
        const eliza = getElizaOS(rt);
        if (eliza?.getAgent) {
          await buildAndSaveSharedDailyInsights(rt, eliza);
        }
        const sharedContent = (await loadSharedDailyInsights())?.trim();
        const kickoffText = sharedContent
          ? await buildKickoffWithSharedInsights(sharedContent)
          : buildShortStandupKickoff();
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
          sharedContent ?? "",
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
        const crossAgentLinks = countCrossAgentLinks(transcript);
        if (crossAgentLinks > 0) {
          logger.info(
            `[Standup] North star: ${crossAgentLinks} cross-agent link(s) detected`,
          );
        }
        await persistStandupLessons(rt, roomId, parsed.lessonsByAgentName);
        if (!useRalphLoop()) {
          await createActionItemTasks(
            rt,
            parsed.actionItems,
            roomId,
            facilitatorEntityId,
          );
        }
        await persistStandupDisagreements(rt, parsed.disagreements);
        const buildCount = parsed.actionItems.filter(
          (i) => i.type === "build",
        ).length;
        const northStarCount = parsed.actionItems.filter((i) =>
          isNorthStarType(i.type),
        ).length;
        const deliverableCount = buildCount + northStarCount;
        const remindCount = parsed.actionItems.length - deliverableCount;
        logger.info(
          `[Standup] Done: ${replies.length} replies, ${Object.keys(parsed.lessonsByAgentName).length} lessons, ${parsed.actionItems.length} action items (${buildCount} build, ${northStarCount} north-star, ${remindCount} remind), ${parsed.disagreements.length} disagreements.`,
        );
        await persistStandupSuggestions(parsed.suggestions);
        const dateStr = new Date().toISOString().slice(0, 10);
        let dayReportPath: string | null = null;
        let reportText: string | null = null;
        try {
          const result = await generateAndSaveDayReport(rt, transcript, {
            replies: replies.map((r) => ({
              agentName: r.agentName,
              structuredSignals: r.structuredSignals,
            })),
          });
          dayReportPath = result.savedPath;
          reportText = result.reportText ?? null;
          if (dayReportPath) {
            logger.info(`[Standup] Day Report saved to ${dayReportPath}`);
          }
        } catch (dayReportErr) {
          logger.warn(
            { err: dayReportErr },
            "[Standup] Day Report generation failed; continuing with summary only",
          );
        }

        // Token estimation (~4 chars per token) — logs and metrics only, not pushed to Discord
        const estimateTokens = (text: string) =>
          Math.ceil((text?.length ?? 0) / 4);
        let totalInputTokens = estimateTokens(kickoffText);
        for (let i = 0; i < replies.length; i++) {
          const priorLen =
            kickoffText.length +
            replies
              .slice(0, i)
              .reduce((s, r) => s + r.text.length + r.agentName.length + 5, 0);
          totalInputTokens += estimateTokens(
            Math.min(priorLen, 48000).toString().length > 0
              ? transcript.slice(0, priorLen)
              : transcript,
          );
        }
        const totalOutputTokens =
          replies.reduce((s, r) => s + estimateTokens(r.text), 0) + 1200; // Day Report cap (structured block first + short narrative)
        const totalEstimatedTokens = totalInputTokens + totalOutputTokens;
        const costPer1K = parseFloat(
          process.env.VINCE_USAGE_COST_PER_1K_TOKENS || "0.006",
        );
        const estimatedCost = (totalEstimatedTokens / 1000) * costPer1K;
        logger.info(
          `[Standup] Token estimate: ~${totalEstimatedTokens} tokens (~$${estimatedCost.toFixed(3)})`,
        );

        // Persist metrics to JSONL
        try {
          const metricsDir = path.join(
            process.cwd(),
            process.env.STANDUP_DELIVERABLES_DIR || "docs/standup",
          );
          if (!fs.existsSync(metricsDir))
            fs.mkdirSync(metricsDir, { recursive: true });
          const metricsLine = JSON.stringify({
            date: dateStr,
            type: "scheduled",
            agentCount: replies.length,
            totalEstimatedTokens,
            estimatedCost: parseFloat(estimatedCost.toFixed(4)),
            crossAgentLinks,
            actionItems: parsed.actionItems.length,
            lessons: Object.keys(parsed.lessonsByAgentName).length,
            disagreements: parsed.disagreements.length,
          });
          fs.appendFileSync(
            path.join(metricsDir, "standup-metrics.jsonl"),
            metricsLine + "\n",
          );
        } catch {
          /* non-fatal */
        }

        // Who did not report this round (participation visibility)
        const reportedNames = new Set(
          replies.map((r) => r.agentName.trim().toLowerCase()),
        );
        const noReportAgents = STANDUP_REPORT_ORDER.filter(
          (name) => !reportedNames.has(name.trim().toLowerCase()),
        );
        const noReportLine =
          noReportAgents.length > 0
            ? `\n\n*No report this round: ${noReportAgents.join(", ")}.*`
            : "";

        // Push one fluent message: Day Report (ALOHA-style) or short fallback; optional footer; optional participation line
        let messageToPush: string;
        if (reportText?.trim()) {
          const footer = dayReportPath
            ? `\n\n*Saved to \`${dayReportPath}\`*`
            : "";
          messageToPush = reportText.trim() + footer + noReportLine;
        } else {
          messageToPush =
            `Standup ${dateStr} completed; ${replies.length} agents reported. Day Report generation failed — see logs.` +
            noReportLine;
        }
        await pushStandupSummaryToChannels(rt, messageToPush);
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
      updateInterval: Number.isFinite(intervalMs)
        ? intervalMs
        : STANDUP_INTERVAL_MS,
    },
  });

  const ralphIntervalMs = getStandupRalphIntervalMs();
  await runtime.createTask({
    name: STANDUP_RALPH_LOOP_TASK_NAME,
    description:
      "Ralph loop: process next standup action item from file store (priority order).",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["queue", "repeat", "standup"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: ralphIntervalMs,
    },
  });

  const STANDUP_VALIDATE_PREDICTIONS = "STANDUP_VALIDATE_PREDICTIONS";
  runtime.registerTaskWorker({
    name: STANDUP_VALIDATE_PREDICTIONS,
    validate: async () => true,
    execute: async () => {
      if (process.env.STANDUP_ENABLED !== "true") return;
      try {
        const { validated, correct, incorrect } = await validatePredictions();
        if (validated > 0) {
          logger.info(
            `[Standup] Predictions validated: ${validated} (${correct} correct, ${incorrect} incorrect)`,
          );
        }
      } catch (e) {
        logger.warn(
          { err: e },
          "[Standup] Prediction validation failed (non-fatal)",
        );
      }
    },
  });
  const predictionsIntervalMs = 86400000; // 24h
  await runtime.createTask({
    name: STANDUP_VALIDATE_PREDICTIONS,
    description:
      "Validate expired Solus predictions vs actual price; update accuracy.",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["queue", "repeat", "standup", "predictions"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: predictionsIntervalMs,
    },
  });

  const scheduledHours = getStandupHours();
  const hoursStr = scheduledHours
    .map((h) => `${h.toString().padStart(2, "0")}:00`)
    .join(", ");
  logger.info(
    `[Standup] ✅ Task registered — scheduled at ${hoursStr} UTC (check every ${intervalMs / 60000} min). Set STANDUP_ENABLED=true to activate.`,
  );
}
