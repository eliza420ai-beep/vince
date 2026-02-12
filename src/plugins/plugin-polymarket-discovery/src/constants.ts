/**
 * Polymarket Discovery Plugin Constants
 * Aligns with Gamma/CLOB/Data API endpoints and limits.
 */

export const DEFAULT_GAMMA_API_URL = "https://gamma-api.polymarket.com";
export const GAMMA_PUBLIC_SEARCH_PATH = "/public-search";
export const GAMMA_TAGS_PATH = "/tags";
export const GAMMA_EVENTS_PATH = "/events";
export const GAMMA_MARKETS_PATH = "/markets";

export const DEFAULT_CLOB_API_URL = "https://clob.polymarket.com";
export const DEFAULT_DATA_API_URL = "https://data-api.polymarket.com";

export const POLYGON_CHAIN_ID = 137;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 500;

export const ACTIVITY_HISTORY_MAX_ITEMS = 10;

/**
 * VINCE priority: tag slugs we pass to Gamma (polymarket.com path segments).
 * Signals feed paper bot (perps), Hypersurface strike selection (weekly key), and vibe check.
 * Keep in sync with knowledge/teammate/POLYMARKET_PRIORITY_MARKETS.md
 */
export const VINCE_POLYMARKET_PREFERRED_TAG_SLUGS: string[] = [
  "bitcoin",
  "microstrategy",
  "ethereum",
  "solana",
  "pre-market",
  "etf",
  "crypto-etf",
  "monthly",
  "weekly",
  "daily",
  "stocks",
  "indicies",
  "indices",
  "commodities",
  "ipo",
  "fed-rates",
  "treasuries",
  "geopolitics",
  "economy",
];

/** Ordered slugs that get a dedicated section on the leaderboard Polymarket tab (Bitcoin, Ethereum, Solana, etc.). */
export const POLYMARKET_TAG_SECTION_SLUGS: string[] = [
  "bitcoin",
  "ethereum",
  "solana",
  "microstrategy",
  "etf",
  "stocks",
  "fed-rates",
  "treasuries",
  "geopolitics",
  "economy",
];

export type VincePolymarketGroup = "crypto" | "finance" | "other";

/** Human-readable labels and group for provider text and knowledge doc. Same order/slugs as VINCE_POLYMARKET_PREFERRED_TAG_SLUGS where applicable. */
export const VINCE_POLYMARKET_PREFERRED_LABELS: {
  slug: string;
  label: string;
  group: VincePolymarketGroup;
}[] = [
  { slug: "bitcoin", label: "Bitcoin", group: "crypto" },
  { slug: "microstrategy", label: "MicroStrategy", group: "crypto" },
  { slug: "ethereum", label: "Ethereum", group: "crypto" },
  { slug: "solana", label: "Solana", group: "crypto" },
  { slug: "pre-market", label: "Pre-market", group: "crypto" },
  { slug: "etf", label: "ETF", group: "crypto" },
  { slug: "crypto-etf", label: "Crypto ETF", group: "crypto" },
  { slug: "monthly", label: "Monthly", group: "crypto" },
  { slug: "weekly", label: "Weekly", group: "crypto" },
  { slug: "daily", label: "Daily", group: "crypto" },
  { slug: "stocks", label: "Stocks", group: "finance" },
  { slug: "indicies", label: "Indices", group: "finance" },
  { slug: "indices", label: "Indices", group: "finance" },
  { slug: "commodities", label: "Commodities", group: "finance" },
  { slug: "ipo", label: "IPO", group: "finance" },
  { slug: "fed-rates", label: "Fed rates", group: "finance" },
  { slug: "treasuries", label: "Treasuries", group: "finance" },
  { slug: "geopolitics", label: "Geopolitics", group: "other" },
  { slug: "economy", label: "Economy", group: "other" },
];
