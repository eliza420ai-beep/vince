import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from "@elizaos/core";
import {
  getStockForTicker,
  SOLUS_OFFCHAIN_STOCKS,
  type SolusOffchainStock,
} from "../constants/solusStockWatchlist";
import type { FinnhubService } from "../services/finnhub.service";
import type { AlphaVantageService } from "../services/alphaVantage.service";
import type { FMPService } from "../services/fmp.service";
import { computeStockScorecard } from "../utils/stockScoring";
import { isSolus } from "../utils/solus";

interface RadarRow {
  stock: SolusOffchainStock;
  price: number | null;
  dayChangePct: number | null;
  score: ReturnType<typeof computeStockScorecard>;
}

function wantsThemeRadar(text: string): boolean {
  const t = (text || "").toLowerCase();
  return (
    t.includes("theme radar") ||
    t.includes("smartest ai stock trade") ||
    t.includes("ai stock trade this week") ||
    t.includes("outside the box") ||
    (t.includes("ai") && t.includes("stocks") && t.includes("week"))
  );
}

function confidenceLabel(score: number): "high" | "medium" | "low" {
  if (score >= 75) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function catalystWindow(stock: SolusOffchainStock): string {
  if (stock.keyCatalysts.some((k) => k.includes("earnings")))
    return "1-3 weeks";
  if (stock.keyCatalysts.some((k) => k.includes("permit")))
    return "1-2 quarters";
  return "2-8 weeks";
}

function invalidationFor(stock: SolusOffchainStock): string {
  switch (stock.theme) {
    case "ai_power":
      return "Power demand softens or permitting bottlenecks clear faster than expected.";
    case "hosting_conversion":
      return "Conversion milestones slip and hosting utilization trends down.";
    case "grid_equipment":
      return "Grid capex cycle pauses and backlog contracts.";
    case "outsourcing_disruption":
      return "AI adoption stalls and legacy spend rebounds.";
    case "gpu_platform":
      return "Hyperscaler AI capex guidance is cut materially.";
    default:
      return "Thesis catalyst fails to materialize.";
  }
}

function causalChainFor(stock: SolusOffchainStock): string {
  switch (stock.theme) {
    case "ai_power":
      return "AI demand surge -> power scarcity -> pricing leverage for generation/fuel suppliers.";
    case "hosting_conversion":
      return "GPU demand bottleneck -> mining-site conversion -> monetization of pre-permitted power sites.";
    case "grid_equipment":
      return "Interconnect delays -> utility upgrade rush -> order strength for grid hardware.";
    case "outsourcing_disruption":
      return "Code automation adoption -> labor-arbitrage pressure -> share shift to AI-native operators.";
    case "gpu_platform":
      return "Model scaling race -> sustained accelerator demand -> platform leaders keep pricing power.";
    default:
      return "Narrative momentum -> bottleneck monetization -> earnings revision upside.";
  }
}

async function getQuoteAndMetrics(
  runtime: IAgentRuntime,
  ticker: string,
): Promise<{
  price: number | null;
  dayChangePct: number | null;
  metrics: Awaited<ReturnType<FMPService["getKeyMetrics"]>> | null;
}> {
  const finnhub = runtime.getService("FINNHUB_SERVICE") as
    | FinnhubService
    | null
    | undefined;
  const alpha = runtime.getService("ALPHA_VANTAGE_SERVICE") as
    | AlphaVantageService
    | null
    | undefined;
  const fmp = runtime.getService("FMP_SERVICE") as
    | FMPService
    | null
    | undefined;

  const quote =
    finnhub?.isConfigured?.() && finnhub
      ? await finnhub.getQuote(ticker)
      : await alpha?.getQuote(ticker);
  const metrics = fmp?.isConfigured?.()
    ? await fmp.getKeyMetrics(ticker)
    : null;

  return {
    price: quote?.c ?? null,
    dayChangePct: quote?.dp ?? null,
    metrics: metrics ?? null,
  };
}

function fmtPx(px: number | null): string {
  if (typeof px !== "number" || Number.isNaN(px)) return "n/a";
  return `$${px.toFixed(2)}`;
}

function fmtDp(dp: number | null): string {
  if (typeof dp !== "number" || Number.isNaN(dp)) return "n/a";
  const s = dp >= 0 ? `+${dp.toFixed(2)}` : dp.toFixed(2);
  return `${s}%`;
}

export const solusThemeRadarAction: Action = {
  name: "SOLUS_THEME_RADAR",
  description:
    "Outside-the-box AI stock theme radar: top opportunities and traps using bottleneck scoring.",
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (!isSolus(runtime)) return false;
    return wantsThemeRadar(message.content?.text || "");
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const text = message.content?.text || "";
    const mentionedTickers = SOLUS_OFFCHAIN_STOCKS.map((s) => s.ticker).filter(
      (t) => text.toUpperCase().includes(t),
    );
    const universe = (
      mentionedTickers.length
        ? mentionedTickers
        : SOLUS_OFFCHAIN_STOCKS.map((s) => s.ticker)
    ).slice(0, 12);

    const rows: RadarRow[] = [];
    for (const ticker of universe) {
      const stock = getStockForTicker(ticker);
      if (!stock) continue;
      const { price, dayChangePct, metrics } = await getQuoteAndMetrics(
        runtime,
        ticker,
      );
      const score = computeStockScorecard({
        stock,
        quoteChangePct: dayChangePct,
        peRatio: metrics?.peRatio,
        revenueGrowth: metrics?.revenueGrowth,
        profitMargin: metrics?.profitMargin,
        debtToEquity: metrics?.debtToEquity,
        returnOnEquity: metrics?.returnOnEquity,
        beta: metrics?.beta,
        hasUpcomingEarnings: Boolean(metrics?.nextEarnings),
      });
      rows.push({ stock, price, dayChangePct, score });
    }

    if (rows.length === 0) {
      if (callback) {
        await callback({
          text: "No stock data available for Theme Radar right now.",
          actions: ["SOLUS_THEME_RADAR"],
        });
      }
      return;
    }

    const opportunities = [...rows]
      .sort((a, b) => b.score.netEdgeScore - a.score.netEdgeScore)
      .filter((r) => r.score.recommendation !== "avoid")
      .slice(0, 3);
    const traps = [...rows]
      .sort((a, b) => a.score.netEdgeScore - b.score.netEdgeScore)
      .slice(0, 2);

    const lines: string[] = ["**Theme Radar**", ""];
    lines.push("Top opportunities:");
    for (const row of opportunities) {
      lines.push(
        `- ${row.stock.ticker} (${row.stock.theme}) · ${row.score.recommendation.toUpperCase()} · score ${row.score.netEdgeScore} (${confidenceLabel(row.score.netEdgeScore)} confidence) · px ${fmtPx(row.price)} (${fmtDp(row.dayChangePct)})`,
      );
      lines.push(
        `  causal chain: ${causalChainFor(row.stock)} catalyst window: ${catalystWindow(row.stock)} invalidation: ${invalidationFor(row.stock)}`,
      );
    }
    lines.push("");
    lines.push("Crowded traps:");
    for (const row of traps) {
      lines.push(
        `- ${row.stock.ticker} (${row.stock.theme}) · ${row.score.recommendation.toUpperCase()} · score ${row.score.netEdgeScore} · trap risk: valuation/execution mismatch`,
      );
      lines.push(`  break condition: ${invalidationFor(row.stock)}`);
    }
    lines.push("");
    lines.push(
      "Research mode only: no execution. For option deployment and live perps flow, handoff remains unchanged.",
    );

    const output = lines.join("\n");
    logger.info("[SolusThemeRadar] Generated theme radar output.");

    if (callback) {
      await callback({
        text: output,
        actions: ["SOLUS_THEME_RADAR"],
      });
    }
  },
  similes: ["THEME_RADAR", "AI_STOCK_THEME_RADAR", "OUTSIDE_THE_BOX_STOCKS"],
};
