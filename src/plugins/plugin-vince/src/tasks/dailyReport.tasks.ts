/**
 * VINCE Daily Report Task
 *
 * Scheduled daily report pushed to Discord/Slack/Telegram.
 * Combines: ALOHA (crypto), OPTIONS (HYPERSURFACE), PERPS (signals), HIP-3 (TradFi).
 *
 * - Runs at configured hour (default 08:00 UTC — morning briefing).
 * - Pushes to channels whose name contains "daily" (e.g. #daily or #vince-daily-reports).
 * - Uses VinceNotificationService.push() with roomNameContains filter.
 *
 * Set VINCE_DAILY_REPORT_HOUR=8 (UTC) to customize. Disable with VINCE_DAILY_REPORT_ENABLED=false.
 */

import {
  type IAgentRuntime,
  type UUID,
  logger,
  ModelType,
} from "@elizaos/core";
import { BullBearAnalyzer } from "../analysis/bullBearAnalyzer";
import type { AnalysisResult } from "../types/analysis";
import { CORE_ASSETS } from "../constants/targetAssets";
import type { VinceXSentimentService } from "../services/xSentiment.service";

const DEFAULT_REPORT_HOUR_UTC = 8;
const TASK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

// ==========================================
// Build combined data context
// ==========================================

async function buildDailyReportContext(
  runtime: IAgentRuntime,
): Promise<string> {
  const lines: string[] = [];
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  lines.push(`=== DAILY REPORT DATA · ${date} ===`);
  lines.push("");

  // --- CRYPTO (ALOHA-style via BullBearAnalyzer) ---
  const analyzer = new BullBearAnalyzer();
  const coreResults: Map<string, AnalysisResult> = new Map();
  for (const asset of CORE_ASSETS) {
    try {
      const result = await analyzer.analyze(runtime, asset);
      coreResults.set(asset, result);
    } catch {
      // Skip
    }
  }

  lines.push("=== CRYPTO (BTC, ETH, SOL, HYPE) ===");
  for (const [asset, result] of coreResults) {
    const s = result.snapshot;
    const c = result.conclusion;
    const change =
      s.priceChange24h != null
        ? `${s.priceChange24h >= 0 ? "+" : ""}${s.priceChange24h.toFixed(2)}%`
        : "—";
    lines.push(
      `${asset}: $${s.spotPrice?.toLocaleString() ?? "—"} (${change}) · ${c.direction} (${c.conviction.toFixed(0)}%)`,
    );
  }
  const btc = coreResults.get("BTC");
  if (btc?.snapshot) {
    const s = btc.snapshot;
    if (s.fearGreedValue != null) lines.push(`Fear/Greed: ${s.fearGreedValue}`);
    if (s.fundingRate != null)
      lines.push(`BTC Funding: ${(s.fundingRate * 100).toFixed(4)}%`);
    if (s.longShortRatio != null)
      lines.push(`L/S: ${s.longShortRatio.toFixed(2)}`);
  }
  lines.push("");

  // --- HIP-3 (TradFi) ---
  const hip3Service = runtime.getService("VINCE_HIP3_SERVICE") as {
    getHIP3Pulse?: () => Promise<{
      summary?: { overallBias?: string; tradFiVsCrypto?: string };
      sectorStats?: { hottestSector?: string };
    } | null>;
  } | null;
  if (hip3Service?.getHIP3Pulse) {
    try {
      const pulse = await hip3Service.getHIP3Pulse();
      if (pulse?.summary) {
        lines.push("=== HIP-3 (TradFi) ===");
        lines.push(`Bias: ${pulse.summary.overallBias ?? "—"}`);
        lines.push(`Rotation: ${pulse.summary.tradFiVsCrypto ?? "—"}`);
        if (pulse.sectorStats?.hottestSector)
          lines.push(`Hottest: ${pulse.sectorStats.hottestSector}`);
        lines.push("");
      }
    } catch {
      // Skip
    }
  }

  // --- OPTIONS (compact) ---
  const deribitService = runtime.getService("VINCE_DERIBIT_SERVICE") as {
    getOptionsContext?: (a: string) => Promise<{
      spotPrice?: number;
      dvol?: number | null;
      ivSurface?: { skewInterpretation?: string };
    }>;
  } | null;
  if (deribitService?.getOptionsContext) {
    try {
      const btcCtx = await deribitService.getOptionsContext("BTC");
      if (btcCtx?.spotPrice && btcCtx?.dvol != null) {
        lines.push("=== OPTIONS ===");
        lines.push(`BTC DVOL: ${btcCtx.dvol.toFixed(1)}%`);
        if (btcCtx.ivSurface?.skewInterpretation)
          lines.push(`Skew: ${btcCtx.ivSurface.skewInterpretation}`);
        lines.push("");
      }
    } catch {
      // Skip
    }
  }

  // --- PERPS (signals) ---
  const signalService = runtime.getService(
    "VINCE_SIGNAL_AGGREGATOR_SERVICE",
  ) as {
    getSignal?: (a: string) => Promise<{
      direction: string;
      strength: number;
      confidence: number;
      factors: string[];
    }>;
  } | null;
  if (signalService?.getSignal) {
    lines.push("=== PERPS SIGNALS ===");
    for (const asset of CORE_ASSETS) {
      try {
        const sig = await signalService.getSignal(asset);
        lines.push(
          `${asset}: ${sig.direction.toUpperCase()} (${sig.strength}% strength, ${sig.confidence}% conf)`,
        );
      } catch {
        // Skip
      }
    }
  }

  // --- PAPER BOT ---
  const posManager = runtime.getService("VINCE_POSITION_MANAGER_SERVICE") as {
    getOpenPositions?: () => {
      asset: string;
      direction: string;
      entryPrice: number;
      unrealizedPnl: number;
    }[];
    getPortfolio?: () => { totalValue: number; returnPct: number };
  } | null;
  if (posManager) {
    const positions = posManager.getOpenPositions?.() ?? [];
    const portfolio = posManager.getPortfolio?.();
    lines.push("");
    lines.push("=== PAPER BOT ===");
    if (portfolio)
      lines.push(
        `Portfolio: $${portfolio.totalValue.toLocaleString()} (${portfolio.returnPct >= 0 ? "+" : ""}${portfolio.returnPct.toFixed(2)}%)`,
      );
    if (positions.length > 0) {
      for (const p of positions) {
        lines.push(
          `${p.direction.toUpperCase()} ${p.asset} @ $${p.entryPrice.toLocaleString()} · P&L ${p.unrealizedPnl >= 0 ? "+" : ""}$${p.unrealizedPnl.toFixed(0)}`,
        );
      }
    } else {
      lines.push("No open positions");
    }
  }

  // --- X (Twitter) vibe check (cached sentiment) ---
  const xSentimentService = runtime.getService(
    "VINCE_X_SENTIMENT_SERVICE",
  ) as VinceXSentimentService | null;
  if (xSentimentService?.isConfigured?.()) {
    try {
      const parts: string[] = [];
      for (const asset of CORE_ASSETS) {
        const s = xSentimentService.getTradingSentiment(asset);
        if (s.confidence > 0)
          parts.push(`${asset} ${s.sentiment} ${s.confidence}%`);
      }
      if (parts.length > 0) {
        lines.push("");
        lines.push("=== X (TWITTER) VIBE CHECK ===");
        lines.push(parts.join(", "));
      }
    } catch {
      // Skip
    }
  }

  return lines.join("\n");
}

async function generateDailyReport(
  runtime: IAgentRuntime,
  dataContext: string,
): Promise<string> {
  const prompt = `You are VINCE, writing your daily market report. This goes to a Discord/Slack channel. Be concise, punchy, opinionated.

${dataContext}

Write a daily report with these sections (each 2-4 sentences, no bullet lists):

1. **CRYPTO** - Core majors (BTC, ETH, SOL, HYPE). Vibe, key levels, fear/greed, funding.
2. **TradFi (HIP-3)** - Stocks, indices, commodities on Hyperliquid. Rotation signal, hottest sector.
3. **OPTIONS** - Vol environment, skew. Good week for premium sellers?
4. **PERPS** - Signal summary, what's tradeable.
5. **PAPER BOT** - Status, positions or why sitting out.

STYLE: Like texting a trader friend. Specific numbers. Take positions. No fluff.
TOTAL: ~300-400 words. Use **bold** for section headers only.`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[DailyReport] LLM failed: ${error}`);
    return "Daily report generation failed. Data loaded but narrative couldn't be produced.";
  }
}

// ==========================================
// Task registration
// ==========================================

export async function registerDailyReportTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.VINCE_DAILY_REPORT_ENABLED !== "false";
  if (!enabled) {
    logger.info(
      "[DailyReport] Task disabled (VINCE_DAILY_REPORT_ENABLED=false)",
    );
    return;
  }

  const reportHour =
    parseInt(
      process.env.VINCE_DAILY_REPORT_HOUR ?? String(DEFAULT_REPORT_HOUR_UTC),
      10,
    ) || DEFAULT_REPORT_HOUR_UTC;
  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "VINCE_DAILY_REPORT",
    validate: async () => true,
    execute: async (rt) => {
      const now = new Date();
      const hourUtc = now.getUTCHours();
      if (hourUtc !== reportHour) {
        logger.debug(
          `[DailyReport] Skipping: current hour ${hourUtc} UTC, target ${reportHour}`,
        );
        return;
      }

      const notif = rt.getService("VINCE_NOTIFICATION_SERVICE") as {
        push?: (
          text: string,
          opts?: { roomNameContains?: string },
        ) => Promise<number>;
      } | null;
      if (!notif?.push) {
        logger.warn("[DailyReport] VinceNotificationService not available");
        return;
      }

      logger.info("[DailyReport] Building daily report...");
      try {
        const context = await buildDailyReportContext(rt);
        const report = await generateDailyReport(rt, context);
        const date = now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
        const text = `**VINCE Daily Report** _${date}_\n\n${report}\n\n---\n_Commands: ALOHA, OPTIONS, PERPS, HIP3, BOT_`;

        const sent = await notif.push(text, { roomNameContains: "daily" });
        if (sent > 0) {
          logger.info(`[DailyReport] Pushed to ${sent} channel(s)`);
        } else {
          logger.debug(
            "[DailyReport] No channels matched (room name contains 'daily'). Create e.g. #daily or #vince-daily-reports and invite VINCE.",
          );
        }
      } catch (error) {
        logger.error(`[DailyReport] Failed: ${error}`);
      }
    },
  });

  await runtime.createTask({
    name: "VINCE_DAILY_REPORT",
    description:
      "Daily market report (ALOHA + OPTIONS + PERPS + HIP-3) pushed to Discord/Slack/Telegram",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["vince", "daily-report", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: TASK_INTERVAL_MS,
    },
  });

  logger.info(
    `[DailyReport] Task registered (runs at ${reportHour}:00 UTC, push to channels with "daily" in name)`,
  );
}
