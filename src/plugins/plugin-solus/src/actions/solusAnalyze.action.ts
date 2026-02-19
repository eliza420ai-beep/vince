/**
 * Solus Stock Analysis Action — Full analysis for any ticker.
 * Combines: Finnhub (quote, news, profile) + FMP (fundamentals, ratios, earnings)
 */

import {
  type Action,
  type ActionExample,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from "@elizaos/core";
import { isSolusOffchainTicker, getSectorForTicker, SOLUS_OFFCHAIN_STOCKS } from "../constants/solusStockWatchlist";
import { FinnhubService } from "../services/finnhub.service";
import { FMPService } from "../services/fmp.service";

export const solusAnalyzeAction: Action = {
  name: "SOLUS_ANALYZE",
  description: "Get comprehensive stock analysis: quote, news, profile, fundamentals, ratios, and earnings",
  examples: [
    [
      {
        user: "Analyze NVDA",
        content: { text: "Can you analyze NVDA for me?" },
      },
      {
        user: "analyze AAPL",
        content: { text: "analyze AAPL" },
      },
      {
        user: "full analysis for TSLA",
        content: { text: "Give me a full analysis of TSLA" },
      },
      {
        user: "What's the fundamentals of AMD?",
        content: { text: "What's the fundamentals of AMD?" },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    // Check if message mentions "analyze" or "analysis" or "fundamentals"
    return text.includes("analyze") || text.includes("analysis") || text.includes("fundamentals");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
  ): Promise<boolean> => {
    const text = message.content?.text || "";

    // Extract ticker from message
    const ticker = extractTicker(text);

    if (!ticker) {
      logger.warn("[SolusAnalyze] No ticker found in message: " + text);
      return false;
    }

    logger.info(`[SolusAnalyze] Analyzing ticker: ${ticker}`);

    // Get services
    const finnhub = runtime.getService<FinnhubService>("FINNHUB_SERVICE");
    const fmp = runtime.getService<FMPService>("FMP_SERVICE");

    const results: string[] = [];

    // 1. Finnhub data (quotes, news, profile)
    if (finnhub) {
      const [quote, profile, news] = await Promise.all([
        finnhub.getQuote(ticker),
        finnhub.getCompanyProfile(ticker),
        finnhub.getCompanyNews(ticker, 3),
      ]);

      if (quote) {
        results.push(`## 📊 ${ticker} Quote`);
        results.push(`**Price:** $${quote.c.toFixed(2)}`);
        results.push(`**Change:** ${quote.d >= 0 ? "+" : ""}${quote.d.toFixed(2)} (${quote.dp.toFixed(2)}%)`);
        results.push(`**High:** $${quote.h.toFixed(2)} | **Low:** $${quote.l.toFixed(2)}`);
        results.push(`**Open:** $${quote.o.toFixed(2)} | **Prev Close:** $${quote.pc.toFixed(2)}`);
      }

      if (profile) {
        results.push(`\n## 🏢 Company Profile`);
        results.push(`**Name:** ${profile.name}`);
        results.push(`**Industry:** ${profile.finnhubIndustry || "N/A"}`);
        if (profile.weburl) results.push(`**Website:** ${profile.weburl}`);
        if (profile.marketCapitalization) {
          const mktCap = (profile.marketCapitalization / 1e9).toFixed(1);
          results.push(`**Market Cap:** $${mktCap}B`);
        }
      }

      if (news && news.length > 0) {
        results.push(`\n## 📰 Recent News`);
        news.slice(0, 3).forEach((item, i) => {
          results.push(`${i + 1}. **${item.headline}**`);
          results.push(`   ${item.summary.slice(0, 150)}...`);
          results.push(`   [Read more](${item.url})`);
        });
      }
    }

    // 2. FMP data (fundamentals, ratios, earnings)
    if (fmp && fmp.isConfigured()) {
      const metrics = await fmp.getKeyMetrics(ticker);

      if (metrics) {
        results.push(`\n## 📈 Key Metrics`);

        if (metrics.price > 0) {
          results.push(`**Price:** $${metrics.price.toFixed(2)}`);
        }
        if (metrics.marketCap > 0) {
          results.push(`**Market Cap:** $${(metrics.marketCap / 1e9).toFixed(1)}B`);
        }
        if (metrics.peRatio > 0) {
          results.push(`**P/E Ratio:** ${metrics.peRatio.toFixed(2)}`);
        }
        if (metrics.dividendYield > 0) {
          results.push(`**Dividend Yield:** ${(metrics.dividendYield * 100).toFixed(2)}%`);
        }
        if (metrics.revenueGrowth !== 0) {
          results.push(`**Revenue Growth:** ${(metrics.revenueGrowth * 100).toFixed(1)}%`);
        }
        if (metrics.profitMargin !== 0) {
          results.push(`**Profit Margin:** ${(metrics.profitMargin * 100).toFixed(1)}%`);
        }
        if (metrics.debtToEquity > 0) {
          results.push(`**Debt/Equity:** ${metrics.debtToEquity.toFixed(2)}`);
        }
        if (metrics.returnOnEquity !== 0) {
          results.push(`**Return on Equity:** ${(metrics.returnOnEquity * 100).toFixed(1)}%`);
        }
        if (metrics.beta > 0) {
          results.push(`**Beta:** ${metrics.beta.toFixed(2)}`);
        }

        // Earnings
        if (metrics.lastEarnings) {
          const le = metrics.lastEarnings;
          const actual = le.eps?.toFixed(2) || "N/A";
          const estimate = le.epsEstimate?.toFixed(2) || "N/A";
          const surprise = le.eps && le.epsEstimate
            ? ((le.eps - le.epsEstimate) / Math.abs(le.epsEstimate) * 100).toFixed(1)
            : "N/A";
          results.push(`\n## 📅 Earnings (Last)`);
          results.push(`**Date:** ${le.date}`);
          results.push(`**EPS:** $${actual} (est: $${estimate})`);
          results.push(`**Surprise:** ${surprise !== "N/A" ? (Number(surprise) >= 0 ? "+" : "") + surprise + "%" : "N/A"}`);
        }

        if (metrics.nextEarnings) {
          const ne = metrics.nextEarnings;
          results.push(`\n## 📅 Earnings (Next)`);
          results.push(`**Date:** ${ne.date}`);
          results.push(`**EPS Est:** $${ne.epsEstimate?.toFixed(2) || "N/A"}`);
          results.push(`**Revenue Est:** $${(ne.revenueEstimate / 1e9).toFixed(1)}B`);
        }
      }
    } else {
      results.push(`\n⚠️ *FMP not configured — set FMP_API_KEY for fundamentals*`);
    }

    // 3. Sector info
    const sector = getSectorForTicker(ticker);
    if (sector) {
      results.push(`\n## 🏭 Sector`);
      results.push(`**Sector:** ${sector}`);
      const sectorTickers = SOLUS_OFFCHAIN_STOCKS.filter(s => s.sector === sector).map(s => s.ticker);
      results.push(`**Other in sector:** ${sectorTickers.filter(t => t !== ticker).join(", ")}`);
    }

    // Build final response
    const response = results.join("\n");
    logger.info(`[SolusAnalyze] Analysis complete for ${ticker}`);

    // TODO: Emit result as message or callback
    console.log(response);

    return true;
  },

  similes: ["ANALYZE_STOCK", "STOCK_ANALYSIS", "FUNDAMENTALS"],
};

/** Extract ticker symbol from message text. */
function extractTicker(text: string): string | null {
  const upper = text.toUpperCase();

  // Check for known tickers in offchain watchlist
  const watchlistTickers = SOLUS_OFFCHAIN_STOCKS.map(s => s.ticker);
  for (const ticker of watchlistTickers) {
    if (upper.includes(ticker)) {
      return ticker;
    }
  }

  // Also check for common tickers mentioned
  const commonTickers = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "AMD", "INTC",
    "TSLA", "COIN", "MSTR", "PLTR", "SMCI", "ARM",
  ];
  for (const ticker of commonTickers) {
    if (upper.includes(ticker)) {
      return ticker;
    }
  }

  // Try to extract 1-5 letter uppercase word that looks like a ticker
  const match = text.match(/\b[A-Z]{1,5}\b/);
  if (match) {
    return match[0];
  }

  return null;
}

export const solusAnalyzeExamples: ActionExample[] = [
  [
    {
      user: "Analyze NVDA",
      content: { text: "Can you analyze NVDA for me?" },
    },
  ],
  [
    {
      user: "full analysis for TSLA",
      content: { text: "Give me a full analysis of TSLA" },
    },
  ],
];
