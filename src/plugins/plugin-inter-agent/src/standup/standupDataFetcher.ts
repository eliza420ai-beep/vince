/**
 * Standup Data Fetcher
 *
 * Fetches REAL data for each agent's standup report.
 * Each fetcher runs on that agent's runtime so it has access to the agent's services.
 * The shared daily insights doc is built from these fetchers.
 *
 * Data ownership (no overlaps):
 * - VINCE: ALL market/trading data (enriched context, funding, L/S, regime, Fear/Greed,
 *          HIP-3, signals, Deribit DVOL, Binance top traders, paper bot, goals, MandoMinutes,
 *          liquidations, OI delta, market regime)
 * - ECHO: CT/X sentiment (actual tweets)
 * - Oracle: Polymarket prediction markets
 * - Solus: directive referencing VINCE's data (no own price fetch)
 * - Sentinel: git log, PRDs, ProjectRadar, macro news (Tavily)
 * - Eliza: recent facts from memory
 * - Clawterm: OpenClaw skills, setup, trending (X + web, LLM summary)
 * - Otaku: wallet setup progress + concrete next step
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { type IAgentRuntime, logger, ModelType } from "@elizaos/core";
import { PolymarketService } from "../../../plugin-polymarket-discovery/src/services/polymarket.service";
import {
  getWeeklyOptionsContext,
  hasOpenPositions,
} from "../../../plugin-solus/src/utils/weeklyOptionsContext";
import { getRecentCodeContext } from "./standup.context";
import {
  getStandupTrackedAssets,
  getStandupSnippetLen,
} from "./standup.constants";
import { loadDayReport, loadSharedDailyInsights } from "./dayReportPersistence";

/** Extract key events from VINCE's shared insights text for dynamic ECHO/Clawterm queries (e.g. "SOL funding flipped", "BTC +5%"). */
export function extractKeyEventsFromVinceData(vinceText: string): string[] {
  const hints: string[] = [];
  if (!vinceText || typeof vinceText !== "string") return hints;
  const assets = getStandupTrackedAssets();
  const lower = vinceText.toLowerCase();
  for (const asset of assets) {
    const assetLower = asset.toLowerCase();
    if (lower.includes(`${assetLower}`)) {
      const fundingMatch = vinceText.match(
        new RegExp(`${asset}[^|]*F:(-?[\\d.]+)%`, "i"),
      );
      if (fundingMatch) {
        const rate = parseFloat(fundingMatch[1]);
        if (rate < -0.01) hints.push(`${asset} funding negative`);
        else if (rate > 0.02) hints.push(`${asset} funding high`);
      }
      const changeMatch = vinceText.match(
        new RegExp(`${asset}[^|]*([+-][\\d.]+)%`, "i"),
      );
      if (changeMatch) {
        const pct = parseFloat(changeMatch[1]);
        if (Math.abs(pct) >= 5)
          hints.push(`${asset} ${pct >= 0 ? "+" : ""}${pct}% 24h`);
      }
    }
  }
  if (
    lower.includes("volume") &&
    (lower.includes("spike") || lower.includes("2x") || lower.includes("3x"))
  ) {
    hints.push("volume spike");
  }
  return [...new Set(hints)].slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════════════
// Health Check: Gateway, Docker, APIs status
// ═══════════════════════════════════════════════════════════════════════

/** Build a quick health status for the standup header */
export async function fetchStandupHealth(
  _runtime: IAgentRuntime,
): Promise<string> {
  const { execSync } = await import("node:child_process");
  const checks: string[] = [];

  // Check Gateway
  try {
    const gatewayUrl =
      process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
    const response = await fetch(`${gatewayUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    }).catch(() => null);
    checks.push(response?.ok ? "🟢 Gateway" : "🔴 Gateway");
  } catch {
    checks.push("🔴 Gateway");
  }

  // Check Docker
  try {
    const dockerPs = execSync(
      "docker ps --filter 'name=mission-control' --format '{{.Status}}' 2>/dev/null || echo ''",
      { encoding: "utf-8", timeout: 3000 },
    ).trim();
    checks.push(dockerPs ? "🟢 Docker" : "⚪ Docker");
  } catch {
    checks.push("⚪ Docker");
  }

  // Check API keys
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  checks.push(hasOpenAI || hasAnthropic ? "🟢 APIs" : "🔴 APIs");

  // Check X token
  const hasX =
    !!process.env.X_BEARER_TOKEN || !!process.env.ELIZA_X_BEARER_TOKEN;
  checks.push(hasX ? "🟢 X" : "⚪ X");

  return `**System:** ${checks.join(" | ")}`;
}

// ═══════════════════════════════════════════════════════════════════════
// VINCE: enriched context + 12 data sources (all parallel via Promise.allSettled)
// ═══════════════════════════════════════════════════════════════════════

async function fetchEnrichedContext(runtime: IAgentRuntime): Promise<string> {
  const marketData = runtime.getService("VINCE_MARKET_DATA_SERVICE") as {
    getEnrichedContext?: (asset: string) => Promise<{
      currentPrice?: number;
      priceChange24h?: number;
      fundingRate?: number;
      longShortRatio?: number;
      marketRegime?: string;
      volumeRatio?: number;
      volume24h?: number;
    } | null>;
  } | null;
  if (!marketData?.getEnrichedContext) return "";
  const assets = getStandupTrackedAssets();
  const results = await Promise.all(
    assets.map(async (asset) => {
      const ctx = await marketData.getEnrichedContext!(asset).catch(() => null);
      if (!ctx) return `| ${asset} | N/A | — | — |`;
      const price = ctx.currentPrice
        ? `$${ctx.currentPrice.toLocaleString()}`
        : "N/A";
      const change =
        ctx.priceChange24h != null
          ? `${ctx.priceChange24h >= 0 ? "+" : ""}${ctx.priceChange24h.toFixed(1)}%`
          : "";
      const funding =
        ctx.fundingRate != null
          ? `F:${(ctx.fundingRate * 100).toFixed(3)}%`
          : "";
      const ls =
        ctx.longShortRatio != null
          ? `L/S:${ctx.longShortRatio.toFixed(2)}`
          : "";
      const vol =
        ctx.volumeRatio != null ? `Vol:${ctx.volumeRatio.toFixed(1)}x` : "";
      const regime = ctx.marketRegime ?? "";
      return `| ${asset} | ${price} ${change} | ${funding} ${ls} ${vol} | ${regime} |`;
    }),
  );
  return `| Asset | Price | Funding/LS | Regime |\n|-------|-------|-----------|--------|\n${results.join("\n")}`;
}

async function fetchFearGreed(runtime: IAgentRuntime): Promise<string> {
  const coinglass = runtime.getService("VINCE_COINGLASS_SERVICE") as {
    getFearGreed?: () => {
      value: number;
      classification: string;
    } | null;
  } | null;
  let fg: { value: number; classification: string } | null = null;
  try {
    fg = coinglass?.getFearGreed?.() ?? null;
  } catch {
    /* non-fatal */
  }
  return fg
    ? `**Fear & Greed:** ${fg.value} (${fg.classification?.replace(/_/g, " ")})`
    : "";
}

async function fetchHIP3Pulse(runtime: IAgentRuntime): Promise<string> {
  const hip3 = runtime.getService("VINCE_HIP3_SERVICE") as {
    getHIP3Pulse?: () => Promise<{ tldr: string } | null>;
  } | null;
  const data = (await hip3?.getHIP3Pulse?.().catch(() => null)) ?? null;
  return data?.tldr ? `**HIP-3:** ${data.tldr}` : "";
}

async function fetchSignalAggregator(runtime: IAgentRuntime): Promise<string> {
  const sigAgg = runtime.getService("VINCE_SIGNAL_AGGREGATOR_SERVICE") as {
    aggregateSignals?: (asset: string) => Promise<{
      direction?: string;
      confidence?: number;
      sources?: string[];
    } | null>;
  } | null;
  const btcSignal =
    (await sigAgg?.aggregateSignals?.("BTC").catch(() => null)) ?? null;
  if (!btcSignal?.direction) return "";

  // Format sources nicely - truncate long lists
  const sources = btcSignal.sources ?? [];
  const sourceCount = sources.length;
  let sourceStr = `${sourceCount} sources`;
  if (sourceCount > 0) {
    // Show first 3 sources, then "+N more"
    const displaySources = sources.slice(0, 3);
    const remaining = sourceCount - 3;
    sourceStr =
      remaining > 0
        ? `${displaySources.join(", ")} +${remaining} more`
        : displaySources.join(", ");
  }

  return `**Signal (BTC):** ${btcSignal.direction} (${btcSignal.confidence ?? 0}% conf, ${sourceStr})`;
}

async function fetchDeribitDVOL(runtime: IAgentRuntime): Promise<string> {
  const deribit = runtime.getService("VINCE_DERIBIT_SERVICE") as {
    getDVOL?: (currency: string) => Promise<{ dvol: number } | null>;
    getBestCoveredCalls?: (currency: string) => Promise<Array<{
      strike: number;
      premium: number;
      expiry: string;
    }> | null>;
  } | null;
  const [dvol, bestCalls] = await Promise.all([
    deribit?.getDVOL?.("BTC").catch(() => null) ?? null,
    deribit?.getBestCoveredCalls?.("BTC").catch(() => null) ?? null,
  ]);
  if (dvol?.dvol == null) return "";
  let line = `**BTC DVOL:** ${dvol.dvol.toFixed(1)}`;
  if (bestCalls?.[0]) {
    const top = bestCalls[0];
    line += ` | Best CC: $${top.strike} (${top.premium?.toFixed(2)} prem, ${top.expiry})`;
  }
  return line;
}

async function fetchBinanceTopTraders(runtime: IAgentRuntime): Promise<string> {
  const binance = runtime.getService("VINCE_BINANCE_SERVICE") as {
    getTopTraderPositions?: (
      asset: string,
    ) => Promise<{ longPercent: number; shortPercent: number } | null>;
  } | null;
  const topTraders =
    (await binance?.getTopTraderPositions?.("BTC").catch(() => null)) ?? null;
  return topTraders
    ? `**Top traders (BTC):** ${topTraders.longPercent?.toFixed(0)}% long / ${topTraders.shortPercent?.toFixed(0)}% short`
    : "";
}

async function fetchPaperBot(runtime: IAgentRuntime): Promise<string> {
  const paperBot = runtime.getService("VINCE_TRADE_JOURNAL_SERVICE") as {
    getStats?: () => {
      totalTrades: number;
      winCount: number;
      lossCount: number;
      winRate: number;
      totalPnl: number;
      avgPnlPerTrade: number;
      avgWin: number;
      avgLoss: number;
      profitFactor: number;
    } | null;
  } | null;
  const paperTrading = runtime.getService("VINCE_PAPER_TRADING_SERVICE") as {
    getStatus?: () => Promise<{
      openPositions?: number;
      pendingEntries?: number;
    } | null>;
  } | null;
  let stats: {
    totalTrades: number;
    winCount: number;
    lossCount: number;
    winRate: number;
    totalPnl: number;
    avgPnlPerTrade: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
  } | null = null;
  let botStatus: { openPositions?: number; pendingEntries?: number } | null =
    null;
  try {
    stats = paperBot?.getStats?.() ?? null;
  } catch {
    /* non-fatal */
  }
  try {
    botStatus = (await paperTrading?.getStatus?.()) ?? null;
  } catch {
    /* non-fatal */
  }

  let line = "";
  if (stats && stats.totalTrades > 0) {
    // Show: W/L, PnL, win rate, profit factor (clamp winRate 0-1; PF undefined when 0 losses)
    const pnlStr = `${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toFixed(0)}`;
    const winRatePct = Math.min(Math.max(stats.winRate, 0), 1) * 100;
    const winRateStr = `${winRatePct.toFixed(0)}%`;
    const pfStr =
      stats.lossCount === 0
        ? "PF:--"
        : stats.profitFactor > 0
          ? `PF:${stats.profitFactor.toFixed(1)}`
          : "";
    line =
      `**Paper:** ${stats.winCount}W/${stats.lossCount}L ${pnlStr} | WR:${winRateStr} ${pfStr}`.trimEnd();
  } else {
    line = "**Paper:** No trades yet";
  }

  if (botStatus)
    line += ` | ${botStatus.openPositions ?? 0} open, ${botStatus.pendingEntries ?? 0} pending`;
  return line;
}

/**
 * Fetch ML/ONNX model status for VINCE - shows self-improvement progress.
 * This supports the Dragonfly pitch narrative: "the ML loop is real"
 */
async function fetchMLStatus(runtime: IAgentRuntime): Promise<string> {
  try {
    // Try to get feature store count
    const vinceService = runtime.getService("VINCE_RUNTIME_SERVICE") as {
      getFeatureCount?: () => Promise<number>;
      getModelStatus?: () => Promise<{
        signalQuality?: boolean;
        positionSizing?: boolean;
        trained?: number;
      } | null>;
    } | null;

    // Also get ML inference service for threshold visibility
    const mlService = runtime.getService("VINCE_ML_INFERENCE_SERVICE") as {
      getSignalQualityThreshold?: () => number;
      getImprovementReport?: () => {
        suggested_signal_quality_threshold?: number;
        tp_level_performance?: Record<
          string,
          { win_rate: number; count: number }
        >;
        suggested_tuning?: { min_strength?: number; min_confidence?: number };
      } | null;
      getModelStatus?: () => {
        onnxAvailable: boolean;
        modelsLoaded: boolean;
        models: Array<{
          name: string;
          loaded: boolean;
          inferenceCount: number;
          avgLatencyMs: number;
        }>;
      };
    } | null;

    let featureCount = 0;
    let modelTrained = 0;
    let hasModels = false;
    let signalQualityThreshold: number | null = null;
    let tpPerformance: string = "";

    try {
      featureCount = (await vinceService?.getFeatureCount?.()) ?? 0;
    } catch {}

    try {
      const modelStatus = await vinceService?.getModelStatus?.();
      if (modelStatus) {
        modelTrained = modelStatus.trained ?? 0;
        hasModels = !!(modelStatus.signalQuality || modelStatus.positionSizing);
      }
    } catch {}

    // Get signal quality threshold from ML service
    try {
      signalQualityThreshold = mlService?.getSignalQualityThreshold?.() ?? null;
    } catch {}

    // Get TP level performance if available
    try {
      const report = await mlService?.getImprovementReport?.();
      if (report?.tp_level_performance) {
        const levels = Object.entries(report.tp_level_performance)
          .filter(([_, v]) => v.count >= 5)
          .map(([l, v]) => `${l}:${(v.win_rate * 100).toFixed(0)}%`)
          .slice(0, 3);
        if (levels.length > 0) {
          tpPerformance = ` (TP: ${levels.join(", ")})`;
        }
      }
      // Also show suggested tuning if available
      if (report?.suggested_tuning) {
        const { min_strength, min_confidence } = report.suggested_tuning;
        if (min_strength !== undefined || min_confidence !== undefined) {
          const parts: string[] = [];
          if (min_strength !== undefined)
            parts.push(`strength≥${(min_strength * 100).toFixed(0)}%`);
          if (min_confidence !== undefined)
            parts.push(`conf≥${(min_confidence * 100).toFixed(0)}%`);
          if (parts.length > 0) {
            tpPerformance += ` [tuning: ${parts.join(", ")}]`;
          }
        }
      }
    } catch {}

    // Also check feature store directory for trade count
    try {
      const featureDir = path.join(
        process.cwd(),
        ".elizadb",
        "vince-paper-bot",
        "features",
      );
      if (fs.existsSync(featureDir)) {
        const files = fs
          .readdirSync(featureDir)
          .filter((f) => f.endsWith(".jsonl"));
        // Estimate trades from file sizes (rough proxy)
        if (featureCount === 0) {
          // Try to count lines in first file
          for (const f of files.slice(0, 1)) {
            const content = fs.readFileSync(path.join(featureDir, f), "utf-8");
            featureCount = content.split("\n").filter((l) => l.trim()).length;
          }
        }
      }
    } catch {}

    if (
      featureCount > 0 ||
      modelTrained > 0 ||
      hasModels ||
      signalQualityThreshold !== null
    ) {
      const parts: string[] = [];
      if (featureCount > 0)
        parts.push(`${featureCount}+ trades in feature store`);

      // Get detailed model status from ML inference service
      let modelDetails: string[] = [];
      try {
        const modelStatus = mlService?.getModelStatus?.();
        if (modelStatus?.models) {
          modelDetails = modelStatus.models
            .filter((m) => m.loaded && m.inferenceCount > 0)
            .map((m) => `${m.name.replace("_", "")}:${m.inferenceCount}`);
        }
      } catch {}

      if (modelDetails.length > 0) {
        parts.push(`ONNX [${modelDetails.join(", ")}]`);
      } else if (hasModels) {
        parts.push("ONNX models loaded");
      }

      if (modelTrained > 0) parts.push(`${modelTrained} runs`);
      if (signalQualityThreshold !== null)
        parts.push(`SQ:${(signalQualityThreshold * 100).toFixed(0)}%`);
      if (tpPerformance) parts.push(tpPerformance);

      return `**ML Loop:** ${parts.join(" | ")}`;
    }

    return ""; // No ML data yet - graceful degradation
  } catch {
    return "";
  }
}

/** Fetch parameter tuner status - shows self-improving architecture state */
async function fetchParameterTuner(runtime: IAgentRuntime): Promise<string> {
  try {
    const tunerService = runtime.getService(
      "VINCE_PARAMETER_TUNER_SERVICE",
    ) as {
      getParameterStatus?: () => {
        thresholds: { minStrength?: number; minConfidence?: number };
        sourceWeights: Record<string, number>;
        recentAdjustments: Array<{
          param: string;
          oldVal: number;
          newVal: number;
          timestamp: string;
        }>;
        isModified: boolean;
      } | null;
    } | null;

    const status = tunerService?.getParameterStatus?.();
    if (!status) return "";

    const parts: string[] = [];

    // Show current thresholds
    if (status.thresholds?.minStrength !== undefined) {
      parts.push(`minStr=${(status.thresholds.minStrength * 100).toFixed(0)}%`);
    }
    if (status.thresholds?.minConfidence !== undefined) {
      parts.push(
        `minConf=${(status.thresholds.minConfidence * 100).toFixed(0)}%`,
      );
    }

    // Show if parameters have been modified from defaults
    if (status.isModified) {
      parts.push(`AUTO-TUNED`);
    }

    // Show recent adjustments (last 2); skip entries with missing data to avoid undefined:NaN%
    if (status.recentAdjustments?.length > 0) {
      const recent = status.recentAdjustments
        .slice(-2)
        .filter(
          (a) =>
            a.param != null &&
            typeof a.oldVal === "number" &&
            typeof a.newVal === "number",
        )
        .map(
          (a) =>
            `${a.param}:${(a.oldVal * 100).toFixed(0)}%→${(a.newVal * 100).toFixed(0)}%`,
        )
        .join(", ");
      if (recent) {
        parts.push(`[${recent}]`);
      }
    }

    if (parts.length > 0) {
      return `**Self-tuning:** ${parts.join(" | ")}`;
    }

    return "";
  } catch {
    return "";
  }
}

/** Fetch risk manager state - shows current risk exposure and circuit breaker status */
async function fetchRiskState(runtime: IAgentRuntime): Promise<string> {
  try {
    const riskService = runtime.getService("VINCE_RISK_MANAGER_SERVICE") as {
      getRiskState?: () => {
        isPaused: boolean;
        pauseReason?: string;
        dailyPnl: number;
        dailyPnlPct: number;
        currentDrawdown: number;
        currentDrawdownPct: number;
        circuitBreakerActive: boolean;
        todayTradeCount: number;
      } | null;
    } | null;

    const riskState = riskService?.getRiskState?.();
    if (!riskState) return "";

    const parts: string[] = [];

    // Daily P&L
    if (riskState.dailyPnl !== 0) {
      parts.push(
        `Day: ${riskState.dailyPnl >= 0 ? "+" : ""}$${riskState.dailyPnl.toFixed(0)} (${(riskState.dailyPnlPct * 100).toFixed(1)}%)`,
      );
    }

    // Drawdown
    if (riskState.currentDrawdownPct > 0) {
      parts.push(`DD: ${(riskState.currentDrawdownPct * 100).toFixed(1)}%`);
    }

    // Trade count
    if (riskState.todayTradeCount > 0) {
      parts.push(`${riskState.todayTradeCount} trades`);
    }

    // Status flags
    if (riskState.isPaused) {
      parts.push(`PAUSED: ${riskState.pauseReason || "risk limit"}`);
    }
    if (riskState.circuitBreakerActive) {
      parts.push(`CIRCUIT_BREAKER`);
    }

    if (parts.length > 0) {
      return `**Risk:** ${parts.join(" | ")}`;
    }

    return "";
  } catch {
    return "";
  }
}

/** Fetch portfolio summary - shows total value, return %, exposure */
async function fetchPortfolioSummary(runtime: IAgentRuntime): Promise<string> {
  try {
    const paperTrading = runtime.getService("VINCE_PAPER_TRADING_SERVICE") as {
      getStatus?: () => {
        portfolioValue: number;
        returnPct: number;
        openPositions: number;
      } | null;
    } | null;

    const status = await paperTrading?.getStatus?.();
    if (!status) return "";

    const parts: string[] = [];

    // Total value
    if (status.portfolioValue > 0) {
      parts.push(`$${status.portfolioValue.toFixed(0)}`);
    }

    // Return % (if |returnPct| > 10 assume already in percentage form to avoid -2603%-style double-multiplication)
    if (status.returnPct !== 0) {
      const pct =
        Math.abs(status.returnPct) > 10
          ? status.returnPct
          : status.returnPct * 100;
      parts.push(`ret:${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`);
    }

    // Open positions
    if (status.openPositions > 0) {
      parts.push(`${status.openPositions} positions`);
    }

    if (parts.length > 0) {
      return `**Portfolio:** ${parts.join(" | ")}`;
    }

    return "";
  } catch {
    return "";
  }
}

async function fetchGoalTracker(runtime: IAgentRuntime): Promise<string> {
  const goals = runtime.getService("VINCE_GOAL_TRACKER_SERVICE") as {
    getDailyProgress?: () => Promise<{
      pnlToday?: number;
      target?: number;
      pctComplete?: number;
    } | null>;
  } | null;
  const goalData =
    (await goals?.getDailyProgress?.().catch(() => null)) ?? null;
  return goalData?.target
    ? `**Daily goal:** $${goalData.pnlToday?.toFixed(0) ?? 0}/$${goalData.target} (${goalData.pctComplete?.toFixed(0) ?? 0}%)`
    : "";
}

async function fetchMandoMinutes(runtime: IAgentRuntime): Promise<string> {
  const newsSvc = runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") as {
    refreshData?: (force?: boolean) => Promise<void>;
    getTopHeadlines?: (
      limit: number,
    ) => Array<{ title: string; sentiment: string; impact: string }>;
    getVibeCheck?: () => string;
    getTLDR?: () => string;
    getOverallSentiment?: () => { sentiment: string; confidence: number };
  } | null;
  if (!newsSvc) return "";
  await newsSvc.refreshData?.(true);
  const vibeCheck = newsSvc.getVibeCheck?.() ?? "";
  const tldr = newsSvc.getTLDR?.() ?? "";
  const sentiment = newsSvc.getOverallSentiment?.();
  const headlines = newsSvc.getTopHeadlines?.(5) ?? [];
  const headlineLines = headlines.map((h) => {
    const dot =
      h.sentiment === "bullish"
        ? "🟢"
        : h.sentiment === "bearish"
          ? "🔴"
          : "⚪";
    return `${dot} ${h.title.slice(0, 80)}`;
  });
  return [
    vibeCheck ? `**MandoMinutes:** ${vibeCheck}` : "",
    sentiment
      ? `News sentiment: ${sentiment.sentiment} (${Math.round(sentiment.confidence)}% conf)`
      : "",
    tldr ? `TLDR: ${tldr}` : "",
    headlineLines.length > 0 ? `Headlines:\n${headlineLines.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function fetchAlliumOnChain(runtime: IAgentRuntime): Promise<string> {
  const allium = runtime.getService("VINCE_ALLIUM_SERVICE") as {
    isConfigured?: () => boolean;
    getStandupOnChainSummary?: () => Promise<string | null>;
  } | null;
  if (!allium?.isConfigured?.()) return "";
  return (await allium.getStandupOnChainSummary?.()) ?? "";
}

async function fetchLiquidations(runtime: IAgentRuntime): Promise<string> {
  const binanceLiq = runtime.getService(
    "VINCE_BINANCE_LIQUIDATION_SERVICE",
  ) as {
    getLiquidationPressure?: (symbol?: string) => {
      direction: string;
      intensity: number;
      longLiqsCount: number;
      shortLiqsCount: number;
      longLiqsValue: number;
      shortLiqsValue: number;
    };
  } | null;
  const pressure = binanceLiq?.getLiquidationPressure?.();
  if (
    !pressure ||
    (pressure.longLiqsCount === 0 && pressure.shortLiqsCount === 0)
  )
    return "";
  const dir =
    pressure.direction === "long_liquidations"
      ? "Longs"
      : pressure.direction === "short_liquidations"
        ? "Shorts"
        : "Mixed";
  return `**Liquidations (5m):** ${dir} | ${pressure.longLiqsCount} long ($${(pressure.longLiqsValue / 1000).toFixed(0)}k) / ${pressure.shortLiqsCount} short ($${(pressure.shortLiqsValue / 1000).toFixed(0)}k) | intensity ${pressure.intensity}%`;
}

async function fetchOIDelta(runtime: IAgentRuntime): Promise<string> {
  const coinglass = runtime.getService("VINCE_COINGLASS_SERVICE") as {
    getOpenInterest?: (
      asset: string,
    ) => { value: number; change24h: number | null } | null;
  } | null;
  if (!coinglass?.getOpenInterest) return "";
  const assets = getStandupTrackedAssets();
  const parts: string[] = [];
  for (const asset of assets.slice(0, 3)) {
    const oi = coinglass.getOpenInterest(asset);
    if (!oi) continue;
    const valueStr =
      oi.value >= 1e9
        ? `$${(oi.value / 1e9).toFixed(1)}B`
        : oi.value >= 1e6
          ? `$${(oi.value / 1e6).toFixed(0)}M`
          : `$${(oi.value / 1e3).toFixed(0)}k`;
    const changeStr =
      oi.change24h != null
        ? `${oi.change24h >= 0 ? "+" : ""}${oi.change24h.toFixed(1)}%`
        : "—";
    parts.push(`${asset} ${valueStr} (${changeStr})`);
  }
  return parts.length > 0 ? `**OI (24h Δ):** ${parts.join(" | ")}` : "";
}

async function fetchRegime(runtime: IAgentRuntime): Promise<string> {
  const regimeSvc = runtime.getService("VINCE_MARKET_REGIME_SERVICE") as {
    getRegime?: (asset: string) => Promise<{
      regime: string;
      adx: number | null;
      positionSizeMultiplier: number;
    } | null>;
  } | null;
  const regime =
    (await regimeSvc?.getRegime?.("BTC").catch(() => null)) ?? null;
  if (!regime) return "";
  const adxStr = regime.adx != null ? ` ADX ${regime.adx.toFixed(1)}` : "";
  return `**Regime (BTC):** ${regime.regime}${adxStr} | size ${regime.positionSizeMultiplier}x`;
}

/**
 * Fetch VINCE delta vs yesterday - compares current state to previous.
 * Uses a simple cache file to store previous run's key metrics.
 */
async function fetchVinceDelta(runtime: IAgentRuntime): Promise<string> {
  try {
    const cacheDir = path.join(process.cwd(), ".elizadb", "standup-cache");
    const cacheFile = path.join(cacheDir, "vince-last-state.json");

    // Get current state from services
    let currentPrice = "";
    let currentRegime = "";
    let currentSignal = "";

    // Try to get current price from enriched context
    try {
      const sigAgg = runtime.getService("VINCE_SIGNAL_AGGREGATOR_SERVICE") as {
        aggregateSignals?: (asset: string) => Promise<{
          direction?: string;
          confidence?: number;
        } | null>;
      } | null;
      const btcSignal = await sigAgg
        ?.aggregateSignals?.("BTC")
        .catch(() => null);
      if (btcSignal?.direction) {
        currentSignal = `${btcSignal.direction} (${btcSignal.confidence ?? 0}%)`;
      }
    } catch {}

    // Try to get current regime
    try {
      const vinceService = runtime.getService("VINCE_RUNTIME_SERVICE") as {
        getRegime?: () => Promise<{ regime: string } | null>;
      } | null;
      const regime = await vinceService?.getRegime?.();
      if (regime?.regime) {
        currentRegime = regime.regime;
      }
    } catch {}

    // Read previous state from cache
    let previousState: {
      price?: string;
      regime?: string;
      signal?: string;
      timestamp?: number;
    } = {};
    try {
      if (fs.existsSync(cacheFile)) {
        previousState = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      }
    } catch {}

    // Build delta string
    const deltas: string[] = [];

    if (previousState.signal && currentSignal) {
      if (previousState.signal !== currentSignal) {
        deltas.push(`Signal: ${previousState.signal} → ${currentSignal}`);
      }
    }

    if (previousState.regime && currentRegime) {
      if (previousState.regime !== currentRegime) {
        deltas.push(
          `Regime: ${previousState.regime} → ${currentRegime} (CHANGED)`,
        );
      }
    }

    // Save current state for next run
    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(
        cacheFile,
        JSON.stringify({
          signal: currentSignal,
          regime: currentRegime,
          timestamp: Date.now(),
        }),
      );
    } catch (writeErr) {
      logger.debug(
        { err: writeErr },
        "[STANDUP_DATA] Failed to write VINCE delta cache",
      );
    }

    return deltas.length > 0 ? deltas.join("\n") : "";
  } catch (err) {
    logger.debug({ err }, "[STANDUP_DATA] VINCE delta fetch failed");
    return "";
  }
}

export async function fetchVinceData(runtime: IAgentRuntime): Promise<string> {
  const blockLabels = [
    "Delta",
    "EnrichedContext",
    "FearGreed",
    "HIP3",
    "SignalAgg",
    "Deribit",
    "Binance",
    "PaperBot",
    "ML",
    "ParameterTuner",
    "RiskState",
    "PortfolioSummary",
    "Goals",
    "MandoMinutes",
    "Allium",
    "Liquidations",
    "OIDelta",
    "Regime",
  ];
  const results = await Promise.allSettled([
    fetchVinceDelta(runtime),
    fetchEnrichedContext(runtime),
    fetchFearGreed(runtime),
    fetchHIP3Pulse(runtime),
    fetchSignalAggregator(runtime),
    fetchDeribitDVOL(runtime),
    fetchBinanceTopTraders(runtime),
    fetchPaperBot(runtime),
    fetchMLStatus(runtime),
    fetchParameterTuner(runtime),
    fetchRiskState(runtime),
    fetchPortfolioSummary(runtime),
    fetchGoalTracker(runtime),
    fetchMandoMinutes(runtime),
    fetchAlliumOnChain(runtime),
    fetchLiquidations(runtime),
    fetchOIDelta(runtime),
    fetchRegime(runtime),
  ]);

  const lines: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      // Add section header for Delta
      if (blockLabels[i] === "Delta" && r.value) {
        lines.push(`### Delta vs Yesterday\n${r.value}`);
      } else {
        lines.push(r.value);
      }
    } else if (r.status === "rejected") {
      logger.warn(
        { err: r.reason, source: blockLabels[i] },
        "[STANDUP_DATA] VINCE block failed",
      );
    }
  });

  if (lines.length > 0) return lines.join("\n\n");

  // Fallback: read latest daily market brief from knowledge/research-daily/
  try {
    const briefDir = path.join(process.cwd(), "knowledge", "research-daily");
    if (fs.existsSync(briefDir)) {
      const briefs = fs
        .readdirSync(briefDir)
        .filter((f) => f.endsWith(".md") && f !== "README.md")
        .sort()
        .reverse();
      if (briefs.length > 0) {
        const latest = fs
          .readFileSync(path.join(briefDir, briefs[0]), "utf-8")
          .trim();
        const stripped = latest.replace(/^---[\s\S]*?---\s*/, "");
        const capped =
          stripped.length > 1100 ? stripped.slice(0, 1100) + "..." : stripped;
        logger.info(
          { file: briefs[0] },
          "[STANDUP_DATA] VINCE using daily brief fallback",
        );
        return `*(Live services unavailable -- using latest daily brief: ${briefs[0]})*\n\n${capped}`;
      }
    }
  } catch (briefErr) {
    logger.debug(
      { err: briefErr },
      "[STANDUP_DATA] VINCE daily brief fallback failed",
    );
  }

  return "*(Live data unavailable)*";
}

// ═══════════════════════════════════════════════════════════════════════
// ECHO: real CT sentiment from X (actual tweets, not a placeholder).
// When contextHints from VINCE are provided, builds 2-3 targeted queries.
// Sanitizes queries for X API; falls back to minimal "$BTC" if primary fails.
// ═══════════════════════════════════════════════════════════════════════

const X_QUERY_MAX_LEN = 200;

function sanitizeXQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ").slice(0, X_QUERY_MAX_LEN);
}

/**
 * Extract structured signals from tweets for the improved ECHO section.
 * Groups tweets by asset and extracts sentiment, narratives, and signals.
 */
interface AssetSignal {
  asset: string;
  sentiment: "bullish" | "bearish" | "neutral";
  sentimentConfidence: number;
  narrative: string;
  bullCase: string;
  bearCase: string;
  signal: "LONG" | "SHORT" | "SHIFT-UP" | "SHIFT-DOWN" | "FLIP-WATCH" | "HOLD";
  tweetCount: number;
}

function extractAssetSignalsFromTweets(
  tweets: Array<{
    text: string;
    author?: { username?: string };
    metrics?: { likeCount?: number };
  }>,
  trackedAssets: string[] = ["BTC", "SOL", "ETH", "HYPE"],
): AssetSignal[] {
  // Initialize asset signals
  const assetMap = new Map<string, AssetSignal>();
  for (const asset of trackedAssets) {
    assetMap.set(asset, {
      asset,
      sentiment: "neutral",
      sentimentConfidence: 50,
      narrative: "no clear narrative",
      bullCase: "",
      bearCase: "",
      signal: "HOLD",
      tweetCount: 0,
    });
  }

  // Keywords for sentiment analysis
  const bullishKeywords = [
    "bull",
    "long",
    "moon",
    "pump",
    "up",
    "breakout",
    "rally",
    "gain",
    "buy",
    "accumulation",
    "inflow",
    "etf",
  ];
  const bearishKeywords = [
    "bear",
    "short",
    "dump",
    "down",
    "crash",
    "sell",
    "outflow",
    "fear",
    "risk",
    "drop",
    "breakdown",
  ];

  // Process each tweet
  for (const tweet of tweets) {
    const text = tweet.text.toLowerCase();
    const mentions: string[] = [];

    // Find mentioned assets
    for (const asset of trackedAssets) {
      if (
        text.includes(asset.toLowerCase()) ||
        text.includes("$" + asset.toLowerCase())
      ) {
        mentions.push(asset);
      }
    }

    if (mentions.length === 0) mentions.push("BTC"); // Default to BTC if no specific asset

    // Determine sentiment
    let score = 0;
    for (const kw of bullishKeywords) if (text.includes(kw)) score++;
    for (const kw of bearishKeywords) if (text.includes(kw)) score--;

    const sentiment = score > 0 ? "bullish" : score < 0 ? "bearish" : "neutral";
    const confidence = Math.min(90, 50 + Math.abs(score) * 10);

    // Extract narrative (first 50 chars that aren't a hashtag or mention)
    const cleanText = tweet.text
      .replace(/@\w+/g, "")
      .replace(/#\w+/g, "")
      .trim();
    const narrative =
      cleanText.slice(0, 60) + (cleanText.length > 60 ? "..." : "");

    // Update asset signals
    for (const asset of mentions) {
      const existing = assetMap.get(asset)!;
      existing.tweetCount++;
      // Weighted update
      const oldWeight = existing.tweetCount - 1;
      const newWeight = existing.tweetCount;
      if (sentiment !== "neutral") {
        existing.sentiment = score > 0 ? "bullish" : "bearish";
        existing.sentimentConfidence = Math.round(
          (existing.sentimentConfidence * oldWeight + confidence) / newWeight,
        );
      }
      if (
        existing.narrative === "no clear narrative" ||
        existing.narrative.length < narrative.length
      ) {
        existing.narrative = narrative;
      }
      if (sentiment === "bullish") existing.bullCase = narrative;
      if (sentiment === "bearish") existing.bearCase = narrative;
    }
  }

  // Generate signals based on sentiment
  const results: AssetSignal[] = [];
  for (const [asset, signal] of assetMap) {
    if (signal.tweetCount === 0) continue;

    // Determine signal
    if (signal.sentiment === "bullish" && signal.sentimentConfidence > 60) {
      signal.signal = "LONG";
    } else if (
      signal.sentiment === "bearish" &&
      signal.sentimentConfidence > 60
    ) {
      signal.signal = "SHORT";
    } else if (
      signal.sentiment === "bullish" &&
      signal.sentimentConfidence > 50
    ) {
      signal.signal = "SHIFT-UP";
    } else if (
      signal.sentiment === "bearish" &&
      signal.sentimentConfidence > 50
    ) {
      signal.signal = "SHIFT-DOWN";
    } else {
      signal.signal = "HOLD";
    }

    results.push(signal);
  }

  return results.sort((a, b) => b.tweetCount - a.tweetCount);
}

function generateContrarianAlert(signals: AssetSignal[]): string {
  // Find consensus
  const bullish = signals.filter(
    (s) => s.sentiment === "bullish" && s.sentimentConfidence > 50,
  );
  const bearish = signals.filter(
    (s) => s.sentiment === "bearish" && s.sentimentConfidence > 50,
  );

  if (bullish.length > bearish.length) {
    return `Consensus: CT is ${bullish.length > 1 ? "bullish" : "leaning bullish"}. Edge: contrarians may be right in near-term.`;
  } else if (bearish.length > bullish.length) {
    return `Consensus: CT is ${bearish.length > 1 ? "bearish" : "leaning bearish"}. Edge: institutions may be accumulating.`;
  }
  return "No clear consensus in CT sentiment.";
}

function generateTakeaway(signals: AssetSignal[]): string {
  if (signals.length === 0) return "No actionable signals from CT.";

  const top = signals[0];
  if (top.signal === "LONG" || top.signal === "SHIFT-UP") {
    return `${top.asset}: CT ${top.sentiment} (${top.sentimentConfidence}% conf). Narrative: "${top.narrative}". → Consider long on momentum.`;
  } else if (top.signal === "SHORT" || top.signal === "SHIFT-DOWN") {
    return `${top.asset}: CT ${top.sentiment} (${top.sentimentConfidence}% conf). Narrative: "${top.narrative}". → Watch for shorts or wait for flip.`;
  }
  return `${top.asset}: CT neutral. No clear directional signal.`;
}

async function runXQueries(
  svc: {
    searchQuery: (opts: {
      query: string;
      maxResults?: number;
      hoursBack?: number;
      cacheTtlMs?: number;
    }) => Promise<
      Array<{
        id?: string;
        text: string;
        author?: { username?: string };
        metrics?: { likeCount?: number };
      }>
    >;
  },
  queries: string[],
  opts: { hoursBack: number; cacheTtlMs: number },
): Promise<
  Array<{
    id?: string;
    text: string;
    author?: { username?: string };
    metrics?: { likeCount?: number };
  }>
> {
  const allTweets: Array<{
    id?: string;
    text: string;
    author?: { username?: string };
    metrics?: { likeCount?: number };
  }> = [];
  const seen = new Set<string>();
  for (const query of queries) {
    const sanitized = sanitizeXQuery(query);
    if (!sanitized) continue;
    const tweets = await svc.searchQuery({
      ...opts,
      query: sanitized,
      maxResults: 10,
    });
    for (const t of tweets ?? []) {
      const key = (t as { id?: string }).id ?? t.text?.slice(0, 50) ?? "";
      if (key && !seen.has(key)) {
        seen.add(key);
        allTweets.push(t);
      }
    }
  }
  return allTweets;
}

export async function fetchEchoData(
  runtime: IAgentRuntime,
  contextHints?: string[],
): Promise<string> {
  // Fetch latest WTT (What's The Trade) for the standup
  let wttSection = "";
  try {
    const wttDir = path.join(
      process.cwd(),
      "docs",
      "standup",
      "whats-the-trade",
    );
    if (fs.existsSync(wttDir)) {
      const files = fs
        .readdirSync(wttDir)
        .filter((f) => f.endsWith("-whats-the-trade.md"))
        .sort()
        .reverse();
      if (files.length > 0) {
        const latestWtt = files[0];
        const wttContent = fs.readFileSync(
          path.join(wttDir, latestWtt),
          "utf-8",
        );
        // Extract key parts: thesis, direction, size
        const thesisMatch = wttContent.match(/\*\*.*?\*\*.*?\n\n([^\n]+)/);
        const directionMatch = wttContent.match(
          /(LONG|SHORT|HOLD).*?@\s*\$?[\d.]+/,
        );
        const thesis = thesisMatch ? thesisMatch[1].slice(0, 150) : "";
        const direction = directionMatch ? directionMatch[0].slice(0, 80) : "";
        if (thesis || direction) {
          wttSection = `\n> **Latest WTT:** ${direction || thesis}\n`;
        }
      }
    }
  } catch (e) {
    logger.debug({ err: e }, "[STANDUP] WTT fetch failed");
  }

  try {
    const xSearchMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/services/xSearch.service.js"
    ).catch(
      () => import("../../../plugin-x-research/src/services/xSearch.service"),
    );
    const xClientMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/services/xClient.service.js"
    ).catch(
      () => import("../../../plugin-x-research/src/services/xClient.service"),
    );

    const initXClientFromEnv = xClientMod.initXClientFromEnv as (
      r: IAgentRuntime,
    ) => void;
    const getXSearchService = xSearchMod.getXSearchService as () => {
      searchQuery: (opts: {
        query: string;
        maxResults?: number;
        hoursBack?: number;
        cacheTtlMs?: number;
      }) => Promise<
        Array<{
          text: string;
          author?: { username?: string };
          metrics?: { likeCount?: number };
        }>
      >;
    };

    initXClientFromEnv(runtime);
    const svc = getXSearchService();

    const hoursBack = 24;
    const cacheTtlMs = 30 * 60 * 1000;
    const opts = { hoursBack, cacheTtlMs };

    const queries: string[] = [];
    if (contextHints?.length) {
      const firstHint = contextHints[0];
      if (firstHint && /^(BTC|SOL|ETH|HYPE|HIP)/i.test(firstHint)) {
        const asset = firstHint.split(/\s/)[0];
        queries.push(`${asset} crypto sentiment`);
      }
      if (contextHints.some((h) => h.toLowerCase().includes("volume"))) {
        queries.push("crypto volume sentiment");
      }
    }
    queries.push("BTC crypto market sentiment");
    queries.push("ETH SOL HYPE crypto");
    queries.push("Uniswap Aave Morpho DeFi");
    queries.push("hyperliquid hypersurface");
    queries.push("macro Fed inflation crypto"); // autismcapital, blocknewsdotcom coverage
    // Stocks (our watchlist)
    queries.push("NVDA TSLA AAPL MAG7 stock market");
    // High-signal accounts (from @ikigailabsETH curated list)
    queries.push("elonmusk naval crypto tech");
    const uniqueQueries = [...new Set(queries)].slice(0, 7);

    let allTweets: Array<{
      id?: string;
      text: string;
      author?: { username?: string };
      metrics?: { likeCount?: number };
    }>;
    try {
      allTweets = await runXQueries(svc, uniqueQueries, opts);
    } catch (firstErr) {
      logger.warn(
        { err: firstErr, queries: uniqueQueries },
        "[STANDUP_DATA] fetchEchoData: primary queries failed, retrying with minimal",
      );
      try {
        allTweets = await runXQueries(svc, ["$BTC"], opts);
      } catch (fallbackErr) {
        logger.warn(
          { err: fallbackErr, lastQuery: "$BTC" },
          "[STANDUP_DATA] fetchEchoData: X unavailable",
        );
        return "**CT sentiment:** X API unavailable. Report from character knowledge only.";
      }
    }

    if (!allTweets.length)
      return "**CT sentiment:** No X data (check X_BEARER_TOKEN).";

    const tweetLines = allTweets.slice(0, 10).map((t) => {
      const handle = t.author?.username ?? "anon";
      const len = getStandupSnippetLen();
      const snippet =
        t.text?.length > len ? t.text.slice(0, len) + "…" : (t.text ?? "");
      return `@${handle}: ${snippet} (${t.metrics?.likeCount ?? 0} likes)`;
    });

    const queryNote =
      uniqueQueries.length > 1 ? ` [queries: ${uniqueQueries.join(", ")}]` : "";

    // Extract structured signals from tweets (improved format)
    const trackedAssets = getStandupTrackedAssets();
    const assetSignals = extractAssetSignalsFromTweets(
      allTweets,
      trackedAssets,
    );

    // VIBE-FOCUSED output - synthesize into a summary, don't show individual tweets
    let sentimentBlock = `## ECHO — CT VIBE (last 24h)

`;

    // Use LLM to synthesize vibe
    if (runtime.useModel) {
      try {
        const vibePrompt = `You are ECHO, the CT VIBE agent. Synthesize these tweets into a CONCISE vibe report.

Respond in exactly this format:

**What's HOT (+fomo):** [1-2 sentences - what's trending, exciting]
**What's FUD (-fear):** [1-2 sentences - what's worrying]
**NEW META:** [1 sentence - new narratives/protocols]
**CORE:** BTC [bullish/bearish/neutral + vibe] | ETH [vibe] | SOL [vibe] | HYPE [vibe]
**STOCKS (NVDA/TSLA/AAPL/MAG7):** [1 sentence - key stock sentiment or "not trending"]
**@hypersurfaceX:** [1 sentence or "not trending"]
**@elonmusk / @naval / @kevinWSHpod:** [1 sentence - key signal or "not trending"]
**@autismcapital / @blocknewsdotcom:** [1 sentence - macro/policy or "not trending"]

Curated from @ikigailabsETH follows. Note: @realDonaldTrump hasn't tweeted since early Feb 2026.

NO individual tweets. Synthesize the vibe.`;

        const vibeText = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt: `${vibePrompt}\n\nTweets:\n${allTweets
            .slice(0, 15)
            .map((t) => t.text)
            .join("\n---\n")}`,
          maxTokens: 400,
          temperature: 0.5,
        });
        const text = String(vibeText ?? "").trim();
        if (text && text.length > 30) {
          sentimentBlock += text;

          // Add X content idea
          const ideaPrompt = `Based on this vibe, suggest 1 punchy tweet hook for @ikigaistudioxyz. 1 sentence.`;
          const idea = await runtime.useModel(ModelType.TEXT_SMALL, {
            prompt: `${text}\n\n${ideaPrompt}`,
            maxTokens: 80,
            temperature: 0.7,
          });
          const ideaText = String(idea ?? "").trim();
          if (ideaText) {
            sentimentBlock += `\n\n**Draft X hook (you post):** ${ideaText}`;
          }
        } else {
          sentimentBlock += generateBasicVibe(allTweets);
        }
      } catch {
        sentimentBlock += generateBasicVibe(allTweets);
      }
    } else {
      sentimentBlock += generateBasicVibe(allTweets);
    }

    // Add WTT section if available
    if (wttSection) {
      sentimentBlock += wttSection;
    }

    return sentimentBlock;
  } catch (err) {
    logger.warn({ err }, "[STANDUP_DATA] fetchEchoData: failed");
    return "**CT Vibe:** X API unavailable.";
  }
}

// Basic vibe without LLM
function generateBasicVibe(
  tweets: Array<{ text: string; author?: { username?: string } }>,
): string {
  const texts = tweets.map((t) => t.text.toLowerCase());
  const bullish = texts.filter(
    (t) =>
      t.includes("bull") ||
      t.includes("moon") ||
      t.includes("pump") ||
      t.includes("up") ||
      t.includes("breakout"),
  ).length;
  const bearish = texts.filter(
    (t) =>
      t.includes("bear") ||
      t.includes("dump") ||
      t.includes("crash") ||
      t.includes("down") ||
      t.includes("fear"),
  ).length;
  const net = bullish - bearish;
  const vibe = net > 2 ? "bullish" : net < -2 ? "bearish" : "neutral";

  return `**Overall:** ${vibe.toUpperCase()} (${bullish} bullish vs ${bearish} bearish)

**What's HOT:** ${texts.some((t) => t.includes("etf") || t.includes("spot")) ? "ETF/spot momentum" : "General crypto"}
**What's FUD:** ${texts.some((t) => t.includes("crash") || t.includes("liquidate")) ? "Liquidation fears" : "No major FUD"}
**CORE:** BTC ${vibe} | ETH ${vibe} | SOL ${vibe} | HYPE ${vibe}`;
}

// ═══════════════════════════════════════════════════════════════════════
// Oracle: Polymarket priority markets (already real data, keep as-is)
// ═══════════════════════════════════════════════════════════════════════

export async function fetchOracleData(runtime: IAgentRuntime): Promise<string> {
  const sections: string[] = [];

  // Get priority markets for strike selection context
  try {
    const service = runtime.getService(
      PolymarketService.serviceType,
    ) as InstanceType<typeof PolymarketService> | null;

    if (!service) {
      return "**Status:** Polymarket service not loaded.\n\n**Action:** Oracle ready when used in chat.\n\n**Insight:** For strike selection, check Polymarket for BTC/ETH/SOL weekly expiry probabilities.";
    }

    const markets = await service.getMarketsByPreferredTags({ totalLimit: 8 });
    if (markets.length === 0) {
      return "**Status:** No VINCE-priority markets found.\n\n**Action:** Oracle discovery ready; no markets in scope yet.\n\n**Insight:** Add markets to VINCE priority list for strike selection.";
    }

    const rows: string[] = [];
    for (const m of markets) {
      const cid =
        m.conditionId ?? (m as { condition_id?: string }).condition_id ?? "—";
      const shortCid =
        cid.length > 12 ? `${cid.slice(0, 6)}...${cid.slice(-3)}` : cid;
      const prices = service.getPricesFromMarketPayload(m);
      const yesPct =
        prices?.yes_price != null
          ? `${(parseFloat(prices.yes_price) * 100).toFixed(0)}%`
          : "—";
      const question =
        (m.question ?? "").slice(0, 50) +
        (m.question && m.question.length > 50 ? "…" : "");
      rows.push(`| ${question} | ${yesPct} | \`${shortCid}\` |`);
    }

    sections.push(
      `**Priority Markets:**\n| Market | YES% | ID |\n|-------|------|----|\n${rows.join("\n")}`,
    );
  } catch (err) {
    logger.warn({ err }, "[STANDUP_DATA] Failed to fetch Oracle data");
    sections.push("**Status:** Polymarket fetch failed.");
  }

  // Add actionable insight for strike selection
  sections.push(
    "**Strike Insight:** Check top 2-3 markets for expiry probabilities — use for Hypersurface weekly strike selection (Solus's call).",
  );

  // Add edge status query
  sections.push(
    "**Edge Engine:** Ask Oracle for EDGE_STATUS to see if any edge opportunities are detected.",
  );

  // Add what to do next
  sections.push(
    "**Next:** Run EDGE_CHECK on BTC or ETH for potential strike signals.",
  );

  return sections.join("\n\n");
}

// ═══════════════════════════════════════════════════════════════════════
// Solus: directive referencing VINCE's data + last-week options strategy + portfolio + daily monitoring
// ═══════════════════════════════════════════════════════════════════════

const HYPERSURFACE_COIN_IDS = [
  "bitcoin",
  "ethereum",
  "solana",
  "hyperliquid",
] as const;

/** Strip README/meta blocks from weekly-options-context so "Last week's strategy" doesn't leak File location etc. */
function stripSolusMetaFromLastWeek(raw: string): string {
  if (!raw?.trim()) return raw;
  let s = raw.trim();
  s = s
    .replace(/^#\s+Weekly options context[\s\S]*?(?=\n##\s|\n\n##\s|$)/im, "")
    .trim();
  s = s
    .replace(/\n?##\s+File location\s*[\s\S]*?(?=\n##\s|\n###\s|$)/im, "")
    .trim();
  s = s
    .replace(/\n?##\s+File format\s*[\s\S]*?(?=\n##\s|\n###\s|$)/im, "")
    .trim();
  return s || raw;
}

function formatHypersurfaceSpotPrices(prices: Record<string, number>): string {
  const btc = prices.bitcoin;
  const eth = prices.ethereum;
  const sol = prices.solana;
  const hype = prices.hyperliquid;
  const parts: string[] = [];
  if (typeof btc === "number")
    parts.push(
      `BTC $${btc.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    );
  if (typeof eth === "number")
    parts.push(
      `ETH $${eth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    );
  if (typeof sol === "number")
    parts.push(
      `SOL $${sol.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    );
  if (typeof hype === "number")
    parts.push(
      `HYPE $${hype.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    );
  if (parts.length === 0) return "";
  return parts.join(", ");
}

export async function fetchSolusData(runtime: IAgentRuntime): Promise<string> {
  let spotBlock = "";
  const coingecko = runtime.getService("COINGECKO_SERVICE") as {
    getSimplePrices: (ids: string[]) => Promise<Record<string, number>>;
  } | null;
  if (coingecko?.getSimplePrices) {
    try {
      const prices = await coingecko.getSimplePrices([
        ...HYPERSURFACE_COIN_IDS,
      ]);
      const formatted = formatHypersurfaceSpotPrices(prices);
      if (formatted)
        spotBlock = `**Live spot (use these — do not guess):** [Hypersurface spot USD] ${formatted}\n\n`;
    } catch (err) {
      logger.debug(
        { err: err instanceof Error ? err.message : String(err) },
        "[Standup] Solus spot prices fetch failed",
      );
      spotBlock =
        "**Live spot:** Unavailable this run. Do not guess prices; if VINCE's section is in shared insights, use his BTC/ETH/SOL/HYPE.\n\n";
    }
  } else {
    spotBlock =
      "**Live spot:** CoinGecko not available. Do not guess prices; use VINCE's section for current levels if present.\n\n";
  }

  const {
    portfolioSection,
    openPositionsSection,
    lastWeekStrategy: lastWeekFromFile,
  } = getWeeklyOptionsContext();
  const lastWeek =
    process.env.SOLUS_LAST_WEEK_STRATEGY?.trim() ||
    stripSolusMetaFromLastWeek(lastWeekFromFile) ||
    "No last-week strategy context provided. Set SOLUS_LAST_WEEK_STRATEGY or create docs/standup/weekly-options-context.md (or STANDUP_DELIVERABLES_DIR).";

  const portfolioLine =
    portfolioSection.trim().length > 0
      ? `**Portfolio:** ${portfolioSection.trim().slice(0, 200)}${portfolioSection.length > 200 ? "…" : ""}\n\n`
      : "";

  const openPositionsBlock =
    openPositionsSection.trim().length > 0
      ? `**Current open positions:**\n${openPositionsSection.trim()}\n\n`
      : `**⚠️ CRITICAL: Current positions this week:**
- **HYPE:** Secured puts, strike $30 (collected premium, holding USDT collateral)
- **BTC:** Covered calls, strike $70,500 (holding BTC, hoping it stays below strike)

**Before giving ANY advice, you must know: What assets do we have positions on? What are our strikes?**

This determines what we should focus on and whether to consider BUYING BACK early.

`;

  const now = new Date();
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
  const isFriday = now.getDay() === 5;
  const isSettlementDay = isFriday;
  const dayContext = `**Today:** ${dayOfWeek}, ${now.toISOString().slice(0, 10)}. Hypersurface weekly options settle Friday ~09:00 Paris Time (08:00 UTC / 00:00 PT).${isSettlementDay ? " TODAY IS SETTLEMENT DAY — old positions expire today. Focus on the NEW week's strike." : ""}`;

  const hasOpen = hasOpenPositions();
  let yourJobBlock: string;
  if (isSettlementDay) {
    yourJobBlock = `**Your job (FRIDAY — settlement day):** Old positions settle today at ~09:00 Paris Time. (1) Final status of expiring position if any. (2) Propose NEXT WEEK's BTC covered call strike for Hypersurface (new weekly cycle starts now, settles next Friday ~09:00 Paris Time). State: strike price, direction (above/below), premium target, invalidation level. Use the LIVE SPOT PRICE above, not old context. Reference VINCE's section for regime/DVOL; Oracle's odds for confidence.`;
  } else if (hasOpen) {
    yourJobBlock = `**Your job (DAILY MONITORING):** This is no longer just Friday expiry — we track DAILY because we can BUY BACK early to unlock collateral!

(1) Current position status: strike, premium, distance to strike.
(2) **KEY QUESTION:** Is BTC approaching our $70,500 strike? If BTC is getting close to $70,250 and momentum is up, should we BUY BACK the covered call early to avoid selling at $70,500 when BTC might close at $72K+?
(3) Same for HYPE puts at $30 — if HYPE is rallying past $30, buy back early?
(4) **Thursday → check for early exercise/assignment risk** — if ITM, decide whether to roll.
Hypersurface settles Friday ~09:00 Paris Time.
State your call: HOLD, BUY BACK, or ROLL — and why.`;
  } else {
    yourJobBlock = `**Your job:** Given last week's position (above), propose this week's BTC covered call strike for Hypersurface (settle Friday ~09:00 Paris Time).
State: strike price, direction (above/below), premium target, invalidation level.
Reference the live spot prices above when present; otherwise VINCE's DVOL, funding, and regime. Reference Oracle's odds.
If uncertain (like last week), say so and explain why with data.`;
  }

  return `${dayContext}

${spotBlock}${portfolioLine}${openPositionsBlock}**Last week's strategy:** ${lastWeek}

**IMPORTANT: Use the LIVE SPOT PRICE above for your call. Never use prices from the "open positions" or "last week" context — those are stale.**

**Options context (use VINCE's data from shared insights above):**
Read VINCE's section for: BTC price, funding, L/S ratio, market regime, DVOL, best covered call strike, signal direction.
Read Oracle's section for: Polymarket odds that inform confidence.

${yourJobBlock}`;
}

// ═══════════════════════════════════════════════════════════════════════
// Sentinel: real git log + PRD scan + ProjectRadar + macro news (Tavily)
// ═══════════════════════════════════════════════════════════════════════

export async function fetchSentinelData(
  runtime: IAgentRuntime,
): Promise<string> {
  const sections: string[] = [];

  // 1. Real git log + branch + PR status
  try {
    const gitLog = await getRecentCodeContext(10);
    sections.push(gitLog);

    // Get current branch
    const { execSync } = await import("node:child_process");
    try {
      const branch = execSync(
        "git branch --show-current 2>/dev/null || echo ''",
        { encoding: "utf-8" },
      ).trim();
      if (branch) {
        // Check if there are uncommitted changes
        const status = execSync(
          "git status --porcelain 2>/dev/null | head -5",
          { encoding: "utf-8" },
        ).trim();
        const uncommitted = status
          ? ` (${status.split("\n").length} uncommitted)`
          : "";
        sections.push(`**Branch:** ${branch}${uncommitted}`);
      }
    } catch {
      /* git not available */
    }
  } catch {
    sections.push("Git log: unavailable.");
  }

  // 1b. What shipped this week (from git log - last 7 days)
  try {
    const { execSync } = await import("node:child_process");
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const since = weekAgo.toISOString().split("T")[0];
    const commits = execSync(
      `git log --since="${since}" --oneline --format="%s" 2>/dev/null | head -15`,
      { encoding: "utf-8" },
    ).trim();
    if (commits) {
      const lines = commits.split("\n").filter(Boolean);
      // Group by agent/feature
      const agentCommits: Record<string, string[]> = {};
      lines.forEach((c: string) => {
        const match = c.match(/^feat\((\w+)\)/);
        const agent = match ? match[1] : "other";
        if (!agentCommits[agent]) agentCommits[agent] = [];
        agentCommits[agent].push(c.replace(/^[^:]+: /, ""));
      });
      const summary = Object.entries(agentCommits)
        .map(([agent, msgs]) => `${agent}: ${msgs.slice(0, 3).join(", ")}`)
        .join(" | ");
      if (summary) {
        sections.push(`**Shipped this week:** ${summary}`);
      }
    }
  } catch {
    /* non-fatal */
  }

  // 2. PRD scan
  try {
    const prdDir = path.join(
      process.cwd(),
      process.env.STANDUP_DELIVERABLES_DIR || "docs/standup",
      "prds",
    );
    if (fs.existsSync(prdDir)) {
      const files = fs
        .readdirSync(prdDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .reverse()
        .slice(0, 3);
      if (files.length > 0)
        sections.push(`**Recent PRDs:** ${files.join(", ")}`);
    }
  } catch {
    /* non-fatal */
  }

  // 3. ProjectRadar (if Sentinel has the service)
  const radar = runtime.getService("PROJECT_RADAR_SERVICE") as {
    getProjectHealth?: () => Promise<{
      status?: string;
      blockers?: string[];
    } | null>;
    getOpenTODOs?: () => Promise<string[] | null>;
  } | null;
  if (radar) {
    try {
      const health =
        (await radar.getProjectHealth?.().catch(() => null)) ?? null;
      const todos = (await radar.getOpenTODOs?.().catch(() => null)) ?? null;
      if (health?.status)
        sections.push(
          `**Project:** ${health.status}${health.blockers?.length ? ` | Blockers: ${health.blockers.slice(0, 2).join(", ")}` : ""}`,
        );
      if (todos?.length)
        sections.push(`**TODOs:** ${todos.slice(0, 3).join("; ")}`);
    } catch {
      /* non-fatal */
    }
  }

  // 4. Macro news via Tavily
  try {
    const tavilyMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/utils/tavilySearch.js"
    ).catch(() => import("../../../plugin-x-research/src/utils/tavilySearch"));
    const tavilySearch = tavilyMod.tavilySearch as (
      query: string,
      r?: IAgentRuntime,
      maxResults?: number,
    ) => Promise<string[]>;
    const snippets = await tavilySearch(
      "crypto regulation Fed interest rates macro news today",
      runtime,
      3,
    );
    if (snippets?.length > 0)
      sections.push(`**Macro news:**\n${snippets.join("\n")}`);
  } catch {
    /* Tavily not available */
  }

  // 5. Docker / Mission Control status
  try {
    const { execSync } = await import("node:child_process");
    try {
      const dockerPs = execSync(
        "docker ps --filter 'name=mission-control' --format '{{.Status}}' 2>/dev/null || echo ''",
        { encoding: "utf-8" },
      ).trim();
      if (dockerPs) {
        sections.push(`**Docker (MC):** ${dockerPs}`);
      }
    } catch {
      /* docker not available */
    }
  } catch {
    /* non-fatal */
  }

  sections.push(
    "**Today's dev task (OpenClaw):** Using our OpenClaw setup as dev on the vince repo (IkigaiLabsETH/vince), what should we work on today? Consider: open PRDs, recent git activity, knowledge gaps, and agent improvements. One concrete task with expected outcome.",
  );

  sections.push(
    "**Your job:** Give a proper team overview:\n1. **What shipped** — summarize the week's commits (agent by agent)\n2. **What's next** — what should we focus on building/fixing\n3. **One architecture item** — any structural changes or learnings\n4. **Tech focus** — 1-2 specific things to prioritize (name the file, plugin, or feature)\n5. **Macro** — any news affecting trades\n\nBe concise but substantive. This is the team's compass.",
  );
  return sections.join("\n\n");
}

// ═══════════════════════════════════════════════════════════════════════
// Eliza: delta reporter — yesterday vs today, plus facts
// ═══════════════════════════════════════════════════════════════════════

/** Build delta summary: yesterday's Day Report vs today's shared insights. */
async function buildDeltaReport(): Promise<string> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayReport = await loadDayReport(yesterday);
  const todayInsights = await loadSharedDailyInsights(); // today
  const lines: string[] = [];
  if (yesterdayReport) {
    const solusMatch = yesterdayReport.match(
      /\*\*Solus'?s call:?\*\*\s*\[?([^\]]*)\]?\s*[—\-]\s*([^\n*]+)/i,
    );
    if (solusMatch) {
      lines.push(
        `**Yesterday:** Solus's call: ${solusMatch[1].trim()} — ${solusMatch[2].trim().slice(0, 120)}`,
      );
    }
    const tldrMatch = yesterdayReport.match(
      /(?:\*\*TL;DR:?\*\*\s*|TL;DR:\s*)([^\n#]+)/,
    );
    if (tldrMatch)
      lines.push(`**Yesterday TL;DR:** ${tldrMatch[1].trim().slice(0, 100)}`);
  } else {
    lines.push(
      "**Yesterday:** No day report found (first run or missing file).",
    );
  }
  if (todayInsights) {
    const vinceBlock = todayInsights.match(/## VINCE[\s\S]*?(?=## |$)/i);
    if (vinceBlock) {
      const firstTable = vinceBlock[0].match(
        /\|[^\n]+\|\n\|[^\n]+\|\n([\s\S]*?)(?=\n\n|\n\*\*|$)/,
      );
      if (firstTable)
        lines.push(
          `**Today (from shared insights):** ${firstTable[1].replace(/\n/g, " ").slice(0, 200)}`,
        );
      else lines.push("**Today:** Shared insights available (see full doc).");
    } else {
      lines.push("**Today:** Shared insights available.");
    }
  } else {
    lines.push("**Today:** Shared insights not yet built.");
  }
  lines.push(
    "**Your job:** Delta reporter — what changed since yesterday; was yesterday's Solus call tracking? One knowledge gap, one content idea, one cross-agent link.",
  );
  return lines.join("\n\n");
}

const DEFAULT_RECENT_UPLOADS_PREVIEW_MAX_CHARS = 200;

/** Strip frontmatter and take first line or first N chars of body for preview */
function extractPreview(content: string, maxChars: number): string {
  let body = content;
  const fmMatch = content.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
  if (fmMatch) body = content.slice(fmMatch[0].length);
  const afterFirstH2 = body.match(/\n##\s+([^\n]+)/);
  const firstLine = afterFirstH2
    ? afterFirstH2[1].trim()
    : (body
        .split(/\n/)
        .find((l) => l.trim().length > 0)
        ?.trim() ?? "");
  const fromBody = body.replace(/\s+/g, " ").trim().slice(0, maxChars);
  const preview =
    firstLine.length > 0 && firstLine.length <= maxChars ? firstLine : fromBody;
  return preview ? `${preview}${preview.length >= maxChars ? "…" : ""}` : "";
}

/** Get recent knowledge uploads (last 48 hours) for standup, with content preview for Substack/Research LLM */
async function getRecentUploads(): Promise<string> {
  try {
    const knowledgeRoot = path.join(process.cwd(), "knowledge");
    if (!fs.existsSync(knowledgeRoot)) {
      return "**Recent uploads:** Knowledge folder not found.";
    }

    const previewMax = Math.min(
      500,
      parseInt(
        process.env.STANDUP_RECENT_UPLOADS_PREVIEW_MAX_CHARS ??
          String(DEFAULT_RECENT_UPLOADS_PREVIEW_MAX_CHARS),
        10,
      ) || DEFAULT_RECENT_UPLOADS_PREVIEW_MAX_CHARS,
    );

    const now = Date.now();
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const recentFiles: {
      name: string;
      mtime: number;
      category: string;
      words: number;
      preview: string;
    }[] = [];

    const categories = fs.readdirSync(knowledgeRoot, { withFileTypes: true });
    for (const cat of categories) {
      if (!cat.isDirectory()) continue;
      const catPath = path.join(knowledgeRoot, cat.name);
      const files = fs.readdirSync(catPath, { withFileTypes: true });
      for (const f of files) {
        if (!f.isFile() || !f.name.endsWith(".md")) continue;
        const filePath = path.join(catPath, f.name);
        const stats = fs.statSync(filePath);
        const ageMs = now - stats.mtimeMs;
        if (ageMs < TWO_DAYS_MS) {
          let wordCount = 0;
          let preview = "";
          try {
            const content = fs.readFileSync(filePath, "utf-8");
            wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
            preview = extractPreview(content, previewMax);
          } catch {
            wordCount = 0;
          }
          recentFiles.push({
            name: f.name,
            mtime: stats.mtimeMs,
            category: cat.name,
            words: wordCount,
            preview,
          });
        }
      }
    }

    if (recentFiles.length === 0) {
      return "**Recent uploads:** No new uploads in last 48h.";
    }

    recentFiles.sort((a, b) => b.mtime - a.mtime);

    const top5 = recentFiles.slice(0, 5);
    const lines = top5.map((f) => {
      const nameWithoutExt = f.name.replace(/\.md$/, "");
      const truncated = nameWithoutExt.slice(0, 40);
      const sizeLabel = f.words > 2000 ? "📄" : f.words > 500 ? "📝" : "📋";
      const previewPart = f.preview ? ` — Preview: ${f.preview}` : "";
      return `- ${sizeLabel} **${f.category}:** ${truncated} (${f.words} words)${previewPart}`;
    });
    const more =
      recentFiles.length > 5 ? ` (+${recentFiles.length - 5} more)` : "";
    return `**Recent uploads (${recentFiles.length}):**\n${lines.join("\n")}${more}`;
  } catch (e) {
    logger.debug({ err: e }, "[STANDUP] Failed to get recent uploads");
    return "**Recent uploads:** Could not scan.";
  }
}

export async function fetchElizaData(runtime: IAgentRuntime): Promise<string> {
  const sections: string[] = [];
  try {
    const delta = await buildDeltaReport();
    sections.push(delta);
  } catch (e) {
    logger.warn(
      { err: e },
      "[STANDUP_DATA] fetchElizaData: delta build failed",
    );
    sections.push(
      "**Delta:** Could not load yesterday vs today; report from memory only.",
    );
  }

  // Recent uploads
  try {
    const uploads = await getRecentUploads();
    sections.push(uploads);
  } catch (e) {
    logger.debug({ err: e }, "[STANDUP] Recent uploads failed");
  }

  // Stale knowledge categories (from FRESHNESS.md)
  try {
    const freshnessPath = path.join(process.cwd(), "knowledge", "FRESHNESS.md");
    if (fs.existsSync(freshnessPath)) {
      const freshness = fs.readFileSync(freshnessPath, "utf-8");
      // Extract high-priority stale categories
      const highPriorityMatch = freshness.match(
        /\*\*High priority\*\*[\s\S]*?\|(\s*\d+\s*)\|/,
      );
      if (highPriorityMatch) {
        // Get category names from the table
        const staleLines = freshness
          .split("\n")
          .filter(
            (line) =>
              line.includes("kelly-btc") ||
              line.includes("macro-economy") ||
              line.includes("ai-crypto") ||
              line.includes("stocks"),
          )
          .slice(0, 4);
        if (staleLines.length > 0) {
          const staleCats = staleLines
            .map((l) => {
              const match = l.match(/`([^`]+)`/);
              return match ? match[1].split("/")[0] : null;
            })
            .filter(Boolean)
            .slice(0, 3);
          if (staleCats.length > 0) {
            sections.push(
              `**Stale categories (update needed):** ${staleCats.join(", ")}`,
            );
          }
        }
      }
    }
  } catch (e) {
    logger.debug({ err: e }, "[STANDUP] Freshness check failed");
  }

  try {
    const facts = await runtime.getMemories({
      tableName: "facts",
      count: 8,
      unique: true,
    });
    const factLines = facts
      .filter((f) => f.content?.text)
      .slice(0, 5)
      .map(
        (f) => `- ${String(f.content.text).slice(0, getStandupSnippetLen())}`,
      );
    if (factLines.length > 0)
      sections.push(
        `**Recent facts in memory (${factLines.length}):**\n${factLines.join("\n")}`,
      );
    else sections.push("**Recent facts:** None stored yet.");
  } catch {
    sections.push("**Facts:** Query failed.");
  }

  // Substack + knowledge expansion + research suggestions via LLM (with clear labels)
  if (runtime.useModel) {
    try {
      const context = sections.join("\n");
      const suggestion = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: `You are Eliza (CEO, Knowledge & Research). Based on today's standup context below, output exactly three labeled lines. PRIORITIZE the "Recent uploads" and "Stale categories" sections. Focus on AI agents, OpenClaw, DeFi, options/perps, macro, lifestyle. SKIP memes, memetics, NFTs:

**Substack idea:** [One specific substack essay with a CONTRARIAN or UNIQUE angle — MUST reference a specific upload. E.g., "Write: Hyperliquid at $30 is the bear case for the next bull — hook: We watched $1→$60, missed 8-figures, still bullish." Include: topic + hook + angle.]

**Knowledge to expand:** [One specific file to update in knowledge/ — E.g., "Update kelly-btc/satoshis-knowledge/bitcoin/latest.md with current BTC price and MSTR holdings" or "Add Hyperliquid section to defi-metrics/README.md". Name the exact file and what to add.]

**Research to do:** [One specific topic or question to research, inspired by recent uploads. E.g., "Compare Hyperliquid OI growth to Binance in the last 30 days" or "Update macro-economy with latest Fed dot plot and Warsh odds."]

One sentence each. No filler, no intro.

Context:
${context}`,
        maxTokens: 400,
        temperature: 0.7,
      });
      const text = String(suggestion ?? "").trim();
      if (text && text.length > 20) {
        const hasLabels =
          text.includes("**Substack idea:**") ||
          text.includes("**Knowledge to expand:**") ||
          text.includes("**Research to do:**");
        if (hasLabels) {
          sections.push(text);
        } else {
          const lines = text.split("\n").filter((l) => l.trim());
          sections.push(`**Substack idea:** ${lines[0] ?? text}`);
          if (lines[1]) sections.push(`**Knowledge to expand:** ${lines[1]}`);
          if (lines[2]) sections.push(`**Research to do:** ${lines[2]}`);
        }
      }
    } catch {
      sections.push(
        "**Substack idea:** [LLM unavailable -- suggest based on yesterday's delta]",
      );
      sections.push(
        "**Knowledge to expand:** [LLM unavailable -- review knowledge/INDEX.md for stale categories]",
      );
      sections.push(
        "**Research to do:** [LLM unavailable -- pick one topic from Recent uploads to research]",
      );
    }
  } else {
    sections.push(
      "**Substack idea:** Review yesterday's delta for a timely Ikigai Studio topic.",
    );
    sections.push(
      "**Knowledge to expand:** Check knowledge/FRESHNESS.md for stale categories to update.",
    );
    sections.push(
      "**Research to do:** Pick one topic from Recent uploads to research (e.g. OI comparison, Fed odds).",
    );
  }

  return sections.join("\n\n");
}

// ═══════════════════════════════════════════════════════════════════════
// Otaku: wallet setup in progress — concrete next steps
// ═══════════════════════════════════════════════════════════════════════

export async function fetchOtakuData(_runtime: IAgentRuntime): Promise<string> {
  return `**Status:** Under construction -- no wallet execution yet.

**Steps to get operational:**
1. Configure Bankr wallet (Base + Solana) -- set EVM_PRIVATE_KEY and SOLANA_PRIVATE_KEY in .env
2. Test with plugin-evm / plugin-solana: simple token balance check
3. Once balance check works, enable DefiLlama yield scanning (already loaded)

**Today's task:** Complete step 1 -- generate or import wallet keys and verify Bankr connection. Report: wallet address, chain, balance.

*Watching team reports for DeFi opportunities to queue once wallet is live.*`;
}

// ═══════════════════════════════════════════════════════════════════════
// Clawterm: OpenClaw skills, setup, trending articles on X + web.
// LLM summary so the standup section adds value within the cap.
// ═══════════════════════════════════════════════════════════════════════

const CLAWTERM_X_MAX = 10;
const CLAWTERM_HOURS_BACK = 24;

export async function fetchClawtermData(
  runtime: IAgentRuntime,
  contextHints?: string[],
): Promise<string> {
  try {
    const xSearchMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/services/xSearch.service.js"
    ).catch(
      () => import("../../../plugin-x-research/src/services/xSearch.service"),
    );
    const xClientMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/services/xClient.service.js"
    ).catch(
      () => import("../../../plugin-x-research/src/services/xClient.service"),
    );
    const tavilyMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/utils/tavilySearch.js"
    ).catch(() => import("../../../plugin-x-research/src/utils/tavilySearch"));

    const getXSearchService = xSearchMod.getXSearchService as () => {
      searchQuery: (opts: {
        query: string;
        maxResults?: number;
        hoursBack?: number;
        cacheTtlMs?: number;
      }) => Promise<
        Array<{
          id: string;
          text: string;
          author?: { username?: string };
          metrics?: { likeCount?: number };
        }>
      >;
    };
    const initXClientFromEnv = xClientMod.initXClientFromEnv as (
      r: IAgentRuntime,
    ) => void;
    const tavilySearch = tavilyMod.tavilySearch as (
      query: string,
      r?: IAgentRuntime,
      maxResults?: number,
    ) => Promise<string[]>;

    initXClientFromEnv(runtime);
    const searchService = getXSearchService();

    const cacheOpts = {
      hoursBack: CLAWTERM_HOURS_BACK,
      cacheTtlMs: 60 * 60 * 1000,
    };
    const queries: string[] = [
      "OpenClaw skills trending",
      "OpenClaw setup tips tutorial",
      "OpenClaw popular articles",
    ];
    if (contextHints?.length) {
      const first = contextHints[0];
      if (first && /^(BTC|SOL|ETH|HYPE)/i.test(first.split(/\s/)[0])) {
        queries.push(`${first.split(/\s/)[0]} OpenClaw agents`);
      }
    }
    const tweetPromises = queries.slice(0, 3).map((q) =>
      searchService.searchQuery({
        ...cacheOpts,
        query: q,
        maxResults: CLAWTERM_X_MAX,
      }),
    );
    const results = await Promise.all(tweetPromises);
    const combined = results.flat();
    const byId = new Map(combined.map((t) => [t.id, t]));
    const deduped = Array.from(byId.values()).slice(0, 15);

    const formatOne = (t: {
      text: string;
      author?: { username?: string };
      metrics?: { likeCount?: number };
    }) => {
      const handle = t.author?.username ?? "unknown";
      const snippetLen = getStandupSnippetLen();
      const snippet =
        t.text.length > snippetLen ? t.text.slice(0, snippetLen) + "…" : t.text;
      const likes = t.metrics?.likeCount ?? 0;
      return `@${handle}: ${snippet} (${likes} likes)`;
    };

    const rawXBlock =
      deduped.length > 0
        ? deduped.map(formatOne).join("\n")
        : "No recent X posts about OpenClaw in the last 24h.";

    const webSnippets = await tavilySearch(
      "OpenClaw skills setup tutorial news",
      runtime,
      3,
    );
    const rawWebBlock = webSnippets.length > 0 ? webSnippets.join("\n") : "";

    const rawData = `=== X (OpenClaw) ===\n${rawXBlock}${rawWebBlock ? `\n\n=== Web ===\n${rawWebBlock}` : ""}`;

    if (runtime.useModel) {
      try {
        const summary = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt: `You are Clawterm, the OpenClaw terminal. Summarize the data below for the daily standup in 2-4 sentences. Focus on: what OpenClaw skills are trending, any setup tips or popular articles, what builders are shipping. Be concrete and specific. No filler intros, no AI slop (banned: leverage, utilize, streamline, robust, cutting-edge, game-changer, synergy, delve, landscape, dive into). If the data is thin, say so in one sentence. End with **one concrete tech-focus suggestion**: what the team should focus on or try next (OpenClaw skill, setup, or tooling). Be specific and actionable — name the skill or tool.\n\nData:\n${rawData}`,
          maxTokens: 300,
          temperature: 0.5,
        });
        const text = String(summary ?? "").trim();
        if (text && text.length > 30) return text;
      } catch (err) {
        logger.debug(
          { err },
          "[STANDUP_DATA] Clawterm LLM summary failed, using raw",
        );
      }
    }

    return rawData;
  } catch (err) {
    logger.warn(
      { err },
      "[STANDUP_DATA] fetchClawtermData: X/Tavily unavailable, using fallback",
    );
    return "OpenClaw data: run CLAWTERM_DAY_REPORT in chat for full report; here report gateway status and one take from knowledge.";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Router: fetch data for a specific agent by name
// ═══════════════════════════════════════════════════════════════════════

export async function fetchAgentData(
  runtime: IAgentRuntime,
  agentName: string,
  contextHints?: string[],
): Promise<string | null> {
  const normalized = agentName.toLowerCase();

  switch (normalized) {
    case "vince": {
      if (process.env.STANDUP_VINCE_USE_REPORT === "true") {
        try {
          const { generateStandupReport } =
            await import("../../../plugin-vince/src/actions/report.action");
          const report = await generateStandupReport(runtime);
          if (report?.trim()) return report.trim();
        } catch (err) {
          logger.warn(
            { err },
            "[STANDUP_DATA] VINCE report-for-standup failed, falling back to fetchVinceData",
          );
        }
      }
      return fetchVinceData(runtime);
    }
    case "echo":
      return fetchEchoData(runtime, contextHints);
    case "oracle":
      return fetchOracleData(runtime);
    case "solus":
      return fetchSolusData(runtime);
    case "otaku":
      return fetchOtakuData(runtime);
    case "sentinel":
      return fetchSentinelData(runtime);
    case "clawterm":
      return fetchClawtermData(runtime, contextHints);
    case "eliza":
      return fetchElizaData(runtime);
    case "naval":
      return fetchNavalData(runtime);
    case "health":
      return fetchStandupHealth(runtime);
    default:
      return null;
  }
}

// Naval: philosophy, frameworks, team guidance
export async function fetchNavalData(runtime: IAgentRuntime): Promise<string> {
  const sections: string[] = [];

  // Quote/wisdom for the day - short and punchy
  if (runtime.useModel) {
    try {
      const wisdom = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: `Give one short Naval-style insight relevant to running a crypto trading project with AI agents. 1-2 sentences max. Include the theme: push not pull, thesis first, agents as leverage, or wealth compounding.`,
        maxTokens: 80,
        temperature: 0.6,
      });
      const text = String(wisdom ?? "").trim();
      if (text && text.length > 10) {
        sections.push(`**Today's Naval:** ${text}`);
      }
    } catch {
      /* non-fatal */
    }
  }

  // Team framework - what's the mental model for the team
  sections.push(
    "**Team Frameworks:** Push not pull. Thesis first. Signal not hype. Paper before live. One team, one dream.",
  );

  // Agent philosophy - leverage lesson
  sections.push(
    "**AI as Leverage:** Build agents that compound. They work while you sleep. OpenClaw + ElizaOS = labor + code leverage. VINCE = our first product.",
  );

  // Career audit / OpenClaw guidance
  sections.push(
    "**OpenClaw Path:** Build specific knowledge. Ship early. Let agents do the work. Compound the edge.",
  );

  return sections.join("\n\n");
}
