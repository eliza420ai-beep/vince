/**
 * Solus Stock Analysis Action — Full analysis for any ticker.
 * Combines: Finnhub (quote, news, profile) + FMP (fundamentals, ratios, earnings)
 * Output: LLM-generated prose narrative (matches VINCE output quality).
 */

import {
  type Action,
  type ActionExample,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  ModelType,
} from "@elizaos/core";
import {
  getSectorForTicker,
  getStockForTicker,
  SOLUS_OFFCHAIN_STOCKS,
} from "../constants/solusStockWatchlist";
import { FinnhubService } from "../services/finnhub.service";
import { FMPService } from "../services/fmp.service";
import { isSolus } from "../utils/solus";
import {
  computeStockScorecard,
  defaultInvalidationForTheme,
  type StockScorecard,
} from "../utils/stockScoring";
import { appendStockCallRecord } from "../utils/stockRecommendationsStore";

function buildAnalysisDataContext(
  ticker: string,
  quote: any | null,
  profile: any | null,
  news: any[] | null,
  metrics: any | null,
  sector: string | null,
  sectorPeers: string[],
  scorecard: StockScorecard,
  themeBrief: string,
): string {
  const lines: string[] = [];
  lines.push(`=== ${ticker} ===`);

  if (quote) {
    const change = quote.d >= 0 ? `+${quote.d.toFixed(2)}` : quote.d.toFixed(2);
    lines.push(
      `Price: $${quote.c.toFixed(2)} (${change}, ${quote.dp.toFixed(2)}%)`,
    );
    lines.push(
      `Range: $${quote.l.toFixed(2)} - $${quote.h.toFixed(2)} | Open: $${quote.o.toFixed(2)} | Prev Close: $${quote.pc.toFixed(2)}`,
    );
  }

  if (profile) {
    lines.push(
      `Company: ${profile.name} | Industry: ${profile.finnhubIndustry || "N/A"}`,
    );
    if (profile.marketCapitalization) {
      lines.push(
        `Market Cap: $${(profile.marketCapitalization / 1e9).toFixed(1)}B`,
      );
    }
  }

  if (metrics) {
    const metricLines: string[] = [];
    if (metrics.peRatio > 0)
      metricLines.push(`P/E: ${metrics.peRatio.toFixed(1)}`);
    if (metrics.revenueGrowth !== 0)
      metricLines.push(
        `Rev Growth: ${(metrics.revenueGrowth * 100).toFixed(1)}%`,
      );
    if (metrics.profitMargin !== 0)
      metricLines.push(`Margin: ${(metrics.profitMargin * 100).toFixed(1)}%`);
    if (metrics.returnOnEquity !== 0)
      metricLines.push(`ROE: ${(metrics.returnOnEquity * 100).toFixed(1)}%`);
    if (metrics.debtToEquity > 0)
      metricLines.push(`D/E: ${metrics.debtToEquity.toFixed(2)}`);
    if (metrics.beta > 0) metricLines.push(`Beta: ${metrics.beta.toFixed(2)}`);
    if (metrics.dividendYield > 0)
      metricLines.push(
        `Div Yield: ${(metrics.dividendYield * 100).toFixed(2)}%`,
      );
    if (metricLines.length > 0)
      lines.push(`Fundamentals: ${metricLines.join(" | ")}`);

    if (metrics.lastEarnings) {
      const le = metrics.lastEarnings;
      const actual = le.eps?.toFixed(2) || "N/A";
      const estimate = le.epsEstimate?.toFixed(2) || "N/A";
      let surprise = "N/A";
      if (le.eps && le.epsEstimate) {
        const s = (
          ((le.eps - le.epsEstimate) / Math.abs(le.epsEstimate)) *
          100
        ).toFixed(1);
        surprise = `${Number(s) >= 0 ? "+" : ""}${s}%`;
      }
      lines.push(
        `Last Earnings (${le.date}): EPS $${actual} vs est $${estimate} (${surprise} surprise)`,
      );
    }
    if (metrics.nextEarnings) {
      const ne = metrics.nextEarnings;
      lines.push(
        `Next Earnings: ${ne.date} | EPS Est: $${ne.epsEstimate?.toFixed(2) || "?"} | Rev Est: $${(ne.revenueEstimate / 1e9).toFixed(1)}B`,
      );
    }
  }

  if (news && news.length > 0) {
    lines.push(`\nRecent headlines:`);
    news.slice(0, 3).forEach((item) => {
      lines.push(`- ${item.headline}`);
    });
  }

  if (sector) {
    lines.push(`\nSector: ${sector}`);
    if (sectorPeers.length > 0) lines.push(`Peers: ${sectorPeers.join(", ")}`);
  }

  lines.push(`\nScorecard:`);
  lines.push(`ThesisStrength: ${scorecard.thesisStrength}/100`);
  lines.push(`CatalystDensity: ${scorecard.catalystDensity}/100`);
  lines.push(`ValuationStretch: ${scorecard.valuationStretch}/100`);
  lines.push(`ExecutionRisk: ${scorecard.executionRisk}/100`);
  lines.push(`NetEdgeScore: ${scorecard.netEdgeScore}/100`);
  lines.push(`RecommendationBand: ${scorecard.recommendation}`);

  if (themeBrief) {
    lines.push(`\nTheme brief context:`);
    lines.push(themeBrief);
  }

  return lines.join("\n");
}

function buildPairExpression(ticker: string): string | null {
  const meta = getStockForTicker(ticker);
  if (!meta || meta.thesisRole !== "at_risk_incumbent") return null;
  const peer = SOLUS_OFFCHAIN_STOCKS.find(
    (s) => s.theme === meta.theme && s.thesisRole !== "at_risk_incumbent",
  );
  if (!peer) return null;
  return `Pair expression: long ${peer.ticker} against ${ticker} if AI capex and automation spend stay strong.`;
}

async function generateAnalysisNarrative(
  runtime: IAgentRuntime,
  ticker: string,
  dataContext: string,
  hasFMP: boolean,
  scorecard: StockScorecard,
): Promise<string> {
  const prompt = `You are Solus, the stock specialist for the offchain watchlist. Give a concise analysis of ${ticker}.

DATA:
${dataContext}

Write a stock analysis that covers:
1. Price action and what the numbers say — is it running, pulling back, or stuck?
2. Fundamentals snapshot — valuation (P/E, growth, margins) and whether it's cheap or expensive for what you get
3. Headlines — anything in the news that moves the thesis?
4. Sector context — where this name sits relative to peers
5. One clear call: watch, accumulate, or avoid — and your invalidation
6. Include one explicit causal chain using this structure: event -> bottleneck -> revenue impact
7. Include one competing hypothesis that could break the thesis

STYLE RULES:
- Write like a sharp analyst briefing a portfolio manager, not a data dump
- Weave the numbers into sentences naturally — "$42.50, up 3% on the day" not "Price: $42.50, Change: +3%"
- No bullet points or section headers. Flow between topics.
- Have an opinion. If the stock is overvalued, say so. If the setup is clean, call it.
- Around 150-250 words. Dense with insight, no padding.
- Keep your conclusion aligned to this deterministic recommendation band from scorecard: ${scorecard.recommendation.toUpperCase()}.
${!hasFMP ? "\n- Note that fundamentals data isn't available (FMP not configured) — work with what you have." : ""}

AVOID:
- Emoji headers or markdown section headers (##)
- "Interestingly", "notably", "it's worth noting", "delve"
- Generic observations like "the stock has been volatile"
- "Not financial advice" disclaimers

Write the analysis:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[SOLUS_ANALYZE] Failed to generate narrative: ${error}`);
    return `${ticker} data pulled but couldn't get the narrative to click. Try again in a moment.`;
  }
}

export const solusAnalyzeAction: Action = {
  name: "SOLUS_ANALYZE",
  description:
    "Comprehensive stock analysis: quote, news, profile, fundamentals, ratios, and earnings — delivered as flowing prose",
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Can you analyze NVDA for me?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**NVDA Analysis** _Tuesday, Feb 18_\n\nNVDA is sitting at $138.50, up 2.1% on the day and pushing back toward the top of its 2-week range. The $3.6T market cap still trades at 55x earnings, but when you're growing revenue at 122% year-over-year with 57% margins, the multiple has room to compress into the growth.\n\nLast earnings were a monster: $0.81 EPS against a $0.64 estimate, a 26.6% beat. The AI capex cycle is the tailwind and it's not slowing. Next report lands March 26 with Street expecting $0.89 — any guidance on Blackwell ramp will move the stock more than the print.\n\nHeadlines are mixed. Trade policy noise around chip exports to China is the risk everyone knows about but keeps ignoring. Sector-wise, NVDA leads AI Infra alongside AMD, AVGO, and SMCI, but it's the only one trading like a growth name. AMD is cheaper on a P/E basis but the execution gap is wide.\n\nWatch with accumulation bias on any pullback toward $130. Invalidation: revenue growth decelerating below 80% or a hard export ban.\n\n*Source: Finnhub, FMP*\n\n---\n_Next steps_: `STRIKE RITUAL` (options) · `EARNINGS CALENDAR` (upcoming) · Ask VINCE for live data",
          actions: ["SOLUS_ANALYZE"],
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (!isSolus(runtime)) return false;
    const text = message.content?.text?.toLowerCase() || "";
    return (
      text.includes("analyze") ||
      text.includes("analysis") ||
      text.includes("fundamentals") ||
      text.includes("infrastructure stocks") ||
      text.includes("ai infrastructure") ||
      (text.includes("latest on") && text.includes("stocks"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const text = message.content?.text || "";
    const ticker = extractTicker(text);

    if (!ticker) {
      logger.warn("[SolusAnalyze] No ticker found in message: " + text);
      if (callback) {
        await callback({
          text: "No ticker in that message. Try: analyze NVDA",
          actions: ["SOLUS_ANALYZE"],
        });
      }
      return;
    }

    logger.info(`[SolusAnalyze] Analyzing ticker: ${ticker}`);

    const finnhub = runtime.getService<FinnhubService>("FINNHUB_SERVICE");
    const fmp = runtime.getService<FMPService>("FMP_SERVICE");
    const sources: string[] = [];

    let quote: any = null;
    let profile: any = null;
    let news: any[] | null = null;

    if (finnhub) {
      [quote, profile, news] = await Promise.all([
        finnhub.getQuote(ticker),
        finnhub.getCompanyProfile(ticker),
        finnhub.getCompanyNews(ticker, 3),
      ]);
      if (quote || profile || (news && news.length > 0))
        sources.push("Finnhub");
    }

    let metrics: any = null;
    const hasFMP = !!(fmp && fmp.isConfigured());
    if (hasFMP) {
      metrics = await fmp.getKeyMetrics(ticker);
      if (metrics) sources.push("FMP");
    }

    const sector = getSectorForTicker(ticker);
    const stockMeta = getStockForTicker(ticker);
    const sectorPeers = sector
      ? SOLUS_OFFCHAIN_STOCKS.filter(
          (s) => s.sector === sector && s.ticker !== ticker,
        ).map((s) => s.ticker)
      : [];
    const scorecard = computeStockScorecard({
      stock: stockMeta,
      quoteChangePct: quote?.dp ?? null,
      newsCount: news?.length ?? 0,
      peRatio: metrics?.peRatio ?? null,
      revenueGrowth: metrics?.revenueGrowth ?? null,
      profitMargin: metrics?.profitMargin ?? null,
      debtToEquity: metrics?.debtToEquity ?? null,
      returnOnEquity: metrics?.returnOnEquity ?? null,
      beta: metrics?.beta ?? null,
      hasUpcomingEarnings: Boolean(metrics?.nextEarnings),
    });
    const themeBrief =
      (_state?.values?.solusThemeBrief as string | undefined) ||
      (_state?.text?.includes("[Solus theme brief - AI bottlenecks]")
        ? _state.text
        : "");
    const stockCalibration =
      (_state?.values?.solusStockCalibration as string | undefined) ||
      (_state?.text?.includes("[Solus stock calibration context]")
        ? _state.text
        : "");

    if (!quote && !metrics) {
      if (callback) {
        await callback({
          text: `No data available for ${ticker}. Finnhub${hasFMP ? " and FMP" : ""} returned empty. Check that the ticker is valid.`,
          actions: ["SOLUS_ANALYZE"],
        });
      }
      return;
    }

    const dataContext = buildAnalysisDataContext(
      ticker,
      quote,
      profile,
      news,
      metrics,
      sector,
      sectorPeers,
      scorecard,
      [themeBrief, stockCalibration].filter(Boolean).join("\n"),
    );
    const narrative = await generateAnalysisNarrative(
      runtime,
      ticker,
      dataContext,
      hasFMP,
      scorecard,
    );
    const pairExpression = buildPairExpression(ticker);
    const invalidation =
      defaultInvalidationForTheme(stockMeta?.theme) ||
      "If execution breaks and the thesis catalyst fails to show up.";
    if (quote?.c && Number.isFinite(quote.c) && stockMeta) {
      appendStockCallRecord({
        ticker,
        theme: stockMeta.theme,
        thesisRole: stockMeta.thesisRole,
        recommendation: scorecard.recommendation,
        netEdgeScore: scorecard.netEdgeScore,
        invalidation,
        entryPrice: quote.c,
        reviewAfterDays: 7,
      });
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    const output = [
      `**${ticker} Analysis** _${dateStr}_`,
      "",
      narrative,
      "",
      `**Scorecard** Thesis ${scorecard.thesisStrength} · Catalyst ${scorecard.catalystDensity} · Valuation ${scorecard.valuationStretch} · ExecutionRisk ${scorecard.executionRisk} · NetEdge ${scorecard.netEdgeScore}`,
      `**Primary call** ${scorecard.recommendation.toUpperCase()} — Invalidation: ${invalidation}`,
      pairExpression ? `**Pair** ${pairExpression}` : "",
      "",
      sources.length > 0 ? `*Source: ${sources.join(", ")}*` : "",
      "",
      "---",
      "_Next steps_: `STRIKE RITUAL` (options) · `EARNINGS CALENDAR` (upcoming) · Ask VINCE for live data",
    ]
      .filter(Boolean)
      .join("\n");

    logger.info(`[SolusAnalyze] Analysis complete for ${ticker}`);

    if (callback) {
      await callback({
        text: output,
        actions: ["SOLUS_ANALYZE"],
      });
    }
  },

  similes: ["ANALYZE_STOCK", "STOCK_ANALYSIS", "FUNDAMENTALS"],
};

function extractTicker(text: string): string | null {
  const upper = text.toUpperCase();

  const watchlistTickers = SOLUS_OFFCHAIN_STOCKS.map((s) => s.ticker);
  for (const ticker of watchlistTickers) {
    if (upper.includes(ticker)) return ticker;
  }

  const commonTickers = [
    "AAPL",
    "MSFT",
    "GOOGL",
    "AMZN",
    "META",
    "NVDA",
    "AMD",
    "INTC",
    "TSLA",
    "COIN",
    "MSTR",
    "PLTR",
    "SMCI",
    "ARM",
  ];
  for (const ticker of commonTickers) {
    if (upper.includes(ticker)) return ticker;
  }

  const match = text.match(/\b[A-Z]{1,5}\b/);
  return match ? match[0] : null;
}
