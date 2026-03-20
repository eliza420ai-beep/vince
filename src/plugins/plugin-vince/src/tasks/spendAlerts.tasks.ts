import { logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import { buildUsageResponse } from "../routes/dashboardUsage";

export interface SpendAlertEvaluation {
  triggered: boolean;
  estimatedCostUsd: number;
  thresholdUsd: number;
  periodFromIso: string;
  periodToIso: string;
  monthKeyUtc: string;
}

function getUtcMonthRange(nowMs: number): {
  monthKeyUtc: string;
  periodFromIso: string;
  periodToIso: string;
} {
  const d = new Date(nowMs);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-11
  const monthKeyUtc = `${year}-${String(month + 1).padStart(2, "0")}`;

  const from = Date.UTC(year, month, 1, 0, 0, 0, 0);
  const to = Date.UTC(year, month + 1, 0, 23, 59, 59, 999);

  return {
    monthKeyUtc,
    periodFromIso: new Date(from).toISOString(),
    periodToIso: new Date(to).toISOString(),
  };
}

export async function evaluateMonthlySpendAlert(
  runtime: IAgentRuntime,
  thresholdUsd: number,
  nowMs: number = Date.now(),
): Promise<SpendAlertEvaluation> {
  const { monthKeyUtc, periodFromIso, periodToIso } = getUtcMonthRange(nowMs);

  const usage = await buildUsageResponse(
    runtime,
    periodFromIso,
    periodToIso,
    "day",
  );

  const estimatedCostUsd = usage.estimatedCostUsd;
  const triggered =
    Number.isFinite(thresholdUsd) &&
    thresholdUsd > 0 &&
    Number.isFinite(estimatedCostUsd) &&
    estimatedCostUsd >= thresholdUsd;

  return {
    triggered,
    estimatedCostUsd,
    thresholdUsd,
    periodFromIso,
    periodToIso,
    monthKeyUtc,
  };
}

const TASK_NAME = "VINCE_SPEND_ALERT";
const TASK_INTERVAL_MS = 60 * 60 * 1000; // hourly check

export async function registerSpendAlertsTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const thresholdRaw = process.env.VINCE_SPEND_ALERT_MONTHLY_USD?.trim();
  if (!thresholdRaw) return;

  const thresholdUsd = parseFloat(thresholdRaw);
  if (!Number.isFinite(thresholdUsd) || thresholdUsd <= 0) return;

  const existing = await runtime.getTasksByName(TASK_NAME);
  if (existing?.length) return;

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt) => {
      const nowMs = Date.now();
      const { monthKeyUtc } = getUtcMonthRange(nowMs);
      const cacheKey = `vince:spendAlert:lastNotified:${monthKeyUtc}`;

      const lastNotified = await rt.getCache<string>(cacheKey);
      if (lastNotified === monthKeyUtc) return;

      const evaluation = await evaluateMonthlySpendAlert(
        rt,
        thresholdUsd,
        nowMs,
      );

      if (!evaluation.triggered) return;

      // Deterministic prefix so Railway/Log alerts can match reliably.
      logger.warn(
        `[SPEND_ALERT_BREACH] SPEND_ALERT_BREACH month=${evaluation.monthKeyUtc} estimated_cost_usd=${evaluation.estimatedCostUsd.toFixed(
          2,
        )} threshold_usd=${evaluation.thresholdUsd.toFixed(2)} from=${evaluation.periodFromIso} to=${evaluation.periodToIso}`,
      );

      await rt.setCache(cacheKey, monthKeyUtc);
    },
  });

  const taskWorldId = runtime.agentId;

  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Logs SPEND_ALERT_BREACH when estimated LLM spend crosses VINCE_SPEND_ALERT_MONTHLY_USD (estimated from run_event logs).",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["vince", "spend-alert", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: TASK_INTERVAL_MS,
    },
  });
}
