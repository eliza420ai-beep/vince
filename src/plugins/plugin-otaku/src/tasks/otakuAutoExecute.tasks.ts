/**
 * Otaku auto-execute check: when Vince signal cache has confidence >= threshold,
 * notify the user so they can execute. PRD: One Dream — Agent Synergy Phase 3 (#14).
 * Opt-in: OTAKU_AUTO_EXECUTE_ENABLED=true, OTAKU_AUTO_EXECUTE_MIN_CONFIDENCE=75 (default).
 */

import type { IAgentRuntime, Task, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { VINCE_SIGNAL_CACHE_KEY } from "../providers/vinceSignal.provider";
import { appendNotificationEvent } from "../lib/notificationEvents";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000" as UUID;
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 min
const DEFAULT_MIN_CONFIDENCE = 75;
const NOTIFIED_CACHE_KEY = "otaku:auto_execute:last_notified_at";

function getMinConfidence(): number {
  const raw = process.env.OTAKU_AUTO_EXECUTE_MIN_CONFIDENCE;
  if (raw === undefined || raw === "") return DEFAULT_MIN_CONFIDENCE;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : DEFAULT_MIN_CONFIDENCE;
}

function formatSignalSubtitle(raw: Record<string, unknown>): string {
  const action = String(raw.action ?? "").toLowerCase();
  if (action === "swap" && raw.sellToken && raw.buyToken && raw.amount) {
    return `${raw.amount} ${raw.sellToken} → ${raw.buyToken}${raw.chain ? ` on ${raw.chain}` : ""}`;
  }
  if (
    action === "bridge" &&
    raw.token &&
    raw.amount &&
    raw.fromChain &&
    raw.toChain
  ) {
    return `${raw.amount} ${raw.token}: ${raw.fromChain} → ${raw.toChain}`;
  }
  return action || "See Vince for details.";
}

export function registerOtakuAutoExecuteTask(runtime: IAgentRuntime): void {
  const enabled =
    process.env.OTAKU_AUTO_EXECUTE_ENABLED === "true" ||
    runtime.getSetting?.("otaku_auto_execute_enabled") === true;

  if (!enabled) {
    logger.debug(
      "[Otaku] OTAKU_AUTO_EXECUTE_CHECK disabled (OTAKU_AUTO_EXECUTE_ENABLED not true).",
    );
    return;
  }

  runtime.registerTaskWorker({
    name: "OTAKU_AUTO_EXECUTE_CHECK",
    validate: async () => true,
    execute: async (rt: IAgentRuntime, _options, task: Task) => {
      if (process.env.OTAKU_AUTO_EXECUTE_ENABLED !== "true") return;
      const minConf = getMinConfidence();
      try {
        const raw = await rt.getCache<Record<string, unknown>>(
          VINCE_SIGNAL_CACHE_KEY,
        );
        if (!raw || typeof raw !== "object" || !raw.action) return;
        const confidence =
          typeof raw.confidence === "number"
            ? raw.confidence
            : typeof raw.strength === "number"
              ? raw.strength
              : undefined;
        if (confidence === undefined || confidence < minConf) return;

        const lastNotified = await rt.getCache<number>(NOTIFIED_CACHE_KEY);
        const now = Date.now();
        if (
          typeof lastNotified === "number" &&
          now - lastNotified < CHECK_INTERVAL_MS
        ) {
          return;
        }

        const subtitle = formatSignalSubtitle(raw);
        await appendNotificationEvent(
          rt,
          {
            action: "vince_signal_ready",
            title: "Vince signal above threshold — execute when ready",
            subtitle,
            metadata: { confidence, minConfidence: minConf },
          },
          undefined,
        );
        await rt.setCache(NOTIFIED_CACHE_KEY, now);
        logger.debug(
          `[Otaku] Auto-execute notification sent (confidence ${confidence} >= ${minConf}).`,
        );
      } catch (e) {
        logger.debug("[Otaku] OTAKU_AUTO_EXECUTE_CHECK:", e);
      }
      if (task.id) {
        await rt.updateTask(task.id, {
          metadata: { ...task.metadata, updatedAt: Date.now() },
        });
      }
    },
  });

  const taskWorldId = (runtime.agentId ?? ZERO_UUID) as UUID;
  setImmediate(() => {
    runtime
      .createTask({
        name: "OTAKU_AUTO_EXECUTE_CHECK",
        description:
          "Notify when Vince signal in cache has confidence >= OTAKU_AUTO_EXECUTE_MIN_CONFIDENCE",
        roomId: taskWorldId,
        worldId: taskWorldId,
        tags: ["otaku", "vince", "auto_execute", "repeat"],
        metadata: {
          updateInterval: CHECK_INTERVAL_MS,
          updatedAt: Date.now(),
        },
      })
      .then(() =>
        logger.info(
          "[Otaku] Registered OTAKU_AUTO_EXECUTE_CHECK (15m). Set OTAKU_AUTO_EXECUTE_ENABLED=false to disable.",
        ),
      )
      .catch((e) =>
        logger.warn("[Otaku] createTask OTAKU_AUTO_EXECUTE_CHECK:", e),
      );
  });
}
