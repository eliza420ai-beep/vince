/**
 * VINCE News Action
 *
 * Human-style news analysis that reads like a friend explaining what matters.
 * Uses LLM to generate conversational narrative from news data.
 *
 * Features:
 * - Overall market sentiment with confidence
 * - Top headlines by impact
 * - Active risk events
 * - Asset-specific news filtering
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";

// ==========================================
// Build data context for LLM
// ==========================================

export interface NewsDataContext {
  overallSentiment: string;
  overallConfidence: number;
  riskEvents: { severity: string; description: string; assets: string[] }[];
  assetSentiments: { asset: string; sentiment: string; confidence: number; newsCount: number }[];
  topHeadlines: { title: string; source: string; sentiment: string; impact: string }[];
  stats: { total: number; bullish: number; bearish: number; neutral: number };
}

export function buildNewsDataContext(ctx: NewsDataContext): string {
  const lines: string[] = [];

  lines.push("=== MARKET NEWS SUMMARY ===");
  lines.push(`Overall sentiment: ${ctx.overallSentiment} (${ctx.overallConfidence}% confidence)`);
  lines.push("");

  if (ctx.riskEvents.length > 0) {
    lines.push("ACTIVE RISK EVENTS:");
    for (const event of ctx.riskEvents) {
      lines.push(`[${event.severity.toUpperCase()}] ${event.description}`);
      lines.push(`  Affects: ${event.assets.join(", ")}`);
    }
    lines.push("");
  }

  if (ctx.assetSentiments.length > 0) {
    lines.push("ASSET-SPECIFIC SENTIMENT:");
    for (const a of ctx.assetSentiments) {
      lines.push(`${a.asset}: ${a.sentiment} (${a.confidence}% conf, ${a.newsCount} mentions)`);
    }
    lines.push("");
  }

  if (ctx.topHeadlines.length > 0) {
    lines.push("TOP HEADLINES:");
    for (const h of ctx.topHeadlines) {
      const impact = h.impact === "high" ? "[HIGH IMPACT]" : "";
      lines.push(`${impact} ${h.title}`);
      lines.push(`  Source: ${h.source} | Sentiment: ${h.sentiment}`);
    }
    lines.push("");
  }

  lines.push("STATS:");
  lines.push(`Total: ${ctx.stats.total} articles | Bullish: ${ctx.stats.bullish} | Bearish: ${ctx.stats.bearish} | Neutral: ${ctx.stats.neutral}`);

  return lines.join("\n");
}

// ==========================================
// Generate human briefing via LLM
// ==========================================

export async function generateNewsHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string
): Promise<string> {
  const prompt = `You are VINCE, giving a news briefing to a trader friend. Cut through the noise and tell them what actually matters.

Here's the data:

${dataContext}

Write a news briefing that:
1. Lead with the overall vibe - is news bullish, bearish, or noise?
2. If there are risk events, mention them prominently - these are the ones that can move markets
3. Don't just list headlines - explain why they matter. "ETF inflows continue" is data. "Another $200M ETF inflow keeps the bid under price" is insight.
4. Call out which assets are getting the most attention and whether it's positive or negative
5. Separate signal from noise - most crypto news is noise. Highlight what actually matters for trading.
6. End with the take - should they be paying attention to news today or is it mostly irrelevant?

STYLE RULES:
- Write like explaining this to a smart friend over coffee
- Mix short punchy takes with context
- Use specific numbers but naturally - "$200M inflow" not "Inflow: $200,000,000"
- No bullet points or headers - flow naturally
- Have opinions. If the news is mostly noise, say it.
- Around 150-250 words. Dense insight, no padding.

AVOID:
- "Interestingly", "notably"
- Just listing headlines without interpretation
- Treating all news as equally important
- Being overly dramatic about minor news

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_NEWS] Failed to generate briefing: ${error}`);
    return "News feed is glitching. Can't pull together the summary right now. Try again in a bit.";
  }
}

export const vinceNewsAction: Action = {
  name: "VINCE_NEWS",
  similes: ["NEWS", "HEADLINES", "MANDO", "WHAT_NEWS", "NEWS_UPDATE", "MARKET_NEWS"],
  description: "Human-style news analysis - cuts through noise to explain what matters",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("news") ||
      text.includes("headline") ||
      text.includes("mando") ||
      text.includes("what's happening") ||
      text.includes("whats happening") ||
      text.includes("market update")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ): Promise<void> => {
    try {
      const newsService = runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") as VinceNewsSentimentService | null;

      if (!newsService) {
        await callback({
          text: "News service is down. Can't get you the headlines right now.",
          actions: ["VINCE_NEWS"],
        });
        return;
      }

      logger.info("[VINCE_NEWS] Fetching news data...");
      await newsService.refreshData();

      if (!newsService.hasData()) {
        await callback({
          text: "No news data in the cache. Need to run MANDO_MINUTES first to fetch the latest headlines. Ask the NewsCurator agent for 'mando minutes'.",
          actions: ["VINCE_NEWS"],
        });
        return;
      }

      // Build context
      const sentiment = newsService.getOverallSentiment();
      const riskEvents = newsService.getCriticalRiskEvents();
      const topNews = newsService.getTopHeadlines(8);
      const stats = newsService.getDebugStats();

      const assetSentiments: NewsDataContext["assetSentiments"] = [];
      for (const asset of ["BTC", "ETH", "SOL", "HYPE"]) {
        const assetData = newsService.getAssetSentiment(asset);
        if (assetData.newsCount > 0) {
          assetSentiments.push({
            asset,
            sentiment: assetData.sentiment,
            confidence: assetData.confidence,
            newsCount: assetData.newsCount,
          });
        }
      }

      const ctx: NewsDataContext = {
        overallSentiment: sentiment.sentiment,
        overallConfidence: Math.round(sentiment.confidence),
        riskEvents: riskEvents.slice(0, 3).map(e => ({
          severity: e.severity,
          description: e.description,
          assets: e.assets,
        })),
        assetSentiments,
        topHeadlines: topNews.map(n => ({
          title: n.title,
          source: n.source,
          sentiment: n.sentiment,
          impact: n.impact,
        })),
        stats: {
          total: stats.totalNews,
          bullish: stats.bullishCount,
          bearish: stats.bearishCount,
          neutral: stats.neutralCount,
        },
      };

      // Generate briefing
      const dataContext = buildNewsDataContext(ctx);
      logger.info("[VINCE_NEWS] Generating briefing...");
      const briefing = await generateNewsHumanBriefing(runtime, dataContext);

      const output = [
        "**News Briefing**",
        "",
        briefing,
        "",
        "*Source: News Sentiment*",
        "",
        "---",
        "*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
      ].join("\n");

      await callback({
        text: output,
        actions: ["VINCE_NEWS"],
      });

      logger.info("[VINCE_NEWS] Briefing complete");
    } catch (error) {
      logger.error(`[VINCE_NEWS] Error: ${error}`);
      await callback({
        text: "News scan failed. Something's off with the feed. Try again in a minute.",
        actions: ["VINCE_NEWS"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "what's the news?" } },
      {
        name: "VINCE",
        content: {
          text: "**News Briefing**\n\nNews is bullish today but mostly noise. Nothing that should change how you're trading.\n\nThe big story is ETF flows - another $200M came in yesterday which is the third consecutive day of inflows. That's the structural bid that keeps price from dumping hard. It's not exciting news but it's the most important thing in the feed.\n\nBTC sentiment is solid at 72% bullish across 18 mentions. ETH is neutral - the usual \"ETH is underperforming\" takes that have been running for months. SOL getting some attention around the Firedancer testnet but it's developer news, not price-moving.\n\nNo risk events to worry about. Macro is quiet - no FOMC, no major data releases this week.\n\nThe headline about Genesis selling $1.5B in GBTC is old news being recycled. That happened weeks ago and is already priced in. Classic example of why most crypto news is noise.\n\nHonest take: The ETF story is the only thing that matters today. The rest is content farms churning out headlines. Keep your eye on flows, ignore the noise.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_NEWS"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "show me the headlines" } },
      {
        name: "VINCE",
        content: {
          text: "**News Briefing**\n\nNews is bearish with 65% confidence which is meaningful - usually it's noise but today there's substance.\n\nThe risk event to watch: SEC reportedly investigating a major DeFi protocol. They haven't named it yet but rumor mill says it's one of the top 10 by TVL. That's not priced in and could cascade if confirmed. Affects ETH ecosystem mostly but the fear will spread.\n\nBTC sentiment is actually mixed despite the headline risk - 12 articles split 50/50 bullish/bearish. The bulls are pointing to the ETF flows continuing. The bears are focused on the SEC story and Mt. Gox wallet movements.\n\nETH is taking the hit at 28% bearish confidence. Makes sense given the DeFi investigation angle. SOL news is neutral - just the usual ecosystem updates.\n\nThe Mt. Gox wallet story is getting recycled again. Those wallets have been \"moving\" for months. Unless there's exchange deposit confirmation, it's noise.\n\nMy read: The SEC story is the one to watch. Everything else is background noise. If you're long DeFi tokens, maybe tighten stops. If you're trading BTC, the ETF bid is still there keeping a floor under price.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_NEWS"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "mando update" } },
      {
        name: "VINCE",
        content: {
          text: "**News Briefing**\n\nQuiet news day. Sentiment is neutral at 52% confidence which basically means nothing is happening.\n\nNo active risk events. That's actually notable because the past two weeks had constant macro scares. Clean runway for now.\n\nBTC getting the most mentions but the articles are fluff - \"Bitcoin holds above $80k\" type content that tells you nothing. ETH has a few mentions around the upcoming Pectra upgrade but that's months out. SOL ecosystem is quiet.\n\nThe one story worth noting: Tether published their quarterly attestation showing $6B in excess reserves. That's actually bullish data because Tether FUD has been a consistent bear narrative. More ammunition against that story.\n\nHYPE getting some attention after yesterday's pump but it's mostly \"why did this pump\" speculation articles. No new information.\n\nHonest take: Save your attention for something else today. News is pure noise. No risk events, no major catalysts, just content farms filling their quotas. Check back tomorrow or wait for the next FOMC.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_NEWS"],
        },
      },
    ],
  ],
};
