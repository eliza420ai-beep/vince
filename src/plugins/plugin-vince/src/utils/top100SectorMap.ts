import type { Top100Category } from "./top100Stocks";

/**
 * Editorial category override from TOP100.md annex (March 2026).
 * Applied before FD company facts so known tickers never show "Unknown".
 */
export const TICKER_CATEGORY_OVERRIDE: Record<string, Top100Category> = {
  // I. AI Semiconductors
  ASML: "AI Semiconductors",
  NVDA: "AI Semiconductors",
  TSM: "AI Semiconductors",
  AVGO: "AI Semiconductors",
  AMD: "AI Semiconductors",
  MU: "AI Semiconductors",
  MRVL: "AI Semiconductors",
  ADI: "AI Semiconductors",
  MCHP: "AI Semiconductors",
  CRDO: "AI Semiconductors",
  ARM: "AI Semiconductors",
  GFS: "AI Semiconductors",
  IONQ: "AI Semiconductors",
  AMAT: "AI Semiconductors",
  KLAC: "AI Semiconductors",
  LRCX: "AI Semiconductors",
  CDNS: "AI Semiconductors",
  SNPS: "AI Semiconductors",
  // II. AI Cloud & Compute
  MSFT: "AI Cloud & Compute",
  AMZN: "AI Cloud & Compute",
  META: "AI Cloud & Compute",
  ORCL: "AI Cloud & Compute",
  CRWV: "AI Cloud & Compute",
  NBIS: "AI Cloud & Compute",
  DELL: "AI Cloud & Compute",
  HPE: "AI Cloud & Compute",
  SMCI: "AI Cloud & Compute",
  // III. AI Platforms & Infrastructure
  PLTR: "AI Platforms & Infrastructure",
  APP: "AI Platforms & Infrastructure",
  CSCO: "AI Platforms & Infrastructure",
  ANET: "AI Platforms & Infrastructure",
  FTNT: "AI Platforms & Infrastructure",
  ZS: "AI Platforms & Infrastructure",
  DDOG: "AI Platforms & Infrastructure",
  CIEN: "AI Platforms & Infrastructure",
  NTNX: "AI Platforms & Infrastructure",
  CTSH: "AI Platforms & Infrastructure",
  GLW: "AI Platforms & Infrastructure",
  SOUN: "AI Platforms & Infrastructure",
  VRT: "AI Platforms & Infrastructure",
  LITE: "AI Platforms & Infrastructure",
  ASTS: "AI Platforms & Infrastructure",
  // IV. Defense & Aerospace
  RTX: "Defense & Aerospace",
  NOC: "Defense & Aerospace",
  GE: "Defense & Aerospace",
  AXON: "Defense & Aerospace",
  MSI: "Defense & Aerospace",
  // V. Healthcare & Biotech
  VRTX: "Healthcare & Biotech",
  TMO: "Healthcare & Biotech",
  DHR: "Healthcare & Biotech",
  ABT: "Healthcare & Biotech",
  BSX: "Healthcare & Biotech",
  SYK: "Healthcare & Biotech",
  AMGN: "Healthcare & Biotech",
  AZN: "Healthcare & Biotech",
  ELV: "Healthcare & Biotech",
  PODD: "Healthcare & Biotech",
  HALO: "Healthcare & Biotech",
  EXAS: "Healthcare & Biotech",
  // VI. Energy, Power & Utilities
  CEG: "Energy, Power & Utilities",
  EQT: "Energy, Power & Utilities",
  OKLO: "Energy, Power & Utilities",
  DUK: "Energy, Power & Utilities",
  EXC: "Energy, Power & Utilities",
  PEG: "Energy, Power & Utilities",
  NRG: "Energy, Power & Utilities",
  XEL: "Energy, Power & Utilities",
  WMB: "Energy, Power & Utilities",
  ENPH: "Energy, Power & Utilities",
  FSLR: "Energy, Power & Utilities",
  GNRC: "Energy, Power & Utilities",
  BE: "Energy, Power & Utilities",
  NXT: "Energy, Power & Utilities",
  CORZ: "Energy, Power & Utilities",
  // VII. Enterprise Software
  SAP: "Enterprise Software",
  INTU: "Enterprise Software",
  ADSK: "Enterprise Software",
  HUBS: "Enterprise Software",
  MDB: "Enterprise Software",
  TEAM: "Enterprise Software",
  WDAY: "Enterprise Software",
  VEEV: "Enterprise Software",
  DOCU: "Enterprise Software",
  // VIII. Industrial & Automation
  ABB: "Industrial & Automation",
  TT: "Industrial & Automation",
  LIN: "Industrial & Automation",
  CMI: "Industrial & Automation",
  PCAR: "Industrial & Automation",
  FLEX: "Industrial & Automation",
  ROP: "Industrial & Automation",
  CTAS: "Industrial & Automation",
  // IX. Consumer & Digital Commerce
  WMT: "Consumer & Digital Commerce",
  COST: "Consumer & Digital Commerce",
  BKNG: "Consumer & Digital Commerce",
  MELI: "Consumer & Digital Commerce",
  NFLX: "Consumer & Digital Commerce",
  SHOP: "Consumer & Digital Commerce",
  UBER: "Consumer & Digital Commerce",
  DASH: "Consumer & Digital Commerce",
  CVNA: "Consumer & Digital Commerce",
  CPRT: "Consumer & Digital Commerce",
  PM: "Consumer & Digital Commerce",
  RBLX: "Consumer & Digital Commerce",
  TTWO: "Consumer & Digital Commerce",
  KKR: "Consumer & Digital Commerce",
  VRSN: "Consumer & Digital Commerce",
  // Scorecard / portfolio tickers not in annex tables
  SNDK: "AI Semiconductors",
  GEV: "Energy, Power & Utilities",
  EME: "Industrial & Automation",
  NVO: "Healthcare & Biotech",
  CRWD: "AI Platforms & Infrastructure",
  ISRG: "Healthcare & Biotech",
  REGN: "Healthcare & Biotech",
  LLY: "Healthcare & Biotech",
  CLS: "Industrial & Automation",
  ETN: "Industrial & Automation",
  PWR: "Industrial & Automation",
  BWXT: "Defense & Aerospace",
  PANW: "AI Platforms & Infrastructure",
  NOW: "Enterprise Software",
  NEE: "Energy, Power & Utilities",
  NET: "AI Platforms & Infrastructure",
  VST: "Energy, Power & Utilities",
  COIN: "Consumer & Digital Commerce",
  HOOD: "Consumer & Digital Commerce",
  HIMS: "Healthcare & Biotech",
};

/**
 * Map FD sector + industry to Top100 thematic category.
 * Fallback: Unknown.
 */
export function sectorToCategory(
  sector?: string | null,
  industry?: string | null,
): Top100Category {
  const s = (sector ?? "").toLowerCase();
  const i = (industry ?? "").toLowerCase();

  if (s.includes("technology") || s.includes("tech")) {
    if (
      i.includes("semiconductor") ||
      i.includes("chip") ||
      i.includes("semis")
    )
      return "AI Semiconductors";
    if (i.includes("cloud") || i.includes("software") || i.includes("platform"))
      return "AI Cloud & Compute";
    if (
      i.includes("internet") ||
      i.includes("infrastructure") ||
      i.includes("data center")
    )
      return "AI Platforms & Infrastructure";
    if (i.includes("software") || i.includes("enterprise"))
      return "Enterprise Software";
  }

  if (s.includes("industrials") || s.includes("industrial")) {
    if (
      i.includes("aerospace") ||
      i.includes("defense") ||
      i.includes("military")
    )
      return "Defense & Aerospace";
    return "Industrial & Automation";
  }

  if (
    s.includes("healthcare") ||
    s.includes("health") ||
    s.includes("pharma") ||
    s.includes("biotech")
  )
    return "Healthcare & Biotech";

  if (
    s.includes("energy") ||
    s.includes("utilities") ||
    i.includes("electric") ||
    i.includes("power")
  )
    return "Energy, Power & Utilities";

  if (
    s.includes("consumer") ||
    i.includes("retail") ||
    i.includes("e-commerce") ||
    i.includes("digital commerce")
  )
    return "Consumer & Digital Commerce";

  if (i.includes("semiconductor") || i.includes("chip") || i.includes("semis"))
    return "AI Semiconductors";
  if (i.includes("software") || i.includes("enterprise"))
    return "Enterprise Software";
  if (i.includes("aerospace") || i.includes("defense"))
    return "Defense & Aerospace";

  return "Unknown";
}
