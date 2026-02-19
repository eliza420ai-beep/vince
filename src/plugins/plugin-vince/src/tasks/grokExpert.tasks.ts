/**
 * Grok Expert Daily Task
 *
 * DISABLED: Task registration is commented out in plugin index.ts.
 *
 * Automatically runs the Grok Expert daily pulse at a configured time.
 * Default: Once per day (24 hours)
 *
 * The task:
 * - Aggregates data from all services
 * - Generates prompt of the day
 * - Suggests research topics
 * - Saves to knowledge folder
 */

import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

// Service types
import type { VinceCoinGlassService } from "../services/coinglass.service";
import type { VinceMarketDataService } from "../services/marketData.service";
import type { VinceTopTradersService } from "../services/topTraders.service";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";
import type { VinceHIP3Service } from "../services/hip3.service";
import type { VinceNFTFloorService } from "../services/nftFloor.service";
import type { VinceLifestyleService } from "../services/lifestyle.service";
import type { VinceDexScreenerService } from "../services/dexscreener.service";
import type { VinceBinanceService } from "../services/binance.service";
import type { VinceDeribitService } from "../services/deribit.service";
import type { VinceSignalAggregatorService } from "../services/signalAggregator.service";
import type { VinceMarketRegimeService } from "../services/marketRegime.service";
import type { VinceXSentimentService } from "../services/xSentiment.service";
import { CORE_ASSETS } from "../constants/targetAssets";
import { getOrCreateXAIService } from "../services/fallbacks";
import { getMemoryDir } from "../memory/intelligenceLog";
import { runCryptoIntelPostReport } from "../memory/cryptoIntelPrePost";
import { runSubAgentOrchestration } from "./runSubAgentOrchestration";
import { parseKnowledgeGap } from "../utils/grokPulseParser";

// ==========================================
// Data Context Builder (simplified for task)
// ==========================================

interface GrokTaskContext {
  timestamp: string;
  date: string;
  day: string;
  regime: string;
  fearGreed: number | null;
  coinglassData: string[];
  binanceData: string[];
  topTradersData: string[];
  optionsData: string[];
  signalsData: string[];
  hip3Data: string[];
  lifestyleData: string[];
  nftData: string[];
  memesData: string[];
  newsData: string[];
  xSentimentData: string[];
}

async function buildTaskDataContext(
  runtime: IAgentRuntime,
): Promise<GrokTaskContext> {
  const now = new Date();
  const ctx: GrokTaskContext = {
    timestamp: now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    date: now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }),
    day: now.toLocaleDateString("en-US", { weekday: "long" }),
    regime: "unknown",
    fearGreed: null,
    coinglassData: [],
    binanceData: [],
    topTradersData: [],
    optionsData: [],
    signalsData: [],
    hip3Data: [],
    lifestyleData: [],
    nftData: [],
    memesData: [],
    newsData: [],
    xSentimentData: [],
  };

  // Get services
  const coinglassService = runtime.getService(
    "VINCE_COINGLASS_SERVICE",
  ) as VinceCoinGlassService | null;
  const binanceService = runtime.getService(
    "VINCE_BINANCE_SERVICE",
  ) as VinceBinanceService | null;
  const regimeService = runtime.getService(
    "VINCE_MARKET_REGIME_SERVICE",
  ) as VinceMarketRegimeService | null;

  // Market Regime
  if (regimeService) {
    try {
      const regime = await regimeService.getRegime?.("BTC");
      if (regime) {
        ctx.regime = regime.regime || "unknown";
      }
    } catch (e) {
      // Silent fail
    }
  }

  // CoinGlass Data
  if (coinglassService) {
    try {
      const fearGreed = coinglassService.getFearGreed?.();
      if (fearGreed) {
        ctx.fearGreed = fearGreed.value;
        ctx.coinglassData.push(`Fear & Greed: ${fearGreed.value}/100`);
      }
    } catch (e) {
      // Silent fail
    }
  }

  // Binance Data
  if (binanceService) {
    try {
      const topTraders =
        await binanceService.getTopTraderPositions?.("BTCUSDT");
      if (topTraders) {
        ctx.binanceData.push(
          `Top Traders: ${topTraders.longPosition.toFixed(1)}% long`,
        );
      }
    } catch (e) {
      // Silent fail
    }
  }

  // X (Twitter) vibe check (cached sentiment for core assets)
  const xSentimentService = runtime.getService(
    "VINCE_X_SENTIMENT_SERVICE",
  ) as VinceXSentimentService | null;
  if (xSentimentService?.isConfigured?.()) {
    try {
      const parts: string[] = [];
      const riskAssets: string[] = [];
      for (const asset of CORE_ASSETS) {
        const s = xSentimentService.getTradingSentiment(asset);
        if (s.confidence > 0) {
          parts.push(`${asset} ${s.sentiment} ${s.confidence}%`);
          if (s.hasHighRiskEvent) riskAssets.push(asset);
        }
      }
      if (parts.length > 0) {
        ctx.xSentimentData.push(`X vibe (cached): ${parts.join(", ")}.`);
        if (riskAssets.length > 0) {
          ctx.xSentimentData.push(`Risk flags: ${riskAssets.join(", ")}.`);
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  return ctx;
}

function formatTaskContext(ctx: GrokTaskContext): string {
  const lines: string[] = [];
  lines.push(`=== GROK DAILY PULSE (AUTO) ===`);
  lines.push(`Date: ${ctx.date} | Regime: ${ctx.regime}`);

  if (ctx.coinglassData.length > 0) {
    lines.push(...ctx.coinglassData);
  }
  if (ctx.binanceData.length > 0) {
    lines.push(...ctx.binanceData);
  }
  if (ctx.xSentimentData.length > 0) {
    lines.push("X (Twitter) vibe check:", ...ctx.xSentimentData);
  }

  return lines.join("\n");
}

function buildTaskPrompt(dataContext: string): string {
  return `You are VINCE's Grok Expert running the automated daily pulse.

${dataContext}

Generate a brief daily pulse (300 words max) with:
1. **Prompt of the Day**: One actionable research prompt for today
2. **Market Read**: 2-3 sentences on current conditions
3. **Top 3 Research Ideas**: Quick suggestions for options, perps, or HIP-3
4. **Knowledge Gap**: One topic to add to the knowledge base

Be direct and actionable. No disclaimers.`;
}

async function saveTaskResult(
  content: string,
  date: string,
): Promise<string | null> {
  try {
    const knowledgeDir = path.join(process.cwd(), "knowledge", "internal-docs");

    if (!fs.existsSync(knowledgeDir)) {
      fs.mkdirSync(knowledgeDir, { recursive: true });
    }

    const dateStr = date.replace(/,/g, "").replace(/\s+/g, "-").toLowerCase();
    const filename = `grok-auto-${dateStr}.md`;
    const filepath = path.join(knowledgeDir, filename);

    const fileContent = `# Grok Expert Auto-Pulse

**Generated**: ${new Date().toISOString()}
**Type**: Automated Daily Task
**Tags**: #grok-expert #auto-pulse #daily

---

${content}
`;

    fs.writeFileSync(filepath, fileContent, "utf-8");
    logger.info(`[GROK_TASK] Saved auto-pulse to ${filepath}`);
    return filename;
  } catch (e) {
    logger.error(`[GROK_TASK] Failed to save: ${e}`);
    return null;
  }
}

const KNOWLEDGE_GAPS_LOG = "knowledge/internal-docs/knowledge-gaps-log.md";

function appendKnowledgeGapToLog(knowledgeGap: string, dateStr: string): void {
  try {
    const cwd = process.cwd();
    const logPath = path.join(cwd, KNOWLEDGE_GAPS_LOG);
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const dateLabel = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const line = `- **${dateLabel}**: ${knowledgeGap.trim()}\n`;
    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, "## Knowledge gaps\n\n" + line, "utf-8");
    } else {
      fs.appendFileSync(logPath, line, "utf-8");
    }
    logger.info(`[GROK_TASK] Appended knowledge gap to ${KNOWLEDGE_GAPS_LOG}`);
  } catch (e) {
    logger.warn(`[GROK_TASK] Failed to append knowledge gap log: ${e}`);
  }
}

// ==========================================
// Register Grok Expert Task
// ==========================================

export const registerGrokExpertTask = async (
  runtime: IAgentRuntime,
  worldId?: UUID,
) => {
  const taskWorldId = worldId || (runtime.agentId as UUID);

  // Clear existing grok tasks
  try {
    const existingTasks = await runtime.getTasks({
      tags: ["grok-expert", "vince"],
    });

    for (const task of existingTasks) {
      if (task.id) {
        await runtime.deleteTask(task.id);
      }
    }
  } catch (e) {
    logger.debug(
      "[GROK_TASK] Failed to clear existing tasks (expected if DB not ready yet)",
    );
  }

  // Register the task worker
  runtime.registerTaskWorker({
    name: "GROK_EXPERT_DAILY_PULSE",
    validate: async (_runtime, _message, _state) => true,
    execute: async (runtime, _options, _task) => {
      try {
        logger.info("[GROK_TASK] Running automated daily pulse...");

        // Get XAI service (external or fallback)
        const xaiService = getOrCreateXAIService(runtime);
        if (!xaiService) {
          logger.warn(
            "[GROK_TASK] XAI service not available (no API key), skipping",
          );
          return;
        }

        const ctx = await buildTaskDataContext(runtime);
        const subAgentsEnabled =
          runtime.getSetting("GROK_SUB_AGENTS_ENABLED") === true ||
          runtime.getSetting("GROK_SUB_AGENTS_ENABLED") === "true" ||
          process.env.GROK_SUB_AGENTS_ENABLED === "true";

        let reportContent: string | null = null;

        if (subAgentsEnabled) {
          const memoryDir = getMemoryDir(runtime);
          const dataContextText = formatTaskContext(ctx);
          const xVibeSummary =
            ctx.xSentimentData.length > 0
              ? ctx.xSentimentData.join(" ")
              : "No cached X sentiment.";
          const report = await runSubAgentOrchestration(
            runtime,
            dataContextText,
            xVibeSummary,
            { date: ctx.date, runWebSearch: true, memoryDir },
          );
          reportContent = report;
          await saveTaskResult(report, ctx.date);
          try {
            await runCryptoIntelPostReport(runtime, memoryDir, report);
          } catch (e) {
            logger.warn(
              { err: e },
              "[GROK_TASK] Post-report memory update failed",
            );
          }
        } else {
          const formattedContext = formatTaskContext(ctx);
          const prompt = buildTaskPrompt(formattedContext);
          const result = await xaiService.generateText({
            prompt,
            model: "grok-4-1-fast-reasoning",
            temperature: 0.7,
            maxTokens: 1500,
            system:
              "You are VINCE's daily research assistant. Be brief and actionable.",
          });
          if (!result.success || !result.text) {
            logger.error(`[GROK_TASK] Grok API failed: ${result.error}`);
            return;
          }
          reportContent = result.text;
          await saveTaskResult(result.text, ctx.date);
        }

        if (reportContent) {
          const knowledgeGap = parseKnowledgeGap(reportContent);
          if (knowledgeGap) {
            appendKnowledgeGapToLog(knowledgeGap, ctx.date);
            try {
              const taskWorldId = (runtime.agentId as UUID) ?? undefined;
              await runtime.createTask({
                name: "KNOWLEDGE_GAP_FOLLOW_UP",
                description: knowledgeGap.slice(0, 200),
                roomId: taskWorldId,
                worldId: taskWorldId,
                tags: ["knowledge-gap", "grok"],
                metadata: { knowledgeGap, date: ctx.date },
              });
            } catch (e) {
              logger.debug(
                `[GROK_TASK] Knowledge gap task create skipped: ${e}`,
              );
            }
          }
        }

        logger.info("[GROK_TASK] Daily pulse completed");
      } catch (error) {
        logger.error(`[GROK_TASK] Failed: ${error}`);
      }
    },
  });

  // Create the recurring task (runs every 24 hours)
  // Note: roomId is required for task creation - use agentId as a default "self" room
  await runtime.createTask({
    name: "GROK_EXPERT_DAILY_PULSE",
    description: "Automated daily Grok Expert pulse with research suggestions",
    roomId: taskWorldId, // Use worldId as roomId for agent-level tasks
    worldId: taskWorldId,
    metadata: {
      updatedAt: Date.now(),
      updateInterval: 1000 * 60 * 60 * 24, // 24 hours
    },
    tags: ["grok-expert", "vince", "queue", "repeat", "daily"],
  });
};

export default registerGrokExpertTask;
