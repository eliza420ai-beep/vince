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
  estimatedCostUsd: number;
  /** True when cost used default average; false when VINCE_USAGE_COST_PER_1K_TOKENS was set */
  estimatedCostFromDefault?: boolean;
  /** True when tokens were estimated from run count (run_event logs lacked usage/estimatedTokens) */
  estimatedFromRuns?: boolean;
}

const DEFAULT_DAYS = 30;
const MAX_LOGS = 500;
/** Default USD per 1K tokens when VINCE_USAGE_COST_PER_1K_TOKENS is not set. Blended average for typical LLM mix (TEXT_SMALL + TEXT_LARGE). Override with VINCE_USAGE_COST_PER_1K_TOKENS for accuracy. */
const DEFAULT_COST_PER_1K_TOKENS = 0.006;

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
      estimatedCostUsd: 0,
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

  const totalRuns = byDay.reduce((s, d) => s + d.runs, 0);
  const tokensFromLogs = totalTokens;
  const tokensEffective =
    tokensFromLogs > 0
      ? tokensFromLogs
      : totalRuns > 0
        ? totalRuns * 500
        : 0;
  const estimatedFromRuns = tokensFromLogs === 0 && totalRuns > 0;

  const costPer1k = runtime.getSetting("VINCE_USAGE_COST_PER_1K_TOKENS");
  const costPer1kNum =
    typeof costPer1k === "string" ? parseFloat(costPer1k) : typeof costPer1k === "number" ? costPer1k : NaN;
  const usedCostPer1k = Number.isFinite(costPer1kNum) && costPer1kNum >= 0 ? costPer1kNum : DEFAULT_COST_PER_1K_TOKENS;
  const estimatedCostUsd = (tokensEffective / 1000) * usedCostPer1k;
  const usedDefaultCost = !(Number.isFinite(costPer1kNum) && costPer1kNum >= 0);

  const byDayWithTokens = estimatedFromRuns
    ? byDay.map((d) => ({ ...d, tokens: d.runs * 500 }))
    : byDay;

  return {
    byDay: byDayWithTokens,
    totalTokens: tokensEffective,
    period: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    estimatedCostUsd,
    /** True when cost was computed using default average; false when VINCE_USAGE_COST_PER_1K_TOKENS was set */
    estimatedCostFromDefault: usedDefaultCost,
    /** True when tokens were estimated from run count (run_event logs lacked usage/estimatedTokens) */
    estimatedFromRuns,
  };
}
