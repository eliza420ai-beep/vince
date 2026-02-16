/**
 * Plugin Inter-Agent — Multi-agent coordination for VINCE.
 *
 * Actions:
 * - ASK_AGENT: Ask another agent (Vince, Kelly, Solus, Sentinel, Eliza, Otaku) and relay the answer.
 * - STANDUP_FACILITATE: Kelly kicks off / wraps up standup; round-robin reports; Day Report + action items.
 * - DAILY_REPORT: On-demand daily report (standup-style synthesis).
 *
 * Standup (STANDUP_ENABLED=true): Kelly coordinates; turn order VINCE → Eliza → ECHO → Oracle → Solus → Otaku → Sentinel.
 * Day Report is generated from transcript (TL;DR, essential question, signals, WHAT/HOW/WHY/OWNER table).
 * Action items from the report are stored in docs/standup/action-items.json (or STANDUP_DELIVERABLES_DIR), prioritized by a planner,
 * and processed one-at-a-time by the Ralph loop (execute → verify → update status → append learnings).
 *
 * A2A Loop Guard: Symmetric agent-to-agent chat with loop prevention (A2A_LOOP_GUARD evaluator).
 * Set shouldIgnoreBotMessages: false on agents that should respond to other bots.
 */

import type { Plugin, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { askAgentAction } from "./actions/askAgent.action";
import { dailyReportAction } from "./actions/dailyReport.action";
import { standupFacilitatorAction } from "./actions/standupFacilitator.action";
import { a2aLoopGuardEvaluator } from "./evaluators";
import { a2aContextProvider } from "./providers";
import { isStandupCoordinator, registerStandupTask } from "./standup";
import { getStandupSessionTimeoutMs, isStandupKickoffRequest } from "./standup/standup.constants";

/** Standup channel name substrings (from env or default) */
function getStandupChannelParts(): string[] {
  return (process.env.A2A_STANDUP_CHANNEL_NAMES ?? "standup,daily-standup")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/** Standup facilitator agent name (lowercase) */
function getFacilitatorName(): string {
  return (
    process.env.A2A_STANDUP_SINGLE_RESPONDER?.trim() ||
    process.env.STANDUP_COORDINATOR_AGENT?.trim() ||
    "Kelly"
  ).toLowerCase();
}

/** Max retries for patching messageService (agents with many services start slowly). */
const PATCH_MESSAGE_SERVICE_MAX_RETRIES = 6;
/** Delays (ms) between retries: 5s, 10s, 20s, 30s, 45s, 60s. */
const PATCH_RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 30_000, 45_000, 60_000];

/**
 * Monkey-patch the runtime's messageService.handleMessage so non-facilitator
 * agents short-circuit BEFORE any DB access (createMemory / ensureAllAgentsInRoom).
 * This prevents PGLite deadlocks from 7+ agents all doing concurrent writes.
 *
 * The bootstrap's OtakuMessageService is loaded from an npm dist we can't edit,
 * so this wrapper intercepts at the JS object level.
 */
function patchMessageServiceForStandupSkip(runtime: any, attempt = 0): void {
  const myName = (runtime.character?.name ?? "").toLowerCase();
  const facilitator = getFacilitatorName();
  if (myName === facilitator) return; // Kelly must NOT be patched

  const svc = (runtime as any).messageService;
  if (!svc || typeof svc.handleMessage !== "function") {
    if (attempt < PATCH_MESSAGE_SERVICE_MAX_RETRIES) {
      const delayMs = PATCH_RETRY_DELAYS_MS[Math.min(attempt, PATCH_RETRY_DELAYS_MS.length - 1)];
      if (attempt === 0) {
        logger.warn("[ONE_TEAM] No messageService.handleMessage to patch for " + myName + " — will retry (messageService registers after services start)");
      }
      setTimeout(() => {
        try {
          patchMessageServiceForStandupSkip(runtime, attempt + 1);
        } catch {
          /* give up */
        }
      }, delayMs);
    }
    return;
  }

  // Idempotent: skip if already patched
  if ((svc.handleMessage as any).__standupPatched) {
    return;
  }

  const channelParts = getStandupChannelParts();

  // Cache roomId → isStandup so we don't call getRoom for every message
  const standupRoomCache = new Map<string, boolean>();

  const original = svc.handleMessage.bind(svc);
  svc.handleMessage = async function patchedHandleMessage(
    rt: any,
    message: any,
    callback?: any,
    options?: any,
  ) {
    const roomId = message?.roomId as string | undefined;
    if (roomId) {
      let isStandup = standupRoomCache.get(roomId);
      if (isStandup === undefined) {
        try {
          const room = await rt.getRoom(roomId);
          const roomNameLower = (room?.name ?? "").toLowerCase();
          isStandup = channelParts.some((p: string) => roomNameLower.includes(p));
        } catch {
          isStandup = false;
        }
        standupRoomCache.set(roomId, isStandup);
      }
      if (isStandup) {
        // Allow round-robin messages from the coordinator (source: "standup") — these
        // are sent via eliza.handleMessage and must reach the agent so it can reply.
        // Only block external (Discord) messages that would cause PGLite deadlocks.
        const msgSource = (message?.content?.source ?? "").toLowerCase();
        if (msgSource === "standup") {
          // Round-robin now uses direct useModel; this path is fallback only. Pass through.
          logger.info(
            `[ONE_TEAM] Standup passthrough: ${myName} processing coordinator round-robin message`,
          );
        } else {
          logger.info(
            `[ONE_TEAM] Standup skip: ${myName} dropping external message in standup room (only ${facilitator} processes external)`,
          );
          return {
            didRespond: false,
            responseContent: null,
            responseMessages: [],
            state: { values: {}, data: {}, text: "" },
            mode: "none",
          };
        }
      }
    }
    return original(rt, message, callback, options);
  };
  (svc.handleMessage as any).__standupPatched = true;

  logger.info(`[ONE_TEAM] Patched messageService for ${myName} — standup messages skip processing`);
}

export const interAgentPlugin: Plugin = {
  name: "plugin-inter-agent",
  description:
    "Multi-agent coordination: ASK_AGENT (ask any agent, relay answer), Kelly-facilitated standups with Day Report, action item backlog, and Ralph loop (execute → verify → learn). One team, one dream.",

  actions: [askAgentAction, dailyReportAction, standupFacilitatorAction],
  evaluators: [a2aLoopGuardEvaluator],
  providers: [a2aContextProvider],

  init: async (_config, runtime) => {
    const hasElizaOS = !!(runtime as { elizaOS?: unknown }).elizaOS;
    logger.info(
      { agent: runtime.character?.name, hasElizaOS },
      "[ONE_TEAM] elizaOS on runtime",
    );

    if (isStandupCoordinator(runtime)) {
      // Defer so runtime.db is available (plugin-sql registers it during init; we run after other plugins).
      setImmediate(() => {
        registerStandupTask(runtime).catch((err) => {
          logger.error({ err, agent: runtime.character?.name }, "[ONE_TEAM] registerStandupTask failed");
        });
      });
    }

    // Patch messageService for non-facilitator agents: skip standup room
    // messages entirely (prevents PGLite deadlock from 7+ concurrent writes).
    // Deferred 5s so MessageServiceInstaller has run (services start after init).
    // Internal retries with backoff (5s, 10s, 20s, …) handle slow starters like VINCE.
    const myNameLower = (runtime.character?.name ?? "").toLowerCase();
    if (myNameLower !== getFacilitatorName()) {
      setTimeout(() => {
        try {
          patchMessageServiceForStandupSkip(runtime, 0);
        } catch (err) {
          logger.debug({ err }, "[ONE_TEAM] patchMessageService failed");
        }
      }, 5000);
    } else {
      // Kelly (facilitator): wrap handleMessage so that standup-channel messages
      // get mentionContext.isMention = true. Without this, the core's shouldRespond
      // sends GROUP messages to LLM evaluation (which doesn't see A2A_CONTEXT and
      // returns IGNORE). With isMention the core skips LLM eval and responds directly.
      const channelParts = getStandupChannelParts();
      const standupRoomCacheKelly = new Map<string, boolean>();
      setTimeout(() => {
        const svc = (runtime as any).messageService;
        if (!svc || typeof svc.handleMessage !== "function") return;
        if ((svc.handleMessage as any).__kellyStandupPatched) return;
        const originalHM = svc.handleMessage.bind(svc);
        svc.handleMessage = async function kellyStandupWrapper(
          rt: any, message: any, callback?: any, options?: any,
        ) {
          // Check if this is a standup channel — if so, force isMention so shouldRespond returns true
          const roomId = message?.roomId as string | undefined;
          if (roomId) {
            let isStandup = standupRoomCacheKelly.get(roomId);
            if (isStandup === undefined) {
              try {
                const room = await rt.getRoom(roomId);
                const roomNameLower = (room?.name ?? "").toLowerCase();
                isStandup = channelParts.some((p: string) => roomNameLower.includes(p));
              } catch { isStandup = false; }
              standupRoomCacheKelly.set(roomId, isStandup);
            }
            if (isStandup) {
              // Inject isMention so core's shouldRespond returns { shouldRespond: true, skipEvaluation: true }
              if (!message.content) message.content = {};
              if (!message.content.mentionContext) message.content.mentionContext = {};
              message.content.mentionContext.isMention = true;
              const rawText = (message?.content?.text ?? "").trim();
              if (rawText && isStandupKickoffRequest(rawText)) {
                // Replace user text with a direct imperative so the LLM doesn't reason about "weekend" / "18th request" and output REPLY
                (message.content as any)._originalStandupText = rawText;
                message.content.text = "Run the daily standup now. Use only action STANDUP_FACILITATE. Do not use REPLY.";
                logger.info(`[KELLY_STANDUP] Standup kickoff: overriding message text so LLM outputs STANDUP_FACILITATE`);
              } else {
                logger.info(`[KELLY_STANDUP] Injected isMention for standup message: "${rawText.slice(0, 50)}"`);
              }
            }
          }
          const t0 = Date.now();
          // Standup flow = kickoff + round-robin (8 agents × up to 90s) + Day Report; 120s was killing it
          const timeoutMs = roomId && standupRoomCacheKelly.get(roomId)
            ? getStandupSessionTimeoutMs()
            : 120_000;
          try {
            const result = await Promise.race([
              originalHM(rt, message, callback, options),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Kelly handleMessage timeout (${timeoutMs / 1000}s)`)), timeoutMs),
              ),
            ]);
            logger.info(`[KELLY_STANDUP] handleMessage DONE in ${Date.now() - t0}ms`);
            return result;
          } catch (err: any) {
            logger.error(`[KELLY_STANDUP] handleMessage FAILED after ${Date.now() - t0}ms: ${err?.message ?? err}`);
            return {
              didRespond: false,
              responseContent: null,
              responseMessages: [],
              state: { values: {}, data: {}, text: "" },
              mode: "none",
            };
          }
        };
        (svc.handleMessage as any).__kellyStandupPatched = true;
        logger.info("[ONE_TEAM] Kelly: standup isMention injection + timeout (standup=session, else 120s) active");
      }, 5000);
    }
  },
};

export { askAgentAction } from "./actions/askAgent.action";
export { getElizaOS } from "./types";
export type { ElizaOSAgentInfo, IElizaOSRegistry } from "./types";
