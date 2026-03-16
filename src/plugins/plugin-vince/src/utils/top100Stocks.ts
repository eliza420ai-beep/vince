import * as fs from "node:fs";
import * as path from "node:path";

export type Top100Category =
  | "AI Semiconductors"
  | "AI Cloud & Compute"
  | "AI Platforms & Infrastructure"
  | "Defense & Aerospace"
  | "Healthcare & Biotech"
  | "Energy, Power & Utilities"
  | "Enterprise Software"
  | "Industrial & Automation"
  | "Consumer & Digital Commerce"
  | "Unknown";

export interface Top100StockRow {
  /** Stable unique id for React keys and diffing (one row per normalized ticker). */
  id: string;
  ticker: string;
  company: string | null;
  category: Top100Category;
  /** 1–100 rank from scorecard table when available */
  rank?: number;
  /** Composite score from scorecard (0–100) */
  composite?: number;
  /** Sleeve from scorecard: tastytrade | hyperliquid | watchlist */
  sleeve?: string;
  /** Human-readable scorecard flags (high_momentum, insider_selling, etc.) */
  flags?: string[];
  /** Annex price fields – strings so we can show them directly without risky numeric parsing */
  price?: string;
  avgPriceTarget?: string;
  upsidePct?: string;
  offAthPct?: string;
  /** Quote / overlay fields added downstream – kept here for shared typing. */
  priceLive?: number;
  change1dPct?: number;
  change7dPct?: number;
  change30dPct?: number;
  sparkline7d?: Array<{
    date: string;
    close: number;
  }>;
  marketCap?: number;
  avgVolume?: number;
  dollarVolume?: number;
  quoteSource?: "yahoo" | "hip3" | "fd_cache";
  quoteUpdatedAt?: number;
  quoteStale?: boolean;
  liveRank?: number;
  rankDrift?: number;
  /** VINCE-native context (editorial heuristics) */
  keyStrength?: string;
  whyNow?: string;
  convictionTier?: "S" | "A" | "B" | "C" | "D";
  riskSummary?: string;
  theme?: string;
}

export interface Top100Meta {
  total: number;
  byCategory: Array<{
    category: Top100Category;
    count: number;
  }>;
  topByComposite: Top100StockRow[];
  highestUpside: Array<{
    ticker: string;
    upside: string;
    sector: string;
  }>;
  sleeveAverages?: {
    tastytrade?: number;
    hyperliquid?: number;
    watchlist?: number;
  };
  /** Percent of rows with composite score present. */
  scoredCoveragePct?: number;
  /** Percent of rows with price or 1D change available. */
  quoteCoveragePct?: number;
  /** Percent of rows with 7D/30D history available. */
  historyCoveragePct?: number;
  /** Percent of rows with market cap available. */
  marketCapCoveragePct?: number;
  /** Human-readable warnings when the dataset is incomplete. */
  warnings?: string[];
}

interface CachedTop100 {
  mtimeMs: number;
  rows: Top100StockRow[];
  meta: Top100Meta;
}

let cache: CachedTop100 | null = null;

const CATEGORY_HEADING_TO_CATEGORY: Record<string, Top100Category> = {
  "I. AI Semiconductors": "AI Semiconductors",
  "II. AI Cloud & Compute": "AI Cloud & Compute",
  "III. AI Platforms & Infrastructure": "AI Platforms & Infrastructure",
  "IV. Defense & Aerospace": "Defense & Aerospace",
  "V. Healthcare & Biotech": "Healthcare & Biotech",
  "VI. Energy, Power & Utilities": "Energy, Power & Utilities",
  "VII. Enterprise Software": "Enterprise Software",
  "VIII. Industrial & Automation": "Industrial & Automation",
  "IX. Consumer & Digital Commerce": "Consumer & Digital Commerce",
};

function parseAnnexTables(markdown: string): Array<{
  category: Top100Category;
  rows: Top100StockRow[];
}> {
  // Heuristic: the annex repeats the sector headings starting from the second
  // occurrence of "## I. AI Semiconductors". We only want to parse from that
  // block onward so that narrative sections and earlier headings don't bleed
  // into the structured tables.
  const firstIdx = markdown.indexOf("## I. AI Semiconductors");
  let startIdx = firstIdx;
  if (firstIdx !== -1) {
    const secondIdx = markdown.indexOf("## I. AI Semiconductors", firstIdx + 1);
    if (secondIdx !== -1) {
      startIdx = secondIdx;
    }
  }

  const relevant =
    startIdx != null && startIdx >= 0 ? markdown.slice(startIdx) : markdown;
  const lines = relevant.split("\n");
  const sections: Array<{ category: Top100Category; rows: Top100StockRow[] }> =
    [];
  let currentCategory: Top100Category | null = null;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("## ")) {
      const heading = line.replace(/^##\s+/, "").trim();
      const cat =
        CATEGORY_HEADING_TO_CATEGORY[heading] ??
        (null as Top100Category | null);
      if (cat) {
        currentCategory = cat;
        sections.push({ category: cat, rows: [] });
        inTable = false;
      } else {
        // Any non-mapped heading closes the current category to avoid later
        // tables inheriting the previous category by accident.
        currentCategory = null;
        inTable = false;
      }
      continue;
    }

    if (!currentCategory) continue;

    if (line.startsWith("| Ticker |")) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith("|------")) {
      continue;
    }
    if (inTable && line.startsWith("|")) {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      if (cells.length < 2) continue;
      const [ticker, company, price, , , avgPt, upside, offAth] = cells;
      if (!ticker || ticker === "Ticker") continue;
      const section = sections[sections.length - 1];
      if (!section) continue;
      const normalizedTicker = ticker.toUpperCase().trim();
      section.rows.push({
        id: `top100:${normalizedTicker}`,
        ticker,
        company: company || null,
        category: currentCategory,
        price: price || undefined,
        avgPriceTarget: avgPt || undefined,
        upsidePct: upside || undefined,
        offAthPct: offAth || undefined,
      });
      continue;
    }

    if (inTable && line === "---") {
      inTable = false;
    }
  }

  return sections;
}

function parseScorecard(markdown: string): {
  byTicker: Map<
    string,
    {
      rank?: number;
      composite?: number;
      sleeve?: string;
      flags?: string[];
    }
  >;
} {
  const byTicker = new Map<
    string,
    { rank?: number; composite?: number; sleeve?: string; flags?: string[] }
  >();

  const scorecardIndex = markdown.indexOf("# Ticker Scorecard");
  if (scorecardIndex === -1) {
    return { byTicker };
  }

  const slice = markdown.slice(scorecardIndex).split("\n");
  let inTable = false;
  for (const raw of slice) {
    const line = raw.trim();
    if (line.startsWith("| Rank | Ticker")) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (line.startsWith("|------")) continue;
    if (!line.startsWith("|")) {
      if (line === "" || !line.includes("|")) {
        break;
      }
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 12) continue;
    const [rankStr, ticker, sleeve, compositeStr, , , , , , , , flagsStr] =
      cells;
    if (!ticker || ticker === "Ticker") continue;
    const normalizedTicker = ticker.toUpperCase().trim();
    const rank = Number.parseInt(rankStr, 10);
    const composite = Number.parseFloat(compositeStr);
    const flags =
      flagsStr && flagsStr !== "-" && flagsStr !== "—"
        ? flagsStr.split(",").map((f) => f.trim())
        : [];
    byTicker.set(normalizedTicker, {
      rank: Number.isFinite(rank) ? rank : undefined,
      composite: Number.isFinite(composite) ? composite : undefined,
      sleeve: sleeve || undefined,
      flags: flags.length > 0 ? flags : undefined,
    });
  }

  return { byTicker };
}

function parseSleeveAverages(markdown: string): {
  tastytrade?: number;
  hyperliquid?: number;
  watchlist?: number;
} {
  const result: {
    tastytrade?: number;
    hyperliquid?: number;
    watchlist?: number;
  } = {};
  const idx = markdown.indexOf("## Sleeve averages");
  if (idx === -1) return result;
  const slice = markdown.slice(idx).split("\n").slice(1, 10);
  for (const raw of slice) {
    const line = raw.trim();
    const m = line.match(
      /^\-\s+\*\*(tastytrade|hyperliquid|watchlist)\*\*:\s*([0-9.]+)/i,
    );
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = Number.parseFloat(m[2]);
    if (!Number.isFinite(val)) continue;
    if (key === "tastytrade") result.tastytrade = val;
    if (key === "hyperliquid") result.hyperliquid = val;
    if (key === "watchlist") result.watchlist = val;
  }
  return result;
}

function parseHighestUpside(markdown: string): Array<{
  ticker: string;
  upside: string;
  sector: string;
}> {
  const out: Array<{
    ticker: string;
    upside: string;
    sector: string;
  }> = [];
  const idx = markdown.indexOf("## The Highest Upside Names (by PT)");
  if (idx === -1) return out;
  const slice = markdown.slice(idx).split("\n");
  let inTable = false;
  for (const raw of slice) {
    const line = raw.trim();
    if (line.startsWith("| Ticker | Upside")) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (line.startsWith("|--------")) continue;
    if (!line.startsWith("|")) {
      if (line === "" || !line.includes("|")) break;
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 4) continue;
    const [ticker, upside, , sector] = cells;
    if (!ticker || ticker === "Ticker") continue;
    out.push({ ticker, upside, sector });
  }
  return out;
}

export function loadTop100FromMarkdown(
  projectRoot: string = process.cwd(),
): CachedTop100 {
  const filePath = path.join(projectRoot, "TOP100.md");
  if (!fs.existsSync(filePath)) {
    throw new Error("TOP100.md not found at repo root");
  }
  const stat = fs.statSync(filePath);
  if (cache && cache.mtimeMs === stat.mtimeMs) {
    return cache;
  }
  const raw = fs.readFileSync(filePath, "utf-8");

  const annexSections = parseAnnexTables(raw);
  const { byTicker } = parseScorecard(raw);
  const highestUpside = parseHighestUpside(raw);
  const sleeveAverages = parseSleeveAverages(raw);

  const preliminaryRows: Top100StockRow[] = [];
  for (const section of annexSections) {
    for (const row of section.rows) {
      const normalizedTicker = row.ticker.toUpperCase().trim();
      const score = byTicker.get(normalizedTicker) ?? {};
      preliminaryRows.push({
        ...row,
        category: section.category,
        rank: score.rank,
        composite: score.composite,
        sleeve: score.sleeve,
        flags: score.flags,
      });
    }
  }

  // Ensure one canonical row per normalized ticker. Prefer the row that has a
  // composite score; otherwise keep the first seen.
  const byTickerCanonical = new Map<string, Top100StockRow>();
  for (const row of preliminaryRows) {
    const key = row.ticker.toUpperCase().trim();
    const existing = byTickerCanonical.get(key);
    if (!existing) {
      byTickerCanonical.set(key, row);
      continue;
    }
    const existingHasComposite =
      typeof existing.composite === "number" &&
      Number.isFinite(existing.composite);
    const rowHasComposite =
      typeof row.composite === "number" && Number.isFinite(row.composite);
    if (!existingHasComposite && rowHasComposite) {
      byTickerCanonical.set(key, row);
    }
  }

  const rows = Array.from(byTickerCanonical.values());

  const byCategoryMap = new Map<Top100Category, number>();
  for (const r of rows) {
    const cur = byCategoryMap.get(r.category) ?? 0;
    byCategoryMap.set(r.category, cur + 1);
  }
  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));

  const topByComposite = [...rows]
    .filter((r) => typeof r.composite === "number")
    .sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0))
    .slice(0, 10);

  const meta: Top100Meta = {
    total: rows.length,
    byCategory,
    topByComposite,
    highestUpside,
    sleeveAverages,
  };

  cache = { mtimeMs: stat.mtimeMs, rows, meta };
  return cache;
}
