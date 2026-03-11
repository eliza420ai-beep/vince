import type { XTweet } from "../../types/tweet.types";

const SIGNAL_TICKERS = ["BTC", "ETH", "SOL", "HYPE"] as const;

export interface TradingSignalBlock {
  directionBias: "long" | "short" | "neutral";
  confidence: number;
  freshnessWindow: string;
  topCatalysts: string[];
  invalidationHint: string;
}

function ageHours(createdAt?: string): number {
  if (!createdAt) return 999;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, ageMs / (60 * 60 * 1000));
}

export function scoreTweetForQuality(tweet: XTweet): number {
  const likes = tweet.metrics?.likeCount ?? 0;
  const rts = tweet.metrics?.retweetCount ?? 0;
  const replies = tweet.metrics?.replyCount ?? 0;
  const velocity = tweet.computed?.velocity ?? 0;
  const recencyBoost = Math.max(0, 24 - ageHours(tweet.createdAt));
  return likes + rts * 2 + replies + velocity * 0.2 + recencyBoost;
}

export function dedupeByText(tweets: XTweet[]): XTweet[] {
  const seen = new Set<string>();
  const out: XTweet[] = [];
  for (const t of tweets) {
    const key = t.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function rankTweetsByTopicRelevance(
  tweets: XTweet[],
  keywords: string[],
): XTweet[] {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const score = (tweet: XTweet) => {
    const text = tweet.text.toLowerCase();
    const relevance = lowerKeywords.reduce(
      (sum, kw) => sum + (text.includes(kw) ? 1 : 0),
      0,
    );
    return relevance * 50 + scoreTweetForQuality(tweet);
  };
  return [...tweets].sort((a, b) => score(b) - score(a));
}

export function inferTradingSignalFromTexts(
  texts: string[],
  lookbackDays = 7,
): TradingSignalBlock {
  const joined = texts.join("\n").toLowerCase();
  const longHits = (joined.match(/\b(long|bull|bullish|bid|breakout)\b/g) ?? [])
    .length;
  const shortHits = (
    joined.match(/\b(short|bear|bearish|reject|breakdown)\b/g) ?? []
  ).length;
  const directionBias =
    longHits > shortHits ? "long" : shortHits > longHits ? "short" : "neutral";

  const confidence = Math.max(
    35,
    Math.min(85, 45 + Math.min(20, Math.abs(longHits - shortHits) * 4)),
  );

  const topCatalysts = SIGNAL_TICKERS.filter((ticker) =>
    joined.includes(ticker.toLowerCase()),
  ).slice(0, 3);

  const invalidationHint =
    directionBias === "long"
      ? "Invalidates on failed follow-through and sustained lower-high structure."
      : directionBias === "short"
        ? "Invalidates on squeeze reclaim and sustained higher-low structure."
        : "Invalidates once directional setup becomes one-sided.";

  return {
    directionBias,
    confidence,
    freshnessWindow: `${lookbackDays}d`,
    topCatalysts: topCatalysts.length > 0 ? topCatalysts : ["macro", "flow"],
    invalidationHint,
  };
}

export function formatTradingSignalBlock(signal: TradingSignalBlock): string {
  return [
    "**Trading Signal:**",
    `- directionBias: ${signal.directionBias}`,
    `- confidence: ${signal.confidence}`,
    `- freshnessWindow: ${signal.freshnessWindow}`,
    `- topCatalysts: ${signal.topCatalysts.join(", ")}`,
    `- invalidationHint: ${signal.invalidationHint}`,
  ].join("\n");
}
