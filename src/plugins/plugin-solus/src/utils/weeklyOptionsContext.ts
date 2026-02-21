/**
 * Shared parsing for docs/standup/weekly-options-context.md.
 * Used by hypersurfaceContext.provider (portfolio + open positions) and
 * standupDataFetcher.fetchSolusData (last week's strategy + open positions + daily question).
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface WeeklyOptionsContext {
  /** ## Portfolio section: holdings, cost basis, mode (e.g. covered-call). */
  portfolioSection: string;
  /** ## Open positions section: current option positions. */
  openPositionsSection: string;
  /** Rest of file or ## Last week's strategy — used as "Last week's strategy" in standup. */
  lastWeekStrategy: string;
}

const DEFAULT_DIR = "docs/standup";
const FILENAME = "weekly-options-context.md";

function getFilePath(): string {
  const dir = process.env.STANDUP_DELIVERABLES_DIR?.trim() || DEFAULT_DIR;
  return path.join(process.cwd(), dir, FILENAME);
}

/**
 * Extract content under a markdown heading (e.g. "## Portfolio") until the next ## or end.
 */
function extractSection(raw: string, heading: string): string {
  const normalized = heading.replace(/^#+\s*/, "").trim();
  const patterns = [
    new RegExp(`^##\\s+${escapeRegex(normalized)}\\s*$`, "im"),
    new RegExp(`^##\\s+${escapeRegex(normalized)}\\s*\\n`, "im"),
  ];
  const rest = raw.replace(/\r\n/g, "\n");
  for (const re of patterns) {
    const match = rest.match(re);
    if (match && match.index !== undefined) {
      const start = match.index + match[0].length;
      const after = rest.slice(start);
      const nextHeading = after.match(/\n##\s+/);
      const end =
        nextHeading?.index !== undefined
          ? start + nextHeading.index
          : rest.length;
      return rest.slice(start, end).trim();
    }
  }
  return "";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strip fenced code blocks (``` ... ```) so we don't accidentally parse
 * example headings inside documentation code fences as real data sections.
 */
function stripCodeBlocks(md: string): string {
  return md.replace(/```[\s\S]*?```/g, "");
}

/**
 * Parse raw markdown content into Portfolio, Open positions, and Last week's strategy.
 * Exported for tests; getWeeklyOptionsContext() reads the file and calls this.
 */
export function parseWeeklyOptionsContext(raw: string): WeeklyOptionsContext {
  const trimmed = stripCodeBlocks(raw).trim();
  const portfolioSection = extractSection(trimmed, "## Portfolio");
  const openPositionsSection = extractSection(trimmed, "## Open positions");
  const lastWeekExplicit = extractSection(trimmed, "## Last week's strategy");

  let lastWeekStrategy: string;
  if (lastWeekExplicit) {
    lastWeekStrategy = lastWeekExplicit;
  } else if (trimmed) {
    const rest = trimmed.replace(/\r\n/g, "\n");
    const removeSection = (content: string, sectionName: string): string => {
      const re = new RegExp(
        `(^|\\n)##\\s+${escapeRegex(sectionName)}\\s*\\n[\\s\\S]*?(?=\\n##\\s+|$)`,
        "im",
      );
      return content.replace(re, "$1").replace(/^\n+/, "").trim();
    };
    lastWeekStrategy = removeSection(
      removeSection(rest, "Portfolio"),
      "Open positions",
    ).trim();
  } else {
    lastWeekStrategy = "";
  }

  return {
    portfolioSection,
    openPositionsSection,
    lastWeekStrategy,
  };
}

/**
 * Read and parse weekly-options-context.md into Portfolio, Open positions, and Last week's strategy.
 * If SOLUS_PORTFOLIO_CONTEXT is set, we still read the file for lastWeekStrategy; portfolio/open
 * can be overridden by that env for the combined "portfolio block" in the provider (handled there).
 */
export function getWeeklyOptionsContext(): WeeklyOptionsContext {
  const filePath = getFilePath();
  let raw = "";
  try {
    if (fs.existsSync(filePath)) {
      raw = fs.readFileSync(filePath, "utf-8").trim();
    }
  } catch {
    /* non-fatal */
  }
  return parseWeeklyOptionsContext(raw);
}

/**
 * Combined portfolio + open positions block for injection into Solus context.
 * If SOLUS_PORTFOLIO_CONTEXT is set, returns that (override). Otherwise builds from file sections.
 */
export function getPortfolioContextBlock(): string {
  const env = process.env.SOLUS_PORTFOLIO_CONTEXT?.trim();
  if (env) return env;

  const { portfolioSection, openPositionsSection } = getWeeklyOptionsContext();
  const parts: string[] = [];
  if (portfolioSection) parts.push(portfolioSection);
  if (openPositionsSection) parts.push(openPositionsSection);
  return parts.join("\n\n").trim();
}

/**
 * Whether we have any open positions (for standup daily question).
 */
export function hasOpenPositions(): boolean {
  const { openPositionsSection } = getWeeklyOptionsContext();
  return openPositionsSection.length > 0;
}
