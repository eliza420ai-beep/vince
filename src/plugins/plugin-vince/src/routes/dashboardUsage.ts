/**
 * Dashboard Usage API – session token usage for TREASURY cost visibility.
 * GET /api/agents/:agentId/plugins/plugin-vince/vince/usage
 * Query: from (ISO date), to (ISO date), groupBy=day|session
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";

export interface UsageByDay {
  date: string;
  tokens: number;
  runs: number;
}

export interface UsageResponse {
  byDay: UsageByDay[];
  totalTokens: number;
  period: { from: string; to: string };
  estimatedCostUsd?: number;
}

const DEFAULT_DAYS = 30;
const MAX_LOGS = 500;

function toDateKey(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().slice(0, 10);
}

export async function buildUsageResponse(
  runtime: IAgentRuntime,
  fromParam?: string,
  toParam?: string,
  _groupBy: string = "day",
): Promise<UsageResponse> {
  const now = Date.now();
  const toDate = toParam ? new Date(toParam).getTime() : now;
  const fromDate = fromParam
    ? new Date(fromParam).getTime()
    : now - DEFAULT_DAYS * 24 * 60 * 60 * 1000;

  const from = Math.min(fromDate, toDate);
  const to = Math.max(fromDate, toDate);

  let logs: { body?: Record<string, unknown> }[] = [];
  try {
    logs = await runtime.getLogs({
      entityId: runtime.agentId,
      type: "run_event",
      count: MAX_LOGS,
    });
  } catch (err) {
    logger.warn(`[VINCE] Usage getLogs error: ${err}`);
    return {
      byDay: [],
      totalTokens: 0,
      period: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    };
  }

  const byDayMap = new Map<string, { tokens: number; runs: number }>();
  let totalTokens = 0;

  for (const log of logs) {
    let body = log.body as Record<string, unknown> | string | undefined;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body) as Record<string, unknown>;
      } catch {
        continue;
      }
    }
    if (!body || typeof body !== "object") continue;

    const status = body.status as string | undefined;
    if (status !== "completed" && status !== "timeout") continue;

    const startTime = (body.startTime as number) ?? (body.endTime as number);
    const endTime = (body.endTime as number) ?? startTime;
    const ts = endTime ?? startTime ?? 0;
    if (ts < from || ts > to) continue;

    const usage = body.usage as { total_tokens?: number; totalTokens?: number } | undefined;
    const estimatedTokens =
      (body.estimatedTokens as number | undefined) ??
      (body.estimated_tokens as number | undefined);
    const tokens =
      usage?.total_tokens ?? usage?.totalTokens ?? estimatedTokens ?? 0;
    totalTokens += tokens;

    const dateKey = toDateKey(ts);
    const existing = byDayMap.get(dateKey) ?? { tokens: 0, runs: 0 };
    byDayMap.set(dateKey, {
      tokens: existing.tokens + tokens,
      runs: existing.runs + 1,
    });
  }

  const byDay: UsageByDay[] = Array.from(byDayMap.entries())
    .map(([date, { tokens, runs }]) => ({ date, tokens, runs }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const costPer1k = runtime.getSetting("VINCE_USAGE_COST_PER_1K_TOKENS");
  const costPer1kNum =
    typeof costPer1k === "string" ? parseFloat(costPer1k) : typeof costPer1k === "number" ? costPer1k : NaN;
  const estimatedCostUsd =
    Number.isFinite(costPer1kNum) && costPer1kNum >= 0
      ? (totalTokens / 1000) * costPer1kNum
      : undefined;

  return {
    byDay,
    totalTokens,
    period: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    ...(estimatedCostUsd !== undefined && { estimatedCostUsd }),
  };
}
