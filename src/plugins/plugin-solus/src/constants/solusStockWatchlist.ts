/**
 * Solus offchain stock watchlist — equities NOT tradeable on Hyperliquid.
 * Used for: Finnhub provider (quotes/news), knowledge docs, and Solus stock-specialist context.
 */

export const SOLUS_OFFCHAIN_SECTORS = [
  "Quantum",
  "AI Infrastructure",
  "Nuclear",
  "AI Energy",
  "Defense",
  "Robotics",
  "Battery Tech",
  "Space",
  "Emerging",
  "Copper",
  "Rare Earths",
  "Semiconductors",
] as const;

export type SolusOffchainSector = (typeof SOLUS_OFFCHAIN_SECTORS)[number];

export interface SolusOffchainStock {
  ticker: string;
  sector: string;
}

export const SOLUS_OFFCHAIN_STOCKS: SolusOffchainStock[] = [
  { ticker: "IONQ", sector: "Quantum" },
  { ticker: "NBIS", sector: "AI Infrastructure" },
  { ticker: "IREN", sector: "AI Infrastructure" },
  { ticker: "CRWV", sector: "AI Infrastructure" },
  { ticker: "LEU", sector: "Nuclear" },
  { ticker: "OKLO", sector: "Nuclear" },
  { ticker: "CCJ", sector: "Nuclear" },
  { ticker: "UUUU", sector: "Nuclear" },
  { ticker: "VST", sector: "AI Energy" },
  { ticker: "CEG", sector: "AI Energy" },
  { ticker: "BE", sector: "AI Energy" },
  { ticker: "GEV", sector: "AI Energy" },
  { ticker: "ONDS", sector: "Defense" },
  { ticker: "AVAV", sector: "Defense" },
  { ticker: "KTOS", sector: "Defense" },
  { ticker: "PLTR", sector: "Defense" },
  { ticker: "RR", sector: "Robotics" },
  { ticker: "SERV", sector: "Robotics" },
  { ticker: "TSLA", sector: "Robotics" },
  { ticker: "FLNC", sector: "Battery Tech" },
  { ticker: "EOSE", sector: "Battery Tech" },
  { ticker: "TE", sector: "Battery Tech" },
  { ticker: "RKLB", sector: "Space" },
  { ticker: "RDW", sector: "Space" },
  { ticker: "ASTS", sector: "Space" },
  { ticker: "OSS", sector: "Emerging" },
  { ticker: "KRKNF", sector: "Emerging" },
  { ticker: "FCX", sector: "Copper" },
  { ticker: "SCCO", sector: "Copper" },
  { ticker: "TMQ", sector: "Copper" },
  { ticker: "USAR", sector: "Rare Earths" },
  { ticker: "MP", sector: "Rare Earths" },
  { ticker: "CRML", sector: "Rare Earths" },
  { ticker: "AMD", sector: "Semiconductors" },
  { ticker: "INTC", sector: "Semiconductors" },
  { ticker: "NVDA", sector: "Semiconductors" },
];

/** All unique tickers in the watchlist (uppercase). */
export const SOLUS_OFFCHAIN_TICKERS = [
  ...new Set(SOLUS_OFFCHAIN_STOCKS.map((s) => s.ticker.toUpperCase())),
] as const;

/** Check if a symbol is in the offchain watchlist. */
export function isSolusOffchainTicker(symbol: string): boolean {
  const upper = symbol.trim().toUpperCase();
  return SOLUS_OFFCHAIN_STOCKS.some((s) => s.ticker.toUpperCase() === upper);
}

/** Get sector for a ticker, or null. */
export function getSectorForTicker(ticker: string): string | null {
  const upper = ticker.trim().toUpperCase();
  const entry = SOLUS_OFFCHAIN_STOCKS.find(
    (s) => s.ticker.toUpperCase() === upper,
  );
  return entry?.sector ?? null;
}
