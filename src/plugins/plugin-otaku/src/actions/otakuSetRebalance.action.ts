/**
 * OTAKU_SET_REBALANCE - Set autonomous portfolio rules and scheduled rebalance check
 *
 * User defines target allocation (e.g. 60% stables, 30% ETH, 10% alts) and interval.
 * Creates a recurring task that reports drift; does not auto-execute swaps.
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import {
  registerOtakuRebalanceTaskWorker,
  getRebalanceRulesCacheKey,
  type RebalanceTargets,
  OTAKU_REBALANCE_TASK_NAME,
} from "../tasks/rebalance.tasks";

const DEFAULT_INTERVAL_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseTargets(text: string): RebalanceTargets | null {
  const lower = text.toLowerCase();
  const targets: RebalanceTargets = {};
  // e.g. "60% usdc 30% eth 10% other" or "60% stables 30% ETH 10% alts"
  const regex = /(\d+)\s*%\s*(\w+)/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const pct = parseInt(m[1], 10);
    const token = m[2].toUpperCase();
    const key =
      token === "STABLES" || token === "STABLE"
        ? "USDC"
        : token === "ALTS"
          ? "OTHER"
          : token;
    targets[key] = pct;
  }
  if (Object.keys(targets).length === 0) return null;
  const total = Object.values(targets).reduce((a, b) => a + b, 0);
  if (total > 100) return null;
  return targets;
}

function parseIntervalDays(text: string): number {
  const lower = text.toLowerCase();
  if (lower.includes("daily") || lower.includes("every day")) return 1;
  if (
    lower.includes("weekly") ||
    lower.includes("every week") ||
    lower.includes("week")
  )
    return 7;
  if (lower.includes("biweekly") || lower.includes("two week")) return 14;
  const match = text.match(/(\d+)\s*day/);
  if (match) return Math.max(1, parseInt(match[1], 10));
  return DEFAULT_INTERVAL_DAYS;
}

export const otakuSetRebalanceAction: Action = {
  name: "OTAKU_SET_REBALANCE",
  description:
    "Set portfolio rebalance rules and schedule (e.g. 60% stables 30% ETH 10% alts, weekly). Otaku will report drift on schedule; no auto-execution.",
  similes: [
    "SET_REBALANCE",
    "PORTFOLIO_RULES",
    "AUTO_REBALANCE",
    "REBALANCE_RULES",
  ],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Rebalance weekly: 60% stables 30% ETH 10% alts" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Rebalance rules set.** Target: USDC 60%, ETH 30%, OTHER 10%. I’ll check drift every 7 days and report; I won’t execute swaps unless you confirm.",
          actions: ["OTAKU_SET_REBALANCE"],
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("rebalance") ||
      (text.includes("portfolio") && text.includes("rule")) ||
      (text.includes("auto") && text.includes("rebalance")) ||
      (/\d+\s*%\s*\w+/.test(text) &&
        (text.includes("stables") || text.includes("eth")))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void | ActionResult> => {
    const text = message.content?.text ?? "";
    const roomId = message.roomId;
    if (!roomId) {
      await callback?.({
        text: "I need a room context to set rebalance rules.",
      });
      return { success: false, error: new Error("Missing roomId") };
    }

    const targets = parseTargets(text);
    if (!targets) {
      await callback?.({
        text: "I couldn’t parse target allocation. Example: “Rebalance weekly: 60% stables 30% ETH 10% alts” (percentages must sum to 100 or less).",
      });
      return { success: false, error: new Error("Could not parse targets") };
    }

    const intervalDays = parseIntervalDays(text);
    const updateIntervalMs = intervalDays * MS_PER_DAY;

    registerOtakuRebalanceTaskWorker(runtime);

    const cacheKey = getRebalanceRulesCacheKey(roomId);
    await runtime.setCache(cacheKey, { targets, intervalDays });

    const existingTasks = await runtime.getTasksByName(
      OTAKU_REBALANCE_TASK_NAME,
    );
    const roomTask = existingTasks.find((t) => t.roomId === roomId);
    if (roomTask?.id) {
      await runtime.updateTask(roomTask.id, {
        metadata: { targets, intervalDays, updatedAt: Date.now() },
      });
    } else {
      await runtime.createTask({
        name: OTAKU_REBALANCE_TASK_NAME,
        description: `Rebalance check every ${intervalDays} day(s): ${Object.entries(
          targets,
        )
          .map(([t, p]) => `${t} ${p}%`)
          .join(", ")}`,
        roomId,
        worldId: runtime.agentId!,
        tags: ["repeat", "rebalance"],
        metadata: {
          targets,
          intervalDays,
          updatedAt: Date.now(),
          updateInterval: updateIntervalMs,
        },
      });
    }

    const line =
      "**Rebalance rules set.** Target: " +
      Object.entries(targets)
        .map(([t, p]) => `${t} ${p}%`)
        .join(", ") +
      `. I’ll check drift every ${intervalDays} day(s) and report; I won’t execute swaps unless you confirm.`;
    await callback?.({ text: line });
    logger.info(
      `[OTAKU_SET_REBALANCE] Rules set for room ${roomId}: ${JSON.stringify(targets)}`,
    );
    return { success: true };
  },
};

export default otakuSetRebalanceAction;
