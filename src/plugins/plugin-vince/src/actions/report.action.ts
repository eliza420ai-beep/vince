/**
 * VINCE Report of the Day Action
 *
 * On-demand long-form report combining ALOHA, OPTIONS, PERPS, HIP-3, and NEWS
 * into a single X-ready article (~800-1200 words). Triggered by "report", "report of the day",
 * "write up", "article". Uses the same data sources as the individual quick actions
 * but produces one cohesive narrative optimized for pasting into X.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { BullBearAnalyzer } from "../analysis/bullBearAnalyzer";
import type { AnalysisResult } from "../types/analysis";
import { CORE_ASSETS } from "../constants/targetAssets";
import type { VinceDeribitService } from "../services/deribit.service";
import type { VinceCoinGlassService } from "../services/coinglass.service";
import type { VinceSignalAggregatorService } from "../services/signalAggregator.service";
import type { VinceTopTradersService } from "../services/topTraders.service";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";

// ==========================================
// Build combined data context from 5 sources
// ==========================================

async function buildReportDataContext(runtime: IAgentRuntime): Promise<string> {
  const lines: string[] = [];
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  lines.push(`=== REPORT DATA · ${date} ===`);
  lines.push("");

  // --- 1. CRYPTO (ALOHA-style via BullBearAnalyzer) ---
  try {
    const analyzer = new BullBearAnalyzer();
    const coreResults: Map<string, AnalysisResult> = new Map();
    for (const asset of CORE_ASSETS) {
      try {
        const result = await analyzer.analyze(runtime, asset);
        coreResults.set(asset, result);
      } catch {
        // Skip failed asset
      }
    }

    lines.push("=== CRYPTO (ALOHA) ===");
    for (const [asset, result] of coreResults) {
      const s = result.snapshot;
      const c = result.conclusion;
      const change =
        s.priceChange24h != null
          ? `${s.priceChange24h >= 0 ? "+" : ""}${s.priceChange24h.toFixed(2)}%`
          : "—";
      lines.push(
        `${asset}: $${s.spotPrice?.toLocaleString() ?? "—"} (${change}) · ${c.direction} (${c.conviction.toFixed(0)}% conviction) · ${c.recommendation}`,
      );
    }
    const btc = coreResults.get("BTC");
    if (btc?.snapshot) {
      const s = btc.snapshot;
      if (s.fearGreedValue != null)
        lines.push(
          `Fear/Greed: ${s.fearGreedValue} (${s.fearGreedLabel ?? "—"})`,
        );
      if (s.fundingRate != null)
        lines.push(`BTC Funding: ${(s.fundingRate * 100).toFixed(4)}%`);
      if (s.longShortRatio != null)
        lines.push(`L/S: ${s.longShortRatio.toFixed(2)}`);
      if (s.dvol != null) lines.push(`BTC DVOL: ${s.dvol.toFixed(1)}%`);
      if (s.hasRiskEvents) lines.push("ACTIVE RISK EVENTS IN NEWS");
    }
    lines.push("");
  } catch (e) {
    logger.warn(`[VINCE_REPORT] Crypto context failed: ${e}`);
  }

  // --- 2. OPTIONS (Deribit + CoinGlass) ---
  try {
    const deribitService = runtime.getService(
      "VINCE_DERIBIT_SERVICE",
    ) as VinceDeribitService | null;
    const coinglassService = runtime.getService(
      "VINCE_COINGLASS_SERVICE",
    ) as VinceCoinGlassService | null;

    if (deribitService) {
      lines.push("=== OPTIONS ===");
      const optionsAssets: ("BTC" | "ETH")[] = ["BTC", "ETH"];
      for (const asset of optionsAssets) {
        try {
          const ctx = await deribitService.getOptionsContext(asset);
          if (ctx?.spotPrice != null) {
            lines.push(`${asset}: $${ctx.spotPrice.toLocaleString()}`);
            if (ctx.dvol != null) lines.push(`  DVOL: ${ctx.dvol.toFixed(1)}%`);
            if (ctx.ivSurface) {
              lines.push(
                `  Skew: ${ctx.ivSurface.skewInterpretation} (${ctx.ivSurface.skew?.toFixed(1) ?? "—"}%)`,
              );
              lines.push(
                `  25Δ Put IV: ${ctx.ivSurface.put25DeltaIV?.toFixed(1) ?? "—"}%`,
              );
            }
            if (ctx.bestCashSecuredPuts?.length > 0) {
              const p = ctx.bestCashSecuredPuts[0];
              const otm =
                ctx.spotPrice > 0
                  ? (
                      ((ctx.spotPrice - p.strike) / ctx.spotPrice) *
                      100
                    ).toFixed(1)
                  : "—";
              lines.push(
                `  Best put: $${p.strike.toLocaleString()} (${otm}% OTM) @ ${p.yield7Day?.toFixed(2) ?? "—"}%/week`,
              );
            }
            if (ctx.bestCoveredCalls?.length > 0) {
              const c = ctx.bestCoveredCalls[0];
              const otm =
                ctx.spotPrice > 0
                  ? (
                      ((c.strike - ctx.spotPrice) / ctx.spotPrice) *
                      100
                    ).toFixed(1)
                  : "—";
              lines.push(
                `  Best call: $${c.strike.toLocaleString()} (${otm}% OTM) @ ${c.yield7Day?.toFixed(2) ?? "—"}%/week`,
              );
            }
          }
        } catch {
          // Skip asset
        }
      }
      if (coinglassService) {
        await coinglassService.refreshData();
        const fg = coinglassService.getFearGreed();
        if (fg) lines.push(`Fear/Greed: ${fg.value} (${fg.classification})`);
      }
      lines.push("");
    }
  } catch (e) {
    logger.warn(`[VINCE_REPORT] Options context failed: ${e}`);
  }

  // --- 3. PERPS (signals, funding, whales) ---
  try {
    const signalService = runtime.getService(
      "VINCE_SIGNAL_AGGREGATOR_SERVICE",
    ) as VinceSignalAggregatorService | null;
    const coinglassService = runtime.getService(
      "VINCE_COINGLASS_SERVICE",
    ) as VinceCoinGlassService | null;
    const topTradersService = runtime.getService(
      "VINCE_TOP_TRADERS_SERVICE",
    ) as VinceTopTradersService | null;

    lines.push("=== PERPS ===");
    if (signalService) {
      for (const asset of CORE_ASSETS) {
        try {
          const sig = await signalService.getSignal(asset);
          lines.push(
            `${asset}: ${sig.direction.toUpperCase()} (${sig.strength}% strength, ${sig.confidence}% conf)${sig.factors?.length ? ` - ${sig.factors.slice(0, 2).join(", ")}` : ""}`,
          );
        } catch {
          // Skip
        }
      }
    }
    if (coinglassService) {
      try {
        const allFunding = coinglassService.getAllFunding();
        for (const f of allFunding) {
          const pct = (f.rate * 100).toFixed(4);
          const bias =
            f.rate > 0.0001
              ? "longs paying"
              : f.rate < -0.0001
                ? "shorts paying"
                : "neutral";
          lines.push(`Funding ${f.asset}: ${pct}% (${bias})`);
        }
      } catch {
        // Skip
      }
    }
    if (topTradersService) {
      try {
        const status = topTradersService.getStatus();
        lines.push(`Whales: ${status.trackedCount} tracked`);
        const recent = topTradersService.getRecentSignals(3);
        for (const r of recent) {
          lines.push(
            `  ${r.asset}: whale ${r.action.replace("_", " ")} ($${(r.size / 1000).toFixed(0)}k)`,
          );
        }
        if (recent.length === 0) lines.push("  No recent whale moves");
      } catch {
        // Skip
      }
    }
    lines.push("");
  } catch (e) {
    logger.warn(`[VINCE_REPORT] Perps context failed: ${e}`);
  }

  // --- 4. HIP-3 (TradFi on Hyperliquid) ---
  try {
    const hip3Service = runtime.getService("VINCE_HIP3_SERVICE") as {
      getHIP3Pulse?: () => Promise<{
        summary?: {
          overallBias?: string;
          tradFiVsCrypto?: string;
          goldVsBtc?: { goldChange: number; btcChange: number; winner: string };
          topPerformer?: { symbol: string; change: number };
          worstPerformer?: { symbol: string; change: number };
        };
        sectorStats?: {
          hottestSector?: string;
          commodities?: {
            avgChange: number;
            totalVolume: number;
            totalOI: number;
          };
          stocks?: { avgChange: number; totalVolume: number; totalOI: number };
        };
        fundingExtremes?: {
          crowdedLongs?: string[];
          crowdedShorts?: string[];
        };
      } | null>;
    } | null;

    if (hip3Service?.getHIP3Pulse) {
      const pulse = await hip3Service.getHIP3Pulse();
      if (pulse?.summary) {
        lines.push("=== HIP-3 (TradFi) ===");
        lines.push(`Bias: ${pulse.summary.overallBias ?? "—"}`);
        lines.push(
          `Rotation: ${pulse.summary.tradFiVsCrypto?.replace(/_/g, " ") ?? "—"}`,
        );
        if (pulse.summary.goldVsBtc) {
          const g = pulse.summary.goldVsBtc;
          lines.push(
            `GOLD vs BTC: GOLD ${g.goldChange >= 0 ? "+" : ""}${g.goldChange.toFixed(2)}%, BTC ${g.btcChange >= 0 ? "+" : ""}${g.btcChange.toFixed(2)}% · Winner: ${g.winner}`,
          );
        }
        if (pulse.summary.topPerformer)
          lines.push(
            `Top: ${pulse.summary.topPerformer.symbol} +${pulse.summary.topPerformer.change.toFixed(2)}%`,
          );
        if (pulse.summary.worstPerformer)
          lines.push(
            `Worst: ${pulse.summary.worstPerformer.symbol} ${pulse.summary.worstPerformer.change.toFixed(2)}%`,
          );
        if (pulse.sectorStats?.hottestSector)
          lines.push(`Hottest sector: ${pulse.sectorStats.hottestSector}`);
        if (pulse.sectorStats?.commodities)
          lines.push(
            `Commodities avg: ${pulse.sectorStats.commodities.avgChange >= 0 ? "+" : ""}${pulse.sectorStats.commodities.avgChange.toFixed(2)}%`,
          );
        if (pulse.sectorStats?.stocks)
          lines.push(
            `Stocks avg: ${pulse.sectorStats.stocks.avgChange >= 0 ? "+" : ""}${pulse.sectorStats.stocks.avgChange.toFixed(2)}%`,
          );
        if (pulse.fundingExtremes?.crowdedLongs?.length)
          lines.push(
            `Crowded longs: ${pulse.fundingExtremes.crowdedLongs.join(", ")}`,
          );
        lines.push("");
      }
    }
  } catch (e) {
    logger.warn(`[VINCE_REPORT] HIP-3 context failed: ${e}`);
  }

  // --- 5. NEWS ---
  try {
    const newsService = runtime.getService(
      "VINCE_NEWS_SENTIMENT_SERVICE",
    ) as VinceNewsSentimentService | null;
    if (newsService) {
      await newsService.refreshData();
      if (newsService.hasData()) {
        lines.push("=== NEWS ===");
        const sentiment = newsService.getOverallSentiment();
        lines.push(
          `Overall: ${sentiment.sentiment} (${Math.round(sentiment.confidence)}% confidence)`,
        );
        const riskEvents = newsService.getCriticalRiskEvents();
        for (const e of riskEvents.slice(0, 3)) {
          lines.push(`[${e.severity}] ${e.description}`);
          if (e.assets?.length) lines.push(`  Affects: ${e.assets.join(", ")}`);
        }
        const top = newsService.getTopHeadlines(8);
        for (const h of top) {
          lines.push(`- ${h.title} (${h.source}, ${h.sentiment})`);
        }
        lines.push("");
      }
    }
  } catch (e) {
    logger.warn(`[VINCE_REPORT] News context failed: ${e}`);
  }

  return lines.join("\n");
}

// ==========================================
// Generate X-ready long-form narrative
// ==========================================

async function generateReportNarrative(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string,
): Promise<string> {
  const prompt = `You are VINCE, writing your Report of the Day for ${date}. This will be pasted as a long-form post on X (Twitter). It must read as one cohesive article, not five separate sections stitched together.

Here is the full data from all areas (crypto, options, perps, TradFi/HIP-3, news):

${dataContext}

Write a single flowing article (800-1200 words) that:

1. Opens with the overall vibe—what kind of day is it? Capitulation, greed, chop, risk-off? Use the data to back it.
2. Weave in the majors (BTC, ETH, SOL, HYPE): prices, conviction, funding, L/S. Connect them—e.g. "all four singing the same bearish song" or "SOL the outlier."
3. Vol and options: DVOL, skew, put/call premium. Cross-reference with fear/greed (e.g. "Fear at 9 means puts are juiced with panic premium—exactly what we want to collect"). Give one clear options take (e.g. write cash-secured puts at X% OTM for Y% weekly).
4. Perps: signals, funding story, whale activity (or lack of it). When everyone's long and funding's elevated, say so. When whales are MIA on a dump, that's a signal.
5. HIP-3 (TradFi on Hyperliquid): commodities vs stocks, GOLD vs BTC, sector rotation, crowded funding. One short paragraph is enough unless something is on fire.
6. News/macro: risk events first, then headlines that matter. Tie to the rest (e.g. "Macro backdrop is weird—World Uncertainty Index at highs while mortgage rates drop").
7. End with your take: what to do. One clear recommendation. No hedging ("either X or Y")—pick a side.

STYLE:
- Flowing prose only. No bullet points, no markdown headers, no "Section 1:".
- Write like a trading desk letter to a sharp friend. Specific numbers woven in naturally ("BTC at 66.8k", "DVOL at 52", "L/S at 2.37").
- Cross-reference data across areas (fear index + put skew, funding + L/S + signal).
- Opinionated. Take positions.
- Do not use: "Interestingly", "notably", "it's worth noting", "leverage", "utilize", "streamline", "robust", "cutting-edge", "paradigm", "holistic", "seamless", "delve", "circle back", "touch base", "at the end of the day".
- Punctuation: Do not overuse em dashes (—). Use commas or short sentences instead; heavy em dashes read as AI slop.

LENGTH: 800-1200 words. Dense and readable. One continuous piece ready to paste into X.

Write the report:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_REPORT] Failed to generate narrative: ${error}`);
    return "Report generation failed. Data was loaded but the narrative could not be produced. Try again or use individual commands: ALOHA, OPTIONS, PERPS, HIP3, NEWS.";
  }
}

// ==========================================
// Standup: shorter narrative for daily standup shared insights
// ==========================================

async function generateReportNarrativeForStandup(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string,
): Promise<string> {
  const prompt = `You are VINCE. Write a standup summary for the daily multi-agent meeting (${date}). This will go into the shared daily insights doc, so keep it punchy and numbers-first.

DATA:
${dataContext}

TASK: Write one coherent standup summary (400-600 words) that:
1. Opens with the overall vibe (capitulation / greed / chop / risk-off) and one line on majors (BTC, ETH, SOL, HYPE).
2. One short paragraph on vol/options: DVOL, skew, one clear options take.
3. Perps: signals, funding story, whale activity in one paragraph.
4. HIP-3: one line on commodities vs stocks / rotation if relevant.
5. News: risk events first, one line.
6. End with your take: one clear recommendation.

Then append exactly this JSON block on its own line (replace with real signals):
\`\`\`json
{"signals":[{"asset":"BTC","direction":"bullish|bearish|neutral","confidence_pct":70}]}
\`\`\`

STYLE: Punchy, numbers-first, no fluff. No "Interestingly" or AI-slop. Same voice as the long Report of the Day but condensed. Do not overuse em dashes (—); use commas or short sentences instead.`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_REPORT] Standup narrative failed: ${error}`);
    return "";
  }
}

/**
 * Generates a standup-length Report of the Day for the daily standup shared insights.
 * Uses the same data as the full report but a shorter narrative (400-600 words) + signals JSON.
 * Used when STANDUP_VINCE_USE_REPORT=true to reduce duplicate fetches during standup prep.
 */
export async function generateStandupReport(
  runtime: IAgentRuntime,
): Promise<string> {
  const dataContext = await buildReportDataContext(runtime);
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const narrative = await generateReportNarrativeForStandup(
    runtime,
    dataContext,
    date,
  );
  return (
    narrative ||
    "*(Standup report generation failed; use default VINCE fetchers.)*"
  );
}

// ==========================================
// Action
// ==========================================

export const vinceReportAction: Action = {
  name: "VINCE_REPORT",
  similes: [
    "REPORT",
    "REPORT_OF_THE_DAY",
    "DAILY_REPORT",
    "WRITE_UP",
    "ARTICLE",
    "X_REPORT",
    "MARKET_REPORT",
  ],
  description:
    "Long-form Report of the Day combining ALOHA, OPTIONS, PERPS, HIP-3, and NEWS into one X-ready article (~800-1200 words)",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("report") ||
      text.includes("write up") ||
      text.includes("article") ||
      text.includes("report of the day") ||
      text.includes("daily report") ||
      text.includes("market report")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    try {
      const now = new Date();
      const date = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

      logger.info("[VINCE_REPORT] Building report data context...");
      const dataContext = await buildReportDataContext(runtime);

      logger.info("[VINCE_REPORT] Generating narrative...");
      const narrative = await generateReportNarrative(
        runtime,
        dataContext,
        date,
      );

      const sources: string[] = [];
      if (runtime.getService("VINCE_DERIBIT_SERVICE")) sources.push("Deribit");
      if (runtime.getService("VINCE_COINGLASS_SERVICE"))
        sources.push("CoinGlass");
      if (runtime.getService("VINCE_SIGNAL_AGGREGATOR_SERVICE"))
        sources.push("Signal Aggregator");
      if (runtime.getService("VINCE_TOP_TRADERS_SERVICE"))
        sources.push("Top Traders");
      if (runtime.getService("VINCE_HIP3_SERVICE")) sources.push("Hyperliquid");
      if (runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE"))
        sources.push("News Sentiment");

      const output = [
        `**Report of the Day** _${date}_`,
        "",
        narrative,
        "",
        sources.length > 0 ? `*Source: ${sources.join(", ")}*` : "",
        "",
        "---",
        "*Commands: REPORT, ALOHA, OPTIONS, PERPS, HIP3, NEWS, BOT*",
      ]
        .filter((line) => line !== "")
        .join("\n");

      await callback({
        text: output,
        actions: ["VINCE_REPORT"],
      });

      logger.info("[VINCE_REPORT] Report complete");
    } catch (error) {
      logger.error(`[VINCE_REPORT] Error: ${error}`);
      await callback({
        text: "Could not build the report right now. Try again in a moment, or use individual commands: ALOHA, OPTIONS, PERPS, HIP3, NEWS.",
        actions: ["VINCE_REPORT"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "report of the day" } },
      {
        name: "VINCE",
        content: {
          text: "**Report of the Day** _Thursday, Feb 19_\n\nEverything's bleeding red and the vibe is pure capitulation—fear index at 9 says it all. BTC down to 66.8k, off 2%; ETH getting hit harder at sub-2k; SOL the real casualty at 82, bleeding 4%. Funding still elevated at 0.20% with L/S at 2.37—way too many people still betting up when the technicals say down. Vol environment is screaming premium seller: BTC DVOL at 52%, put skew massive. The call: write cash-secured puts 5-6% OTM and collect fear premium. HIP-3 is dead neutral—even NVDA and COIN aren't moving. When everyone's long and funding's elevated, fade it. Sit tight or add to shorts until funding and L/S normalize; then we talk about buying the dip.\n\n*Source: Deribit, CoinGlass, Hyperliquid, News Sentiment*\n\n---\n*Commands: ALOHA, OPTIONS, PERPS, HIP3, NEWS, BOT*",
          actions: ["VINCE_REPORT"],
        },
      },
    ],
  ],
};
