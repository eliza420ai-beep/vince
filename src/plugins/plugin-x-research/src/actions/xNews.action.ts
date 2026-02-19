/**
 * X News Action
 *
 * Get crypto news from X's News API.
 * "What's the crypto news on X?"
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  ModelType,
  logger,
} from "@elizaos/core";
import { getXNewsService } from "../services/xNews.service";
import { getXSearchService } from "../services/xSearch.service";
import { initXClientFromEnv } from "../services/xClient.service";
import { getMandoContextForX } from "../utils/mandoContext";
import { ALL_TOPICS } from "../constants/topics";
import { setLastResearch } from "../store/lastResearchStore";
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from "../utils/alohaStyle";

const X_NEWS_SUMMARY_MAX_CHARS = process.env.X_NEWS_SUMMARY_MAX_CHARS
  ? parseInt(process.env.X_NEWS_SUMMARY_MAX_CHARS, 10)
  : 420;

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const COINGECKO_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd";

const LIVE_SYMBOLS = ["BTC", "ETH", "SOL"] as const;

function formatPrice(symbol: string, price: number): string {
  if (symbol === "BTC" && price >= 1000)
    return `BTC $${(price / 1000).toFixed(1)}k`;
  if (symbol === "ETH" && price >= 100)
    return `ETH $${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `${symbol} $${price.toFixed(0)}`;
}

/**
 * Fetch live BTC, ETH, SOL from Hyperliquid (mark prices). On failure, fall back to CoinGecko.
 * Returns a one-line string for appending to the digest; null if both sources fail.
 */
async function getLivePriceLine(): Promise<string | null> {
  const fromHyperliquid = await getLivePriceLineFromHyperliquid();
  if (fromHyperliquid) return fromHyperliquid;
  return getLivePriceLineFromCoinGecko();
}

async function getLivePriceLineFromHyperliquid(): Promise<string | null> {
  try {
    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || data.length < 2) return null;
    const [meta, assetCtxs] = data as [
      { universe?: { name: string }[] },
      { markPx?: string; midPx?: string }[],
    ];
    const universe = meta?.universe;
    if (!Array.isArray(universe) || !Array.isArray(assetCtxs)) return null;
    const parts: string[] = [];
    for (const symbol of LIVE_SYMBOLS) {
      const idx = universe.findIndex(
        (u) => (u?.name ?? "").toUpperCase() === symbol,
      );
      if (idx < 0 || idx >= assetCtxs.length) continue;
      const ctx = assetCtxs[idx];
      const pxStr = ctx?.markPx ?? ctx?.midPx;
      if (pxStr == null || pxStr === "") continue;
      const price = parseFloat(String(pxStr));
      if (!Number.isFinite(price) || price <= 0) continue;
      parts.push(formatPrice(symbol, price));
    }
    if (parts.length === 0) return null;
    return `**Live (HL):** ${parts.join(" · ")}`;
  } catch {
    return null;
  }
}

async function getLivePriceLineFromCoinGecko(): Promise<string | null> {
  try {
    const res = await fetch(COINGECKO_PRICE_URL, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      bitcoin?: { usd?: number };
      ethereum?: { usd?: number };
      solana?: { usd?: number };
    };
    const btc = data.bitcoin?.usd;
    const eth = data.ethereum?.usd;
    const sol = data.solana?.usd;
    if (btc == null && eth == null && sol == null) return null;
    const parts: string[] = [];
    if (typeof btc === "number") parts.push(formatPrice("BTC", btc));
    if (typeof eth === "number") parts.push(formatPrice("ETH", eth));
    if (typeof sol === "number") parts.push(formatPrice("SOL", sol));
    if (parts.length === 0) return null;
    return `**Live:** ${parts.join(" · ")}`;
  } catch {
    return null;
  }
}

/**
 * Truncate at word boundary so we don't cut mid-word. Appends '...' when truncated.
 * Exported for unit tests.
 */
export function truncateSummary(summary: string, maxChars: number): string {
  if (!summary || summary.length <= maxChars) return summary;
  const slice = summary.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 0 ? lastSpace : maxChars;
  return slice.slice(0, cut).trim() + "...";
}

export const xNewsAction: Action = {
  name: "X_NEWS",
  description:
    "Get crypto news from X/Twitter News API. Grok-generated summaries with relevance scoring.",

  similes: ["CRYPTO_NEWS", "X_HEADLINES", "CT_NEWS"],

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "What's the crypto news on X?" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "📰 **X News | Crypto**\n\n🔴 **HIGH IMPACT**\n\n1. **BTC ETF Sees Record $1.2B Inflows**\n   📈 Bullish | Relevance: 95\n   BlackRock's IBIT leads with $800M. Grayscale outflows slowing.\n\n2. **SEC Delays ETH ETF Decision**\n   😐 Neutral | Relevance: 88\n   Extended to May. Market expected this.\n\n🟡 **MEDIUM IMPACT**\n\n3. **Solana DEX Volume Hits ATH**\n   📈 Bullish | Relevance: 72\n   Pump.fun and Jupiter driving activity.\n\n4. **Hyperliquid Announces Token Launch**\n   📈 Bullish | Relevance: 85\n   $HYPE airdrop details coming.\n\n_Powered by X News API_",
          action: "X_NEWS",
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() ?? "";

    const triggers = [
      "x news",
      "crypto news",
      "news on x",
      "twitter news",
      "ct news",
      "headlines",
      "what's happening",
      "whats happening",
    ];

    return triggers.some((t) => text.includes(t));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<ActionResult | void> => {
    try {
      initXClientFromEnv(runtime);

      const newsService = getXNewsService();

      // Get top crypto news
      const news = await newsService.getDailyTopNews();

      if (news.length === 0) {
        const fallback = await buildNewsFallback(runtime);
        if (fallback) {
          const liveLine = await getLivePriceLine();
          const text = liveLine ? `${fallback}\n\n${liveLine}` : fallback;
          if (message.roomId) setLastResearch(message.roomId, text);
          callback({ text, action: "X_NEWS" });
          return { success: true };
        }
        callback({
          text: "📰 **X News**\n\nNo crypto news found. The News API might not have recent stories or is rate limited.",
          action: "X_NEWS",
        });
        return { success: true };
      }

      // Group by impact level
      const highImpact = news.filter((n) => n.impactLevel === "high");
      const mediumImpact = news.filter((n) => n.impactLevel === "medium");
      const lowImpact = news.filter((n) => n.impactLevel === "low");

      const allItems = [
        ...highImpact.slice(0, 3),
        ...mediumImpact.slice(0, 3),
        ...(highImpact.length + mediumImpact.length < 4
          ? lowImpact.slice(0, 2)
          : []),
      ];
      const dataContext = allItems
        .map(
          (item) =>
            `[${item.impactLevel.toUpperCase()}] ${item.name} | ${item.sentiment} | Relevance: ${item.relevanceScore}\n${truncateSummary(item.summary, 300)}`,
        )
        .join("\n\n");

      const narrative = await generateNewsNarrative(runtime, dataContext);
      let response: string;
      if (narrative) {
        response = `📰 **X News | Crypto**\n\n${narrative}\n\n_Powered by X News API_`;
      } else {
        response = `📰 **X News | Crypto**\n\n`;
        if (highImpact.length > 0) {
          response += `🔴 **HIGH IMPACT**\n\n`;
          for (const item of highImpact.slice(0, 3)) {
            response += formatNewsItem(item);
          }
        }
        if (mediumImpact.length > 0) {
          response += `🟡 **MEDIUM IMPACT**\n\n`;
          for (const item of mediumImpact.slice(0, 3)) {
            response += formatNewsItem(item);
          }
        }
        if (
          lowImpact.length > 0 &&
          highImpact.length + mediumImpact.length < 4
        ) {
          response += `🟢 **OTHER**\n\n`;
          for (const item of lowImpact.slice(0, 2)) {
            response += formatNewsItem(item);
          }
        }
        response += `\n_Powered by X News API_`;
      }

      const liveLine = await getLivePriceLine();
      if (liveLine) {
        response = response.replace(
          "\n\n_Powered by X News API_",
          `\n\n${liveLine}\n\n_Powered by X News API_`,
        );
      }

      if (message.roomId) setLastResearch(message.roomId, response);
      callback({
        text: response,
        action: "X_NEWS",
      });

      return { success: true };
    } catch (error) {
      console.error("[X_NEWS] Error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isNewsApiUnavailable =
        errorMessage.includes("404") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("News API");

      const fallback = await buildNewsFallback(runtime);
      if (fallback) {
        const liveLine = await getLivePriceLine();
        const text = liveLine ? `${fallback}\n\n${liveLine}` : fallback;
        callback({ text, action: "X_NEWS" });
        return { success: true };
      }

      if (isNewsApiUnavailable) {
        callback({
          text: "📰 **X News**\n\n⚠️ X News API is not available. This endpoint may require specific API access or isn't enabled for your account.",
          action: "X_NEWS",
        });
      } else {
        callback({
          text: `📰 **X News**\n\n❌ Error: ${errorMessage}`,
          action: "X_NEWS",
        });
      }

      return { success: false };
    }
  },
};

async function generateNewsNarrative(
  runtime: IAgentRuntime,
  dataContext: string,
): Promise<string | null> {
  const prompt = `You are ECHO, summarizing today's crypto news from X for a trader. Below are the news items (impact, title, sentiment, relevance, summary). Turn them into one short ALOHA-style narrative.

Here are the news items:

${dataContext}

Write a short narrative (~120-180 words) that: leads with the big story, then weaves in other highlights, and ends with one clear take.

${ALOHA_STYLE_RULES}

${NO_AI_SLOP}

Write the narrative only (no "Here is the news" wrapper — start with the narrative itself):`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    const text = String(response).trim();
    return text.length > 0 ? text : null;
  } catch (error) {
    logger.warn({ err: error }, "[X_NEWS] LLM narrative failed");
    return null;
  }
}

function formatNewsItem(item: {
  name: string;
  summary: string;
  sentiment: string;
  relevanceScore: number;
  contexts?: { finance?: { tickers: string[] } };
}): string {
  const sentimentEmoji =
    item.sentiment === "bullish"
      ? "📈"
      : item.sentiment === "bearish"
        ? "📉"
        : "😐";

  const tickers = item.contexts?.finance?.tickers ?? [];
  const tickerStr =
    tickers.length > 0 ? ` [${tickers.slice(0, 3).join(", ")}]` : "";

  let output = `**${item.name}**${tickerStr}\n`;
  output += `${sentimentEmoji} ${capitalize(item.sentiment)} | Relevance: ${item.relevanceScore}\n`;
  output += `${truncateSummary(item.summary, X_NEWS_SUMMARY_MAX_CHARS)}\n\n`;

  return output;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Fallback when X News API is unavailable: use Mando headlines or pulse-derived "headlines from CT".
 */
async function buildNewsFallback(
  runtime: IAgentRuntime,
): Promise<string | null> {
  const mando = await getMandoContextForX(runtime);
  if (mando?.headlines?.length) {
    let out = "📰 **CT Headlines**\n\n";
    out += `**Today's news:** ${mando.vibeCheck}\n\n`;
    out += mando.headlines
      .slice(0, 7)
      .map((h) => `• ${h.length > 70 ? h.slice(0, 67) + "..." : h}`)
      .join("\n");
    out += "\n\n_Headlines from MandoMinutes (X News API unavailable)_";
    return out;
  }

  try {
    initXClientFromEnv(runtime);
    const searchService = getXSearchService();
    const topicIds = ALL_TOPICS.filter((t) => t.priority === "high")
      .map((t) => t.id)
      .slice(0, 2);
    const results = await searchService.searchMultipleTopics({
      topicsIds: topicIds,
      maxResultsPerTopic: 10,
      quick: true,
      cacheTtlMs: 60 * 60 * 1000,
    });
    const tweets = Array.from(results.values()).flat();
    if (tweets.length === 0) return null;

    const sorted = [...tweets].sort(
      (a, b) => (b.metrics?.likeCount ?? 0) - (a.metrics?.likeCount ?? 0),
    );
    const top = sorted.slice(0, 7);
    let out = "📰 **Headlines from CT**\n\n";
    for (const t of top) {
      const author = t.author?.username ?? "unknown";
      const text = t.text.replace(/\n/g, " ").slice(0, 80);
      out += `• @${author}: ${text}${t.text.length > 80 ? "..." : ""}\n`;
    }
    out +=
      "\n_Based on recent high-engagement tweets (X News API unavailable)_";
    return out;
  } catch {
    return null;
  }
}

export default xNewsAction;
