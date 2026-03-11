import type { IAgentRuntime, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { FinnhubService } from "../services/finnhub.service";
import type { AlphaVantageService } from "../services/alphaVantage.service";
import {
  buildStockCalibrationBuckets,
  loadStockCallRecords,
  saveStockCallRecords,
  writeStockCalibrationNotes,
  type SolusStockRecommendationRow,
} from "../utils/stockRecommendationsStore";

const TASK_NAME = "SOLUS_STOCK_CALIBRATION";
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

function scoreOutcome(
  row: SolusStockRecommendationRow,
  realizedReturnPct: number,
): "win" | "loss" | "neutral" {
  if (row.recommendation === "accumulate") {
    if (realizedReturnPct >= 2) return "win";
    if (realizedReturnPct <= -2) return "loss";
    return "neutral";
  }
  if (row.recommendation === "avoid") {
    if (realizedReturnPct <= -2) return "win";
    if (realizedReturnPct >= 2) return "loss";
    return "neutral";
  }
  if (Math.abs(realizedReturnPct) <= 5) return "win";
  if (Math.abs(realizedReturnPct) >= 10) return "loss";
  return "neutral";
}

async function getLatestPrice(
  runtime: IAgentRuntime,
  ticker: string,
): Promise<number | null> {
  const finnhub = runtime.getService("FINNHUB_SERVICE") as
    | FinnhubService
    | null
    | undefined;
  if (finnhub?.isConfigured?.()) {
    const quote = await finnhub.getQuote(ticker);
    if (quote?.c && Number.isFinite(quote.c)) return quote.c;
  }

  const alpha = runtime.getService("ALPHA_VANTAGE_SERVICE") as
    | AlphaVantageService
    | null
    | undefined;
  if (alpha?.isConfigured?.()) {
    const quote = await alpha.getQuote(ticker);
    if (quote?.c && Number.isFinite(quote.c)) return quote.c;
  }

  return null;
}

function buildNotes(rows: SolusStockRecommendationRow[]): string {
  const resolved = rows.filter(
    (r) => r.resolvedAt && r.realizedReturnPct != null,
  );
  const buckets = buildStockCalibrationBuckets(rows);
  const misses = resolved
    .filter((r) => r.outcome === "loss")
    .map((r) => r.invalidation)
    .filter(Boolean);

  const missCounts = new Map<string, number>();
  for (const miss of misses) {
    missCounts.set(miss, (missCounts.get(miss) ?? 0) + 1);
  }
  const topMisses = [...missCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count]) => `${count}x ${label}`);

  const lines = [
    "[Solus stock calibration]",
    `Resolved calls: ${resolved.length}`,
    ...buckets.map(
      (b) =>
        `${b.bucket.toUpperCase()} bucket: n=${b.count}, winRate=${(b.winRate * 100).toFixed(1)}%, avgReturn=${b.avgReturnPct.toFixed(2)}%`,
    ),
  ];

  if (topMisses.length > 0) {
    lines.push(`Common invalidation failures: ${topMisses.join(" | ")}`);
  } else {
    lines.push("Common invalidation failures: none yet.");
  }
  lines.push("Use calibration to adjust confidence, not to force trades.");
  return lines.join("\n");
}

export async function registerSolusStockCalibrationTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.SOLUS_STOCK_CALIBRATION_ENABLED !== "false";
  if (!enabled) {
    logger.debug(
      "[SolusStockCalibration] Task disabled (SOLUS_STOCK_CALIBRATION_ENABLED=false).",
    );
    return;
  }

  const taskWorldId = runtime.agentId as UUID;
  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt) => {
      if (process.env.SOLUS_STOCK_CALIBRATION_ENABLED === "false") return;
      const rows = loadStockCallRecords();
      if (rows.length === 0) return;

      const now = Date.now();
      let mutated = false;

      for (const row of rows) {
        if (row.resolvedAt || !row.entryPrice || row.entryPrice <= 0) continue;
        const reviewDays = Math.max(1, row.reviewAfterDays ?? 7);
        const dueAt = row.createdAt + reviewDays * 24 * 60 * 60 * 1000;
        if (now < dueAt) continue;

        const px = await getLatestPrice(rt, row.ticker);
        if (!px || !Number.isFinite(px)) continue;

        const realized = ((px - row.entryPrice) / row.entryPrice) * 100;
        row.exitPrice = px;
        row.realizedReturnPct = realized;
        row.resolvedAt = now;
        row.outcome = scoreOutcome(row, realized);
        row.outcomeNote = `Auto-resolved after ${reviewDays}d review window.`;
        mutated = true;
      }

      if (mutated) {
        saveStockCallRecords(rows);
      }
      writeStockCalibrationNotes(buildNotes(rows));
      logger.debug("[SolusStockCalibration] Stock calibration notes updated.");
    },
  });

  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Resolve mature Solus stock calls and write calibration notes (score bucket hit-rate, avg returns, invalidation misses).",
    roomId: taskWorldId,
    worldId: taskWorldId,
    metadata: {
      updatedAt: Date.now(),
      updateInterval: DAILY_INTERVAL_MS,
    },
    tags: ["solus", "stocks", "calibration", "repeat", "daily"],
  });

  logger.info(
    "[SolusStockCalibration] Task registered (daily). Set SOLUS_STOCK_CALIBRATION_ENABLED=false to disable.",
  );
}
