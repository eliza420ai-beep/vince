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
 * Action items from the report are stored in standup-deliverables/action-items.json, prioritized by a planner,
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
import { getStandupSessionTimeoutMs } from "./standup/standup.constants";

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

/**
 * Monkey-patch the runtime's messageService.handleMessage so non-facilitator
 * agents short-circuit BEFORE any DB access (createMemory / ensureAllAgentsInRoom).
 * This prevents PGLite deadlocks from 7+ agents all doing concurrent writes.
 *
 * The bootstrap's OtakuMessageService is loaded from an npm dist we can't edit,
 * so this wrapper intercepts at the JS object level.
 */
function patchMessageServiceForStandupSkip(runtime: any): void {
  const myName = (runtime.character?.name ?? "").toLowerCase();
  const facilitator = getFacilitatorName();
  if (myName === facilitator) return; // Kelly must NOT be patched

  const svc = (runtime as any).messageService;
  if (!svc || typeof svc.handleMessage !== "function") {
    logger.warn("[ONE_TEAM] No messageService.handleMessage to patch for " + myName + " — will retry");
    // Retry after 5s (messageService may not be registered yet)
    setTimeout(() => {
      try { patchMessageServiceForStandupSkip(runtime); } catch { /* give up */ }
    }, 5000);
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
        logger.info(
          `[ONE_TEAM] Standup skip: ${myName} dropping message in standup room (only ${facilitator} processes)`,
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
    // For Kelly (facilitator): add timing logs so we can see where processing hangs.
    // Deferred 5s so messageService has been registered by bootstrap.
    // Second attempt at 15s catches late-initializing agents (e.g. VINCE with heavy service init).
    const myNameLower = (runtime.character?.name ?? "").toLowerCase();
    if (myNameLower !== getFacilitatorName()) {
      const doPatch = () => {
        try {
          patchMessageServiceForStandupSkip(runtime);
        } catch (err) {
          logger.debug({ err }, "[ONE_TEAM] patchMessageService failed");
        }
      };
      setTimeout(doPatch, 5000);
      setTimeout(doPatch, 15000); // safety retry
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
              logger.info(`[KELLY_STANDUP] Injected isMention for standup message: "${(message?.content?.text ?? "").slice(0, 50)}"`);
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
