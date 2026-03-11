/**
 * WTT universe mirror for plugin-x-research.
 *
 * Keep aligned with plugin-vince target assets, but local to this plugin so
 * plugin-x-research compiles under its own rootDir without cross-plugin imports.
 */

const CORE_ASSETS = ["BTC", "ETH", "SOL", "HYPE"] as const;

const HIP3_COMMODITIES = [
  "GOLD",
  "SILVER",
  "COPPER",
  "NATGAS",
  "OIL",
  "USOIL",
] as const;

const HIP3_INDICES = [
  "XYZ100",
  "US500",
  "SMALL2000",
  "MAG7",
  "SEMIS",
  "INFOTECH",
  "ROBOT",
] as const;

export const HIP3_STOCKS = [
  "NVDA",
  "TSLA",
  "AAPL",
  "AMZN",
  "GOOGL",
  "META",
  "MSFT",
  "PLTR",
  "COIN",
  "HOOD",
  "NFLX",
  "MSTR",
  "AMD",
  "INTC",
  "ORCL",
  "MU",
  "SNDK",
  "CRCL",
  "RIVN",
] as const;

const HIP3_AI_TECH = ["OPENAI", "ANTHROPIC", "SPACEX"] as const;

const HIP3_ASSETS = [
  ...HIP3_COMMODITIES,
  ...HIP3_INDICES,
  ...HIP3_STOCKS,
  ...HIP3_AI_TECH,
] as const;

const ALL_TRACKED_ASSETS = [...CORE_ASSETS, ...HIP3_ASSETS] as const;

export const WTT_UNIVERSE_TICKERS = [...CORE_ASSETS, ...HIP3_ASSETS] as const;

export const WTT_UNIVERSE_LABEL = (
  WTT_UNIVERSE_TICKERS as readonly string[]
).join(", ");

const WTT_TICKER_ALIASES: Record<string, string> = {
  GOOG: "GOOGL",
  GOOGLE: "GOOGL",
};

export function normalizeWttTicker(ticker: string): string | null {
  const upper = ticker.trim().toUpperCase();
  if (!upper) return null;
  const resolved = WTT_TICKER_ALIASES[upper] ?? upper;
  return (ALL_TRACKED_ASSETS as readonly string[]).includes(resolved)
    ? resolved
    : null;
}
