/**
 * ASK_AGENT — Ask another agent a question and report their answer back.
 * Used when the user wants another agent's input (e.g. "ask Vince about …", "what would Solus say?").
 */

import type {
  Action,
  ActionResult,
  Entity,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { getElizaOS } from "../types";

const DEFAULT_ALLOWED_AGENT_NAMES = [
  "Vince",
  "Kelly",
  "Solus",
  "Sentinel",
  "Eliza",
  "Otaku",
] as const;

/** Get allowed A2A targets from character settings or fallback to defaults. */
function getAllowedTargets(runtime: IAgentRuntime): readonly string[] {
  const settings = runtime.character?.settings as Record<string, unknown> | undefined;
  const interAgent = settings?.interAgent as { allowedTargets?: string[] } | undefined;
  const fromSettings = interAgent?.allowedTargets;
  if (Array.isArray(fromSettings) && fromSettings.length > 0) {
    return fromSettings.map((s) => String(s).trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_AGENT_NAMES;
}

/** Normalize agent name for policy matching (trim, lowercase). */
function normName(name: string): string {
  return (name ?? "").trim().toLowerCase();
}

/**
 * Check if source is allowed to ask target by optional policy (settings.interAgent.allow).
 * If allow is missing or empty, returns true (no policy = allow). Otherwise matches rules with * = any.
 */
function isAllowedByPolicy(
  runtime: IAgentRuntime,
  sourceName: string,
  targetName: string,
): boolean {
  const settings = runtime.character?.settings as Record<string, unknown> | undefined;
  const interAgent = settings?.interAgent as { allow?: Array<{ source?: string; target?: string }> } | undefined;
  const allow = interAgent?.allow;
  if (!Array.isArray(allow) || allow.length === 0) return true;
  const sourceNorm = normName(sourceName);
  const targetNorm = normName(targetName);
  for (const rule of allow) {
    const s = (rule?.source ?? "*").trim().toLowerCase();
    const t = (rule?.target ?? "*").trim().toLowerCase();
    const sourceMatch = s === "*" || normName(s) === sourceNorm;
    const targetMatch = t === "*" || normName(t) === targetNorm;
    if (sourceMatch && targetMatch) return true;
  }
  return false;
}

const POLL_INTERVAL_MS = 1800;
const JOB_TIMEOUT_MS = 90_000;  // Allow slow agents (e.g. ASK_AGENT → Vince) up to 90s
const POLL_MAX_WAIT_MS = 100_000; // Poll long enough for job to complete

function getBaseUrl(): string {
  const url =
    process.env.ELIZAOS_SERVER_URL ||
    process.env.SERVER_URL ||
    `http://localhost:${process.env.SERVER_PORT || "3000"}`;
  return url.replace(/\/$/, "");
}

function getAuthHeaders(): Record<string, string> {
  const key =
    process.env.ELIZAOS_API_KEY ||
    process.env.SERVER_API_KEY ||
    "";
  if (!key) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
}

interface AgentListItem {
  id: string;
  agentId?: string;
  name?: string;
  characterName?: string;
  character?: { name?: string };
  status?: string;
}

/** Get agents list in-process when elizaOS is available (avoids HTTP /api/agents). */
function getAgentsInProcess(runtime: IAgentRuntime): AgentListItem[] | null {
  const eliza = getElizaOS(runtime);
  if (!eliza?.getAgents) return null;
  const runtimes = eliza.getAgents();
  return runtimes.map((r) => ({
    id: r.agentId,
    name: r.character?.name ?? "",
    characterName: r.character?.name ?? "",
  }));
}

/** Resolve target agent by name in-process (avoids HTTP). */
function resolveTargetInProcess(
  runtime: IAgentRuntime,
  targetName: string
): { id: string } | null {
  const eliza = getElizaOS(runtime);
  if (!eliza?.getAgentByName) return null;
  const target = eliza.getAgentByName(targetName);
  if (!target?.agentId) return null;
  return { id: target.agentId };
}

async function fetchAgents(baseUrl: string): Promise<AgentListItem[]> {
  const res = await fetch(`${baseUrl}/api/agents`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to list agents: ${res.status}`);
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const data = raw.data as Record<string, unknown> | unknown[] | undefined;
  const direct = raw.agents;
  const nested = data && typeof data === "object" && !Array.isArray(data) && (data.agents as AgentListItem[] | undefined);
  const dataAsArray = Array.isArray(data) ? data : undefined;
  const list = (direct ?? nested ?? dataAsArray) as AgentListItem[] | undefined;
  const out = Array.isArray(list) ? list : [];
  if (out.length === 0 && (direct ?? nested ?? dataAsArray) === undefined) {
    const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data) : [];
    logger.debug(`[ASK_AGENT] fetchAgents: response shape had no agents (hasData=${!!data}, keys=${JSON.stringify(keys)})`);
  }
  return out;
}

function getAgentDisplayName(a: AgentListItem): string {
  return (a.name ?? a.characterName ?? a.character?.name ?? "").trim();
}

function getAgentId(a: AgentListItem): string {
  return (a.id ?? a.agentId ?? "").trim();
}

/** Poll target room for latest assistant reply created after sentAt.
 * Uses targetRuntime when provided so we see the target agent's messages; otherwise falls back to caller runtime. */
async function pollForTargetReply(
  runtime: IAgentRuntime,
  roomId: string,
  targetAgentId: string,
  sentAt: number,
  timeoutMs: number,
  pollIntervalMs: number = 500,
  targetRuntime: IAgentRuntime | null = null
): Promise<string | null> {
  const fetchRuntime = targetRuntime ?? runtime;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const memories = await fetchRuntime.getMemories({
      tableName: "messages",
      roomId: roomId as import("@elizaos/core").UUID,
      count: 15,
    });
    const fromTarget = memories.filter(
      (m) =>
        m.entityId === targetAgentId &&
        (m.createdAt ?? 0) > sentAt &&
        typeof m.content?.text === "string" &&
        (m.content.text as string).trim().length > 0
    );
    if (fromTarget.length > 0) {
      const latest = fromTarget.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
      return (latest.content?.text as string).trim();
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return null;
}

/** Extract reply text from handleMessage result (sync mode). */
function extractReplyFromHandleMessageResult(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const processing = r.processing as Record<string, unknown> | undefined;
  if (!processing) return null;
  const responseContent = processing.responseContent as Record<string, unknown> | undefined;
  if (responseContent) {
    let text = responseContent.text;
    if (typeof text === "string" && text.trim()) return text.trim();
    text = responseContent.message;
    if (typeof text === "string" && text.trim()) return text.trim();
    const actions = responseContent.actions as string[] | undefined;
    if (Array.isArray(actions) && actions.includes("REPLY") && typeof responseContent.thought === "string" && responseContent.thought.trim()) {
      return responseContent.thought.trim();
    }
    const actionCallbacks = responseContent.actionCallbacks;
    if (actionCallbacks != null) {
      const last = Array.isArray(actionCallbacks) ? actionCallbacks[actionCallbacks.length - 1] : actionCallbacks;
      const lastObj = last && typeof last === "object" ? (last as Record<string, unknown>) : null;
      const t = lastObj?.text ?? lastObj?.message;
      if (typeof t === "string" && t.trim()) return t.trim();
    }
  }
  const responseMessages = processing.responseMessages as Array<{ content?: { text?: string; message?: string } }> | undefined;
  if (Array.isArray(responseMessages) && responseMessages.length > 0) {
    const lastMsg = responseMessages[responseMessages.length - 1];
    const t = lastMsg?.content?.text ?? lastMsg?.content?.message;
    if (typeof t === "string" && t.trim()) return t.trim();
  }
  return null;
}

function resolveAgentByName(
  agents: AgentListItem[],
  name: string
): AgentListItem | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  return (
    agents.find((a) => {
      const displayName = getAgentDisplayName(a);
      return displayName && displayName.toLowerCase() === normalized;
    }) ?? null
  );
}

function wantsToAskAnotherAgent(text: string): boolean {
  const lower = text.toLowerCase();
  const patterns = [
    /\bask\s+(vince|kelly|solus|sentinel|eliza|otaku)\b/i,
    /\bwhat would (vince|kelly|solus|sentinel|eliza|otaku) say\b/i,
    /\bping (vince|kelly|solus|sentinel|eliza|otaku)\b/i,
    /\b(vince|kelly|solus|sentinel|eliza|otaku),?\s+(thoughts|what do you think|opinion)\b/i,
    /\bget (vince|kelly|solus|sentinel|eliza|otaku)('s)?\s+(take|view|answer)\b/i,
    /\bhave (vince|kelly|solus|sentinel|eliza|otaku)\s+(answer|respond)\b/i,
    /\b(ask|tell)\s+(vince|kelly|solus|sentinel|eliza|otaku)\s+(that|this|about)\b/i,
  ];
  return patterns.some((p) => p.test(lower));
}

function extractTargetAndQuestion(
  text: string,
  currentAgentName: string
): { targetName: string; question: string } | null {
  const lower = text.toLowerCase();
  for (const name of DEFAULT_ALLOWED_AGENT_NAMES) {
    if (name.toLowerCase() === currentAgentName.toLowerCase()) continue;
    const nameLower = name.toLowerCase();
    const askMatch = new RegExp(
      `ask\\s+${nameLower}\\s*(?:about|that)?\\s*[:.]?\\s*(.+)`,
      "is"
    ).exec(lower);
    if (askMatch) {
      return { targetName: name, question: askMatch[1].trim() };
    }
    const whatWouldMatch = new RegExp(
      `what would ${nameLower} say (?:about)?\\s*[:.]?\\s*(.+)`,
      "is"
    ).exec(lower);
    if (whatWouldMatch) {
      return { targetName: name, question: whatWouldMatch[1].trim() };
    }
    const pingMatch = new RegExp(
      `ping\\s+${nameLower}\\s*[:.]?\\s*(.+)`,
      "is"
    ).exec(lower);
    if (pingMatch) {
      return { targetName: name, question: pingMatch[1].trim() };
    }
  }
  const askGeneric = /ask\s+(vince|kelly|solus|sentinel|eliza|otaku)\s+(.+)/i.exec(
    text
  );
  if (askGeneric) {
    const targetName =
      askGeneric[1].charAt(0).toUpperCase() + askGeneric[1].slice(1).toLowerCase();
    return { targetName, question: askGeneric[2].trim() };
  }
  return null;
}

export const askAgentAction: Action = {
  name: "ASK_AGENT",
  similes: ["ASK_TEAMMATE", "PING_AGENT", "RELAY_TO_AGENT", "GET_AGENT_RESPONSE"],
  description:
    "Ask another agent a question and report their answer back. Use when the user wants another agent's input (e.g. 'ask Vince about …', 'what would Solus say?').",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").trim();
    if (!text) return false;
    if (wantsToAskAnotherAgent(text)) return true;
    const stateText = (state?.values?.actionResult as { text?: string } | undefined)?.text ?? state?.text ?? "";
    if (typeof stateText === "string" && wantsToAskAnotherAgent(stateText))
      return true;
    return false;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: unknown,
    callback: HandlerCallback
  ): Promise<ActionResult | void> => {
    const fromName = runtime.character?.name ?? "I";
    const userText = (message.content?.text ?? "").trim();

    const parsed = extractTargetAndQuestion(userText, fromName);
    let targetName: string;
    let question: string;

    if (parsed) {
      targetName = parsed.targetName;
      question = parsed.question || userText;
    } else {
      const stateText =
        (state?.values?.actionResult as { text?: string })?.text ??
        (typeof state?.text === "string" ? state.text : "");
      const fromState = stateText && extractTargetAndQuestion(stateText, fromName);
      if (fromState) {
        targetName = fromState.targetName;
        question = fromState.question || userText;
      } else {
        await callback({
          text: "I didn't catch which agent you want to ask or what to ask. Try: \"Ask Vince about Bitcoin\" or \"What would Solus say about that?\"",
          actions: ["ASK_AGENT"],
        });
        return { success: false };
      }
    }

    if (targetName.toLowerCase() === fromName.toLowerCase()) {
      await callback({
        text: "That's me—I'll answer directly. If you had something specific in mind, ask and I'll give you my take.",
        actions: ["ASK_AGENT"],
      });
      return { success: true };
    }

    const allowedTargets = getAllowedTargets(runtime);
    const targetAllowed = allowedTargets.some(
      (a) => a.toLowerCase().trim() === targetName.toLowerCase().trim()
    );
    if (!targetAllowed) {
      await callback({
        text: `I'm not allowed to ask ${targetName}. I can only ask: ${allowedTargets.join(", ")}.`,
        actions: ["ASK_AGENT"],
      });
      return { success: false };
    }
    const settings = runtime.character?.settings as Record<string, unknown> | undefined;
    const interAgent = settings?.interAgent as { allow?: Array<{ source?: string; target?: string }> } | undefined;
    const hasAllowPolicy = Array.isArray(interAgent?.allow) && interAgent.allow.length > 0;
    if (hasAllowPolicy && !isAllowedByPolicy(runtime, fromName, targetName)) {
      await callback({
        text: `I'm not allowed to ask ${targetName} (policy).`,
        actions: ["ASK_AGENT"],
      });
      return { success: false };
    }

    const baseUrl = getBaseUrl();
    const headers = getAuthHeaders();

    try {
      // Prefer in-process resolution so we don't depend on HTTP /api/agents response shape
      let target: AgentListItem | { id: string } | null = resolveTargetInProcess(runtime, targetName);
      const agentsInProcess = getAgentsInProcess(runtime);
      const agentsList = agentsInProcess ?? (await fetchAgents(baseUrl));
      if (!target) {
        if (!getElizaOS(runtime)) {
          logger.debug("[ASK_AGENT] runtime.elizaOS not set; in-process resolution skipped");
        }
        if (agentsList.length === 0 && !agentsInProcess) {
          logger.debug("[ASK_AGENT] HTTP /api/agents returned no agents");
        }
        target = resolveAgentByName(agentsList, targetName);
      }

      if (!target) {
        const names =
          agentsList.length > 0
            ? agentsList.map((a) => getAgentDisplayName(a)).filter(Boolean).join(", ")
            : null;
        const message = names
          ? `I couldn't find an agent named "${targetName}". Our agents are: ${names}.`
          : `I couldn't find an agent named "${targetName}". The server didn't return a list of agents—make sure all agents are started and the server is running, then try again.`;
        await callback({
          text: message,
          actions: ["ASK_AGENT"],
        });
        return { success: false };
      }

      const targetAgentId = getAgentId(target as AgentListItem) || (target as { id: string }).id;
      const content = `[To ${targetName} — you are being asked. Answer directly as yourself.][From ${fromName}, on behalf of the user]: ${question}`;

      // When elizaOS is available, try in-process: sync first, then async, then optional direct messageService.
      const eliza = getElizaOS(runtime);
      if (eliza?.handleMessage) {
        logger.debug("[ASK_AGENT] Using in-process path for " + targetName);
        const sentAt = Date.now();
        const userMsg = {
          id: message.id ?? crypto.randomUUID(),
          entityId: message.entityId,
          roomId: message.roomId,
          content: { text: content, source: message.content?.source ?? "ask_agent" },
          createdAt: message.createdAt ?? Date.now(),
        };
        // Ensure entities exist in the target's room so core formatMessages can resolve
        // entityIds and avoid "No entity found for message" warnings.
        if (eliza.getAgent) {
          const targetRuntime = eliza.getAgent(targetAgentId) as IAgentRuntime | undefined;
          if (targetRuntime?.ensureConnection) {
            const worldId = (message as { worldId?: string }).worldId ?? message.roomId;
            const source = message.content?.source ?? "ask_agent";
            const ensureOne = async (entityId: string, name: string, userName?: string) => {
              try {
                const tr = targetRuntime as unknown as { getEntityById?: (id: import("@elizaos/core").UUID) => Promise<Entity | null>; createEntity?: (e: Entity) => Promise<boolean> };
                const existing = tr.getEntityById ? await tr.getEntityById(entityId as import("@elizaos/core").UUID) : null;
                if (!existing && typeof tr.createEntity === "function") {
                  await tr.createEntity({
                    id: entityId as import("@elizaos/core").UUID,
                    names: [name],
                    agentId: targetRuntime.agentId,
                    metadata: {},
                  });
                }
                await targetRuntime!.ensureConnection!({
                  entityId: entityId as import("@elizaos/core").UUID,
                  roomId: message.roomId,
                  worldId: worldId as import("@elizaos/core").UUID,
                  source,
                  channelId: message.roomId,
                  name,
                  userName: userName ?? name,
                });
              } catch (err) {
                logger.debug(`[ASK_AGENT] ensureConnection entityId=${entityId} name=${name}`, String(err));
              }
            };
            await ensureOne(runtime.agentId, fromName);
            const userName =
              (await runtime.getEntityById?.(message.entityId as import("@elizaos/core").UUID))?.names?.[0] ??
              "User";
            await ensureOne(message.entityId as string, userName);
            await ensureOne(targetAgentId, targetName);
            // Ensure all other in-process agents so messages from them in this room resolve (avoids "No entity found for message").
            const agentsInProcess = getAgentsInProcess(runtime);
            if (agentsInProcess) {
              for (const a of agentsInProcess) {
                const aid = getAgentId(a);
                if (aid && aid !== message.entityId && aid !== runtime.agentId && aid !== targetAgentId) {
                  await ensureOne(aid, getAgentDisplayName(a) || aid);
                }
              }
            }
          }
        }
        const IN_PROCESS_TIMEOUT_MS = 95_000; // Slightly above JOB_TIMEOUT_MS so we prefer in-process
        let reply: string | null = null;

        // Try async first: core calls onResponse when the REPLY action runs (processActions callback).
        try {
          let settleReason: "reply" | "timeout" | "onComplete" | "error" = "onComplete";
          reply = await new Promise<string | null>((resolve, reject) => {
            let settled = false;
            const timeoutId = setTimeout(() => {
              if (settled) return;
              settled = true;
              settleReason = "timeout";
              resolve(null);
            }, IN_PROCESS_TIMEOUT_MS);
            const settle = (value: string | null, reason: typeof settleReason = "reply") => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              settleReason = value ? "reply" : reason;
              resolve(value);
            };
            // Per docs.elizaos.ai/runtime/core#async-mode-with-callbacks: onResponse(content) gets the reply.
            // Core calls onComplete when messageService.handleMessage promise resolves, which can be before
            // the REPLY action invokes the callback with the final text. So we only settle on reply or timeout,
            // not on onComplete — otherwise we'd treat "no reply" and then miss a late callback with the real reply.
            const opts = {
              onResponse: (resp: unknown) => {
                const c = resp as { text?: string; message?: string; thought?: string; actions?: string[]; actionCallbacks?: unknown[]; [k: string]: unknown };
                let text = typeof c?.text === "string" ? c.text : typeof c?.message === "string" ? c.message : "";
                if (!text.trim() && c?.thought && Array.isArray(c?.actions) && c.actions.some((a: string) => a === "REPLY")) {
                  text = String(c.thought);
                }
                if (!text.trim() && Array.isArray(c?.actionCallbacks) && c.actionCallbacks.length > 0) {
                  const last = c.actionCallbacks[c.actionCallbacks.length - 1] as { text?: string } | undefined;
                  if (typeof last?.text === "string" && last.text.trim()) text = last.text;
                }
                const hasText = text.trim().length > 0;
                const preview = hasText ? text.slice(0, 80) + (text.length > 80 ? "..." : "") : "none";
                logger.debug(`[ASK_AGENT] onResponse called hasText=${hasText} textLength=${text.length} textPreview=${preview}`);
                if (!hasText) {
                  const keys = resp && typeof resp === "object" ? Object.keys(resp) : [];
                  const thoughtPrev = typeof c?.thought === "string" ? c.thought.slice(0, 60) + (c.thought.length > 60 ? "..." : "") : "none";
                  logger.debug(`[ASK_AGENT] onResponse empty content keys=${JSON.stringify(keys)} actions=${JSON.stringify(c?.actions)} thoughtPreview=${thoughtPrev}`);
                }
                if (hasText) settle(text.trim());
              },
              onComplete: () => {
                logger.debug("[ASK_AGENT] onComplete called (not settling — wait for onResponse with text or timeout)");
              },
              onError: (err: Error) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                settleReason = "error";
                reject(err);
              },
            };
            eliza.handleMessage(targetAgentId, userMsg, opts).catch((err) => {
              if (!settled) {
                settled = true;
                clearTimeout(timeoutId);
                settleReason = "error";
                reject(err);
              }
            });
          });
          if (reply) {
            await callback({
              text: `**${targetName} says:** ${reply}`,
              actions: ["ASK_AGENT"],
            });
            return { success: true };
          }
          logger.debug(`[ASK_AGENT] In-process async did not deliver reply (reason: ${settleReason})`);
        } catch (asyncErr) {
          logger.debug(`[ASK_AGENT] Async handleMessage failed: ${String(asyncErr)}`);
        }

        // Fallback: sync (return value may contain processing.responseContent.actionCallbacks).
        // Wrap in timeout so a stuck target cannot block the handler indefinitely.
        if (!reply) {
          try {
            const timeoutPromise = new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), IN_PROCESS_TIMEOUT_MS)
            );
            const syncResult = await Promise.race([
              eliza.handleMessage(targetAgentId, userMsg),
              timeoutPromise,
            ]);
            reply = syncResult != null ? extractReplyFromHandleMessageResult(syncResult) : null;
            if (reply) {
              await callback({
                text: `**${targetName} says:** ${reply}`,
                actions: ["ASK_AGENT"],
              });
              return { success: true };
            }
          } catch (syncErr) {
            logger.debug(`[ASK_AGENT] Sync handleMessage threw: ${String(syncErr)}`);
          }
        }

        // Fallback: direct messageService on target runtime.
        if (!reply && eliza.getAgent) {
          const targetRuntime = eliza.getAgent(targetAgentId) as (IAgentRuntime & { messageService?: { handleMessage(runtime: IAgentRuntime, msg: unknown, callback: (content: unknown) => void, options?: unknown): Promise<unknown> } }) | undefined;
          if (targetRuntime?.messageService?.handleMessage) {
            try {
              reply = await new Promise<string | null>((resolve, reject) => {
                let settled = false;
                const timeoutId = setTimeout(() => {
                  if (settled) return;
                  settled = true;
                  resolve(null);
                }, IN_PROCESS_TIMEOUT_MS);
                const cb = (c: unknown) => {
                  const content = c as { text?: string; message?: string; thought?: string; actions?: string[] };
                  let text = typeof content?.text === "string" ? content.text : typeof content?.message === "string" ? content.message : "";
                  if (!text.trim() && content?.thought && Array.isArray(content?.actions) && content.actions.includes("REPLY")) {
                    text = content.thought;
                  }
                  if (typeof text === "string" && text.trim() && !settled) {
                    settled = true;
                    clearTimeout(timeoutId);
                    resolve(text.trim());
                  }
                };
                targetRuntime.messageService.handleMessage(targetRuntime, userMsg, cb, undefined).then(() => {
                  if (!settled) {
                    settled = true;
                    clearTimeout(timeoutId);
                    resolve(null);
                  }
                }).catch((err) => {
                  if (!settled) {
                    settled = true;
                    clearTimeout(timeoutId);
                    reject(err);
                  }
                });
              });
              if (reply) {
                await callback({
                  text: `**${targetName} says:** ${reply}`,
                  actions: ["ASK_AGENT"],
                });
                return { success: true };
              }
            } catch (directErr) {
              logger.debug(`[ASK_AGENT] Direct messageService fallback failed: ${String(directErr)}`);
            }
          }
        }

        // Fallback: poll target room for new assistant message (avoids callback ordering issues).
        if (!reply) {
          try {
            const POLL_TIMEOUT_MS = 30_000; // Allow slow agents (embeddings, RAG) up to 30s
            const tr = eliza.getAgent?.(targetAgentId) as IAgentRuntime | undefined;
            logger.debug(`[ASK_AGENT] Polling target room for reply roomId=${message.roomId} targetAgentId=${targetAgentId} timeoutMs=${POLL_TIMEOUT_MS} hasTargetRuntime=${!!tr}`);
            reply = await pollForTargetReply(
              runtime,
              message.roomId,
              targetAgentId,
              sentAt,
              POLL_TIMEOUT_MS,
              500,
              tr ?? null
            );
            if (reply) {
              logger.debug("[ASK_AGENT] Polling found reply");
              await callback({
                text: `**${targetName} says:** ${reply}`,
                actions: ["ASK_AGENT"],
              });
              return { success: true };
            }
            logger.debug("[ASK_AGENT] Polling timed out without reply");
          } catch (pollErr) {
            logger.debug(`[ASK_AGENT] Polling fallback failed: ${String(pollErr)}`);
          }
        }

        if (!reply) {
          logger.debug("[ASK_AGENT] In-process path did not deliver reply, falling back to job API");
        }
      } else {
        logger.debug("[ASK_AGENT] Using job API (no elizaOS)");
      }

      // Job API: server must emit new_message with channel_id = job channel and author_id = agent id when the agent replies (see plugin README).
      const createRes = await fetch(`${baseUrl}/api/messaging/jobs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          agentId: targetAgentId,
          userId: message.entityId,
          content,
          timeoutMs: JOB_TIMEOUT_MS,
          metadata: { fromAgent: fromName, fromAgentId: runtime.agentId },
        }),
      });

      if (!createRes.ok) {
        const errBody = await createRes.text();
        logger.warn(`[ASK_AGENT] Job create failed: ${createRes.status} ${errBody}`);
        await callback({
          text: `${targetName} couldn't be reached right now (server ${createRes.status}). Try again in a moment or ask them directly.`,
          actions: ["ASK_AGENT"],
        });
        return { success: false };
      }

      const createData = (await createRes.json()) as { jobId?: string };
      const jobId = createData.jobId;
      if (!jobId) {
        await callback({
          text: `${targetName} didn't return a job id. Please try again.`,
          actions: ["ASK_AGENT"],
        });
        return { success: false };
      }

      const start = Date.now();
      let last: { status: string; result?: { message?: { content?: string } }; error?: string } =
        { status: "pending" };

      while (Date.now() - start < POLL_MAX_WAIT_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const getRes = await fetch(`${baseUrl}/api/messaging/jobs/${jobId}`, {
          headers: getAuthHeaders(),
        });
        if (!getRes.ok) {
          logger.warn(`[ASK_AGENT] Job get failed: ${getRes.status}`);
          continue;
        }
        last = (await getRes.json()) as typeof last;
        if (
          last.status === "completed" ||
          last.status === "failed" ||
          last.status === "timeout"
        ) {
          break;
        }
      }

      // Intentionally treat completed with missing/empty content as no reply (fall through to "didn't respond in time").
      if (last.status === "completed" && last.result?.message?.content) {
        const reply = last.result.message.content;
        await callback({
          text: `**${targetName} says:** ${reply}`,
          actions: ["ASK_AGENT"],
        });
        return { success: true };
      }

      if (last.status === "timeout") {
        await callback({
          text: `${targetName} didn't respond in time. You can try asking them directly.`,
          actions: ["ASK_AGENT"],
        });
        return { success: false };
      }

      if (last.status === "failed" && last.error) {
        await callback({
          text: `${targetName} ran into an issue: ${last.error}. You can try asking them directly.`,
          actions: ["ASK_AGENT"],
        });
        return { success: false };
      }

      await callback({
        text: `${targetName} didn't respond in time. You can try asking them directly.`,
        actions: ["ASK_AGENT"],
      });
      return { success: false };
    } catch (err) {
      logger.error("[ASK_AGENT] Error:", err);
      await callback({
        text: `Something went wrong asking ${targetName}. Check that the server is running at ${baseUrl} and try again, or ask them directly.`,
        actions: ["ASK_AGENT"],
      });
      return { success: false };
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Ask Vince what he thinks about Bitcoin." },
      },
      {
        name: "Kelly",
        content: {
          text: "**Vince says:** [Vince's reply about Bitcoin would appear here.]",
          actions: ["ASK_AGENT"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "What would Solus say about that trade?" },
      },
      {
        name: "Vince",
        content: {
          text: "**Solus says:** [Solus's reply would appear here.]",
          actions: ["ASK_AGENT"],
        },
      },
    ],
  ],
};
