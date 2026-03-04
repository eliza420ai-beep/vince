import { type IAgentRuntime, Service } from "@elizaos/core";
import type { FinnhubService } from "./finnhub.service";
import type { AlphaVantageService } from "./alphaVantage.service";
import type { FMPService } from "./fmp.service";
import {
  getStockForTicker,
  SOLUS_OFFCHAIN_STOCKS,
  type SolusOffchainStock,
} from "../constants/solusStockWatchlist";

const MAX_THEME_BRIEF_TICKERS = 4;

function wantsThemeContext(messageText: string): boolean {
  const t = (messageText || "").toLowerCase();
  const keywords = [
    "stock",
    "stocks",
    "theme",
    "thesis",
    "ai",
    "power",
    "grid",
    "permit",
    "interconnect",
    "data center",
    "hosting",
    "infrastructure",
    "analyze",
  ];
  return keywords.some((k) => t.includes(k));
}

function fmtSignedPercent(v: number | null | undefined): string {
  if (typeof v !== "number" || Number.isNaN(v)) return "n/a";
  const p = v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
  return `${p}%`;
}

function shortCatalysts(stock: SolusOffchainStock): string {
  return stock.keyCatalysts.slice(0, 2).join(", ");
}

export class SolusThemeBriefService extends Service {
  static serviceType = "SOLUS_THEME_BRIEF_SERVICE" as const;
  capabilityDescription =
    "Builds AI bottleneck theme brief for Solus offchain stocks (power, permits, hosting conversion, catalyst map).";

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<SolusThemeBriefService> {
    return new SolusThemeBriefService(runtime);
  }

  async stop(): Promise<void> {}

  async buildThemeBrief(messageText: string): Promise<string> {
    if (!wantsThemeContext(messageText)) return "";

    const finnhub = this.runtime.getService("FINNHUB_SERVICE") as
      | FinnhubService
      | null
      | undefined;
    const alpha = this.runtime.getService("ALPHA_VANTAGE_SERVICE") as
      | AlphaVantageService
      | null
      | undefined;
    const fmp = this.runtime.getService("FMP_SERVICE") as
      | FMPService
      | null
      | undefined;

    const text = messageText || "";
    const preferred = finnhub?.isConfigured?.() ? finnhub : alpha;
    if (!preferred) return "";

    const requested = preferred.getRequestedTickers(text).tickers;
    const explicit =
      requested.length > 0
        ? requested
        : SOLUS_OFFCHAIN_STOCKS.map((s) => s.ticker);
    const tickers = [...new Set(explicit)].slice(0, MAX_THEME_BRIEF_TICKERS);
    if (tickers.length === 0) return "";

    const lines: string[] = ["[Solus theme brief - AI bottlenecks]"];
    const themeCounts = new Map<string, number>();

    for (const ticker of tickers) {
      const stock = getStockForTicker(ticker);
      if (!stock) continue;
      themeCounts.set(stock.theme, (themeCounts.get(stock.theme) ?? 0) + 1);

      const quote =
        finnhub?.isConfigured?.() && finnhub
          ? await finnhub.getQuote(ticker)
          : await alpha?.getQuote(ticker);
      const metrics = fmp?.isConfigured?.()
        ? await fmp.getKeyMetrics(ticker)
        : null;

      const change = fmtSignedPercent(quote?.dp);
      const px =
        quote && typeof quote.c === "number" && !Number.isNaN(quote.c)
          ? `$${quote.c.toFixed(2)}`
          : "n/a";
      const pe =
        metrics && typeof metrics.peRatio === "number" && metrics.peRatio > 0
          ? `${metrics.peRatio.toFixed(1)}x P/E`
          : "P/E n/a";

      lines.push(
        `${ticker}: ${stock.theme} | role=${stock.thesisRole} | px=${px} (${change}) | ${pe}`,
      );
      lines.push(`  catalysts: ${shortCatalysts(stock)}`);
    }

    if (themeCounts.size > 0) {
      const rollup = [...themeCounts.entries()]
        .map(([theme, count]) => `${theme}:${count}`)
        .join(" | ");
      lines.push(`Theme density: ${rollup}`);
    }
    lines.push(
      "Use this to reason second-order: who owns scarce power/permitting/interconnect and who is exposed if capex slows.",
    );

    return lines.join("\n");
  }
}
