/**
 * Polymarket desk recurring schedule.
 * Oracle runs all desk tasks: analyst (hourly edge), risk (15m snapshot), performance (4h report).
 */

import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000" as UUID;
const ANALYST_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const RISK_INTERVAL_MS = 15 * 60 * 1000; // 15 min
const PERF_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

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

export function registerDeskSchedule(runtime: IAgentRuntime): void {
  const name = runtime.character?.name ?? "";
  if (name !== "Oracle") return;

  const taskWorldId = runtime.agentId ?? ZERO_UUID;

  // --- Analyst: hourly edge check (Synth vs market) ---
  runtime.registerTaskWorker({
    name: "POLYMARKET_ANALYST_HOURLY",
    execute: async (rt, _options, task) => {
      if (process.env.POLYMARKET_DESK_SCHEDULE_ENABLED === "false") return;
      const conditionId =
        process.env.POLYMARKET_DESK_DEFAULT_CONDITION_ID?.trim() || "";
      if (!conditionId) {
        logger.debug(
          "[PolymarketDesk] POLYMARKET_DESK_DEFAULT_CONDITION_ID not set; skip analyst run.",
        );
        if (task.id)
          await rt.updateTask(task.id, {
            metadata: { ...task.metadata, updatedAt: Date.now() },
          });
        return;
      }
      const action = rt.actions?.find(
        (a) => a.name === "POLYMARKET_EDGE_CHECK",
      );
      if (action?.handler) {
        await (action.handler as any)(
          rt,
          syntheticMessage("hourly edge check", rt),
          undefined,
          { condition_id: conditionId, asset: "BTC" },
          undefined,
        );
      }
      if (task.id)
        await rt.updateTask(task.id, {
          metadata: { ...task.metadata, updatedAt: Date.now() },
        });
    },
  });
  setImmediate(() => {
    runtime
      .createTask({
        name: "POLYMARKET_ANALYST_HOURLY",
        description: "Hourly Polymarket edge check (Synth vs market)",
        roomId: taskWorldId,
        worldId: taskWorldId,
        tags: ["polymarket", "desk", "analyst", "queue", "repeat"],
        metadata: {
          updateInterval: ANALYST_INTERVAL_MS,
          updatedAt: Date.now(),
        },
      })
      .catch((e) => logger.warn("[PolymarketDesk] createTask analyst:", e));
  });

  // --- Risk: 15m — approve one pending signal (size and write sized order) ---
  runtime.registerTaskWorker({
    name: "POLYMARKET_RISK_15M",
    execute: async (rt, _options, task) => {
      if (process.env.POLYMARKET_DESK_SCHEDULE_ENABLED === "false") return;
      const action = rt.actions?.find(
        (a) => a.name === "POLYMARKET_RISK_APPROVE",
      );
      if (action?.handler) {
        const walletFromEnv =
          process.env.POLYMARKET_DESK_WALLET_ADDRESS?.trim();
        const options =
          walletFromEnv !== undefined && walletFromEnv !== ""
            ? { wallet_address: walletFromEnv }
            : {};
        await (action.handler as any)(
          rt,
          syntheticMessage("risk approve", rt),
          undefined,
          options,
          undefined,
        );
      }
      if (task.id)
        await rt.updateTask(task.id, {
          metadata: { ...task.metadata, updatedAt: Date.now() },
        });
    },
  });
  setImmediate(() => {
    runtime
      .createTask({
        name: "POLYMARKET_RISK_15M",
        description: "15m Polymarket risk snapshot (pending signals)",
        roomId: taskWorldId,
        worldId: taskWorldId,
        tags: ["polymarket", "desk", "risk", "queue", "repeat"],
        metadata: { updateInterval: RISK_INTERVAL_MS, updatedAt: Date.now() },
      })
      .catch((e) => logger.warn("[PolymarketDesk] createTask risk:", e));
  });

  // --- Performance: 4h desk report ---
  runtime.registerTaskWorker({
    name: "POLYMARKET_PERF_4H",
    execute: async (rt, _options, task) => {
      if (process.env.POLYMARKET_DESK_SCHEDULE_ENABLED === "false") return;
      const action = rt.actions?.find(
        (a) => a.name === "POLYMARKET_DESK_REPORT",
      );
      if (action?.handler) {
        await (action.handler as any)(
          rt,
          syntheticMessage("4h desk report", rt),
          undefined,
          { hours: 24 * 7 },
          undefined,
        );
      }
      if (task.id)
        await rt.updateTask(task.id, {
          metadata: { ...task.metadata, updatedAt: Date.now() },
        });
    },
  });
  setImmediate(() => {
    runtime
      .createTask({
        name: "POLYMARKET_PERF_4H",
        description: "4h Polymarket desk performance report",
        roomId: taskWorldId,
        worldId: taskWorldId,
        tags: ["polymarket", "desk", "performance", "queue", "repeat"],
        metadata: { updateInterval: PERF_INTERVAL_MS, updatedAt: Date.now() },
      })
      .catch((e) => logger.warn("[PolymarketDesk] createTask perf:", e));
  });

  logger.info(
    "[PolymarketDesk] Oracle: registered analyst (1h), risk (15m), perf (4h). Set POLYMARKET_DESK_SCHEDULE_ENABLED=false to disable.",
  );
}
