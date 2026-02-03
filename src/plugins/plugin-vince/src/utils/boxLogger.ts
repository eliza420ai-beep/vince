/**
 * Shared terminal box/dashboard styling to match the paper trade-opened banner.
 * Use for CoinGecko, Binance, CoinGlass, and other dashboards so they look consistent.
 */

const W = 63;

const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);

/** Single content line (left-padded, truncated to W chars). */
export const line = (s: string) => `  ║ ${pad(s, W)} ║`;

/** Empty line inside the box. */
export const empty = line("");

/** Top border (double line). */
export const top = () => console.log("  ╔" + "═".repeat(W + 2) + "╗");

/** Bottom border (double line). */
export const bottom = () => console.log("  ╚" + "═".repeat(W + 2) + "╝");

/** Section separator (single line). */
export const sep = () => console.log("  ╟" + "─".repeat(W + 2) + "╢");

/** Log a line (content only; adds borders). */
export const logLine = (s: string) => console.log(line(s));

/** Log empty line. */
export const logEmpty = () => console.log(empty);

/** Start a dashboard: blank line, top border, empty line. */
export const startBox = () => {
  console.log("");
  top();
  logEmpty();
};

/** End a dashboard: empty line, bottom border, blank line. */
export const endBox = () => {
  logEmpty();
  bottom();
  console.log("");
};

/** Log a section header (e.g. "  💰 PRICES (24h)") and optional separator after. */
export const section = (title: string, addSep = true) => {
  logLine(title);
  if (addSep) {
    sep();
    logEmpty();
  }
};

/** Content width for manual padding. */
export const boxWidth = W;
