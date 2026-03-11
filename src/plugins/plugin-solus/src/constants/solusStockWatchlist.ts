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

export const SOLUS_STOCK_THEMES = [
  "ai_power",
  "grid_equipment",
  "hosting_conversion",
  "outsourcing_disruption",
  "gpu_platform",
] as const;

export type SolusStockTheme = (typeof SOLUS_STOCK_THEMES)[number];

export const SOLUS_THESIS_ROLES = [
  "supplier",
  "landlord",
  "converter",
  "at_risk_incumbent",
] as const;

export type SolusThesisRole = (typeof SOLUS_THESIS_ROLES)[number];

export interface SolusOffchainStock {
  ticker: string;
  sector: string;
  theme: SolusStockTheme;
  thesisRole: SolusThesisRole;
  keyCatalysts: string[];
}

export const SOLUS_OFFCHAIN_STOCKS: SolusOffchainStock[] = [
  {
    ticker: "IONQ",
    sector: "Quantum",
    theme: "gpu_platform",
    thesisRole: "supplier",
    keyCatalysts: ["earnings", "enterprise bookings", "government contracts"],
  },
  {
    ticker: "NBIS",
    sector: "AI Infrastructure",
    theme: "hosting_conversion",
    thesisRole: "converter",
    keyCatalysts: [
      "capacity expansion",
      "power procurement updates",
      "data-center leases",
    ],
  },
  {
    ticker: "IREN",
    sector: "AI Infrastructure",
    theme: "hosting_conversion",
    thesisRole: "converter",
    keyCatalysts: [
      "mining-to-ai conversion",
      "interconnect approvals",
      "hosting utilization",
    ],
  },
  {
    ticker: "CRWV",
    sector: "AI Infrastructure",
    theme: "hosting_conversion",
    thesisRole: "landlord",
    keyCatalysts: [
      "new hyperscaler contracts",
      "capex guidance",
      "capacity ramp",
    ],
  },
  {
    ticker: "LEU",
    sector: "Nuclear",
    theme: "ai_power",
    thesisRole: "supplier",
    keyCatalysts: [
      "long-term utility contracts",
      "fuel enrichment demand",
      "policy support",
    ],
  },
  {
    ticker: "OKLO",
    sector: "Nuclear",
    theme: "ai_power",
    thesisRole: "supplier",
    keyCatalysts: [
      "permits progress",
      "site announcements",
      "power offtake deals",
    ],
  },
  {
    ticker: "CCJ",
    sector: "Nuclear",
    theme: "ai_power",
    thesisRole: "supplier",
    keyCatalysts: [
      "uranium contract pricing",
      "production guidance",
      "policy shifts",
    ],
  },
  {
    ticker: "UUUU",
    sector: "Nuclear",
    theme: "ai_power",
    thesisRole: "supplier",
    keyCatalysts: [
      "rare-earth byproduct demand",
      "uranium spot strength",
      "processing capacity",
    ],
  },
  {
    ticker: "VST",
    sector: "AI Energy",
    theme: "ai_power",
    thesisRole: "supplier",
    keyCatalysts: [
      "power purchase agreements",
      "data-center demand",
      "capacity additions",
    ],
  },
  {
    ticker: "CEG",
    sector: "AI Energy",
    theme: "ai_power",
    thesisRole: "supplier",
    keyCatalysts: [
      "utility-scale contracts",
      "grid reliability pricing",
      "nuclear extensions",
    ],
  },
  {
    ticker: "BE",
    sector: "AI Energy",
    theme: "grid_equipment",
    thesisRole: "supplier",
    keyCatalysts: [
      "fuel-cell deployments",
      "data-center pilots",
      "service backlog",
    ],
  },
  {
    ticker: "GEV",
    sector: "AI Energy",
    theme: "grid_equipment",
    thesisRole: "supplier",
    keyCatalysts: [
      "transformer and turbine orders",
      "grid modernization budgets",
      "delivery lead times",
    ],
  },
  {
    ticker: "ONDS",
    sector: "Defense",
    theme: "outsourcing_disruption",
    thesisRole: "supplier",
    keyCatalysts: [
      "defense procurement cycles",
      "autonomy contracts",
      "budget authorizations",
    ],
  },
  {
    ticker: "AVAV",
    sector: "Defense",
    theme: "outsourcing_disruption",
    thesisRole: "supplier",
    keyCatalysts: ["program wins", "backlog growth", "margin expansion"],
  },
  {
    ticker: "KTOS",
    sector: "Defense",
    theme: "outsourcing_disruption",
    thesisRole: "supplier",
    keyCatalysts: [
      "drone and missile program awards",
      "production ramp",
      "budget mix",
    ],
  },
  {
    ticker: "PLTR",
    sector: "Defense",
    theme: "outsourcing_disruption",
    thesisRole: "supplier",
    keyCatalysts: [
      "AIP adoption",
      "government wins",
      "commercial margin durability",
    ],
  },
  {
    ticker: "RR",
    sector: "Robotics",
    theme: "outsourcing_disruption",
    thesisRole: "supplier",
    keyCatalysts: [
      "factory automation demand",
      "labor replacement cycles",
      "book-to-bill",
    ],
  },
  {
    ticker: "SERV",
    sector: "Robotics",
    theme: "outsourcing_disruption",
    thesisRole: "supplier",
    keyCatalysts: [
      "fleet deployments",
      "partnerships",
      "service revenue growth",
    ],
  },
  {
    ticker: "TSLA",
    sector: "Robotics",
    theme: "outsourcing_disruption",
    thesisRole: "supplier",
    keyCatalysts: [
      "robotaxi timeline",
      "AI training capex",
      "autonomy milestones",
    ],
  },
  {
    ticker: "FLNC",
    sector: "Battery Tech",
    theme: "grid_equipment",
    thesisRole: "supplier",
    keyCatalysts: [
      "storage project wins",
      "utility interconnect demand",
      "gross margin trend",
    ],
  },
  {
    ticker: "EOSE",
    sector: "Battery Tech",
    theme: "grid_equipment",
    thesisRole: "supplier",
    keyCatalysts: [
      "manufacturing scale",
      "long-duration contracts",
      "financing updates",
    ],
  },
  {
    ticker: "TE",
    sector: "Battery Tech",
    theme: "grid_equipment",
    thesisRole: "supplier",
    keyCatalysts: [
      "connector demand",
      "industrial orders",
      "AI power rack demand",
    ],
  },
  {
    ticker: "RKLB",
    sector: "Space",
    theme: "gpu_platform",
    thesisRole: "supplier",
    keyCatalysts: ["launch cadence", "government backlog", "satellite demand"],
  },
  {
    ticker: "RDW",
    sector: "Space",
    theme: "gpu_platform",
    thesisRole: "supplier",
    keyCatalysts: [
      "defense space awards",
      "mission pipeline",
      "manufacturing scale",
    ],
  },
  {
    ticker: "ASTS",
    sector: "Space",
    theme: "gpu_platform",
    thesisRole: "supplier",
    keyCatalysts: [
      "satellite deployment milestones",
      "carrier agreements",
      "funding runway",
    ],
  },
  {
    ticker: "OSS",
    sector: "Emerging",
    theme: "gpu_platform",
    thesisRole: "supplier",
    keyCatalysts: [
      "edge AI demand",
      "defense compute wins",
      "gross margin execution",
    ],
  },
  {
    ticker: "KRKNF",
    sector: "Emerging",
    theme: "hosting_conversion",
    thesisRole: "converter",
    keyCatalysts: [
      "site permits",
      "power access agreements",
      "facility conversion pace",
    ],
  },
  {
    ticker: "FCX",
    sector: "Copper",
    theme: "grid_equipment",
    thesisRole: "supplier",
    keyCatalysts: ["copper prices", "grid capex cycle", "mine output guidance"],
  },
  {
    ticker: "SCCO",
    sector: "Copper",
    theme: "grid_equipment",
    thesisRole: "supplier",
    keyCatalysts: [
      "refined copper demand",
      "capex discipline",
      "labor disruptions",
    ],
  },
  {
    ticker: "TMQ",
    sector: "Copper",
    theme: "grid_equipment",
    thesisRole: "supplier",
    keyCatalysts: [
      "project permitting",
      "financing milestones",
      "offtake agreements",
    ],
  },
  {
    ticker: "USAR",
    sector: "Rare Earths",
    theme: "grid_equipment",
    thesisRole: "supplier",
    keyCatalysts: [
      "processing capacity",
      "domestic supply policy",
      "contract awards",
    ],
  },
  {
    ticker: "MP",
    sector: "Rare Earths",
    theme: "grid_equipment",
    thesisRole: "supplier",
    keyCatalysts: ["magnet production ramp", "defense demand", "pricing trend"],
  },
  {
    ticker: "CRML",
    sector: "Rare Earths",
    theme: "grid_equipment",
    thesisRole: "supplier",
    keyCatalysts: [
      "resource updates",
      "refining partnerships",
      "permit timeline",
    ],
  },
  {
    ticker: "AMD",
    sector: "Semiconductors",
    theme: "gpu_platform",
    thesisRole: "supplier",
    keyCatalysts: [
      "MI roadmap execution",
      "cloud design wins",
      "gross margin trend",
    ],
  },
  {
    ticker: "INTC",
    sector: "Semiconductors",
    theme: "outsourcing_disruption",
    thesisRole: "at_risk_incumbent",
    keyCatalysts: [
      "foundry milestones",
      "AI product traction",
      "opex discipline",
    ],
  },
  {
    ticker: "NVDA",
    sector: "Semiconductors",
    theme: "gpu_platform",
    thesisRole: "supplier",
    keyCatalysts: [
      "data-center growth",
      "Blackwell ramp",
      "customer capex guidance",
    ],
  },
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

/** Get full stock metadata for a ticker, or null. */
export function getStockForTicker(ticker: string): SolusOffchainStock | null {
  const upper = ticker.trim().toUpperCase();
  return (
    SOLUS_OFFCHAIN_STOCKS.find((s) => s.ticker.toUpperCase() === upper) ?? null
  );
}

/** Get all tickers mapped to a given theme. */
export function getTickersForTheme(theme: SolusStockTheme): string[] {
  return SOLUS_OFFCHAIN_STOCKS.filter((s) => s.theme === theme).map(
    (s) => s.ticker,
  );
}
