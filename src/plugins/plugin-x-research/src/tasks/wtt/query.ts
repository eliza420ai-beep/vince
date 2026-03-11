import { WTT_UNIVERSE_TICKERS } from "../../constants/wttUniverse";

export function buildPolymarketContextBlock(
  polymarketContext: string | null,
): string {
  const context = polymarketContext?.trim();
  if (!context) return "";
  if (!context.toLowerCase().startsWith("prediction markets:")) return "";
  if (context.length < 36) return "";
  const clipped =
    context.length > 480 ? context.slice(0, 477) + "..." : context;
  return `\n\n${clipped}\nUse if relevant to your thesis (e.g. odds support or contradict the narrative).`;
}

function firstKnownTicker(text: string): string | null {
  const upper = text.toUpperCase();
  for (const t of WTT_UNIVERSE_TICKERS as readonly string[]) {
    if (new RegExp(`\\b${t}\\b`, "i").test(upper)) return t;
    if (new RegExp(`\\$${t}\\b`, "i").test(upper)) return t;
  }
  return null;
}

function firstEntityKeyword(text: string): string | null {
  const stopwords = new Set([
    "this",
    "that",
    "with",
    "from",
    "will",
    "have",
    "market",
    "markets",
    "crypto",
    "thesis",
    "signal",
    "trade",
    "long",
    "short",
    "week",
    "today",
    "says",
    "momentum",
    "rotates",
    "pricing",
  ]);
  const preferredEntityPattern =
    /(etf|fed|sec|inflation|cpi|fomc|yield|treasury|hyperliquid|hypersurface|bitcoin|ethereum|solana|hype)/i;
  const candidates = text
    .split(/[\s,.;:()\-_/]+/)
    .map((w) => w.trim().toLowerCase())
    .filter(
      (w) =>
        !!w &&
        !stopwords.has(w) &&
        (w.length >= 4 || preferredEntityPattern.test(w)),
    );

  const preferred = candidates.find((word) =>
    preferredEntityPattern.test(word),
  );
  return (preferred ?? candidates[0] ?? "").slice(0, 30) || null;
}

export function derivePolymarketQuery(params: {
  thesis?: string | null;
  newsContext?: string | null;
  xNarrative?: string | null;
}): string {
  const thesis = params.thesis?.trim() ?? "";
  const news = params.newsContext?.trim() ?? "";
  const xNarrative = params.xNarrative?.trim() ?? "";

  const thesisTicker = thesis ? firstKnownTicker(thesis) : null;
  if (thesisTicker) return thesisTicker.toLowerCase();
  const thesisEntity = thesis ? firstEntityKeyword(thesis) : null;
  if (thesisEntity) return thesisEntity.toLowerCase();

  const newsTicker = news ? firstKnownTicker(news) : null;
  if (newsTicker) return newsTicker.toLowerCase();
  const newsEntity = news ? firstEntityKeyword(news) : null;
  if (newsEntity) return newsEntity.toLowerCase();

  const xTicker = xNarrative ? firstKnownTicker(xNarrative) : null;
  if (xTicker) return xTicker.toLowerCase();
  const xEntity = xNarrative ? firstEntityKeyword(xNarrative) : null;
  if (xEntity) return xEntity.toLowerCase();

  return "crypto bitcoin";
}
