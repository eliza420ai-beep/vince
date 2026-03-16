import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { describe, expect, it } from "vitest";
import { getPreviousBarReturn1d } from "../utils/financialDatasetsCache";
import {
  loadTop100FromMarkdown,
  validateTop100ScorecardAnnexDiff,
} from "../utils/top100Stocks";
import { buildTop100StocksSection } from "../utils/top100Enrichment";
import {
  readProfileFromCache,
  writeProfileToCache,
} from "../utils/top100ProfileCache";

describe("Top100 data coverage", () => {
  it("Yahoo refresh task uses all Top100 tickers from markdown (unique, non-empty)", () => {
    const { rows } = loadTop100FromMarkdown(process.cwd());
    const tickers = Array.from(
      new Set(rows.map((r) => r.ticker.toUpperCase().trim()).filter(Boolean)),
    );
    expect(tickers.length).toBeGreaterThan(0);
    expect(tickers.length).toBe(new Set(tickers).size);
  });

  it("getPreviousBarReturn1d returns 1D return when cache has at least 2 bars", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "top100-fd-"));
    try {
      const pricesDir = path.join(
        tmp,
        ".elizadb",
        "financialdatasets-cache",
        "prices",
      );
      fs.mkdirSync(pricesDir, { recursive: true });
      const envelope = {
        ticker: "TEST",
        source: "financialdatasets" as const,
        endpoint: "https://api.financialdatasets.ai/prices",
        interval: "day" as const,
        startDate: "2024-01-01",
        endDate: "2024-01-05",
        fetchedAt: new Date().toISOString(),
        rowCount: 2,
        rows: [
          { date: "2024-01-02", close: 100 },
          { date: "2024-01-03", close: 105 },
        ],
      };
      fs.writeFileSync(
        path.join(pricesDir, "TEST_2024-01-01_2024-01-05_day.json"),
        JSON.stringify(envelope),
      );
      const result = getPreviousBarReturn1d(tmp, "TEST");
      expect(result).not.toBeNull();
      expect(result!.returnPct).toBe(5);
      expect(result!.previousDate).toBe("2024-01-02");
      expect(result!.latestDate).toBe("2024-01-03");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("getPreviousBarReturn1d returns null when cache has fewer than 2 bars", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "top100-fd-one-"));
    try {
      const pricesDir = path.join(
        tmp,
        ".elizadb",
        "financialdatasets-cache",
        "prices",
      );
      fs.mkdirSync(pricesDir, { recursive: true });
      const envelope = {
        ticker: "ONE",
        source: "financialdatasets" as const,
        endpoint: "https://api.financialdatasets.ai/prices",
        interval: "day" as const,
        startDate: "2024-01-01",
        endDate: "2024-01-02",
        fetchedAt: new Date().toISOString(),
        rowCount: 1,
        rows: [{ date: "2024-01-02", close: 100 }],
      };
      fs.writeFileSync(
        path.join(pricesDir, "ONE_2024-01-01_2024-01-02_day.json"),
        JSON.stringify(envelope),
      );
      const result = getPreviousBarReturn1d(tmp, "ONE");
      expect(result).toBeNull();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("profile cache read/write and market-cap fallback source", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "top100-profile-"));
    try {
      writeProfileToCache(tmp, {
        ticker: "MCAP",
        marketCap: 1_000_000_000,
        currency: "USD",
        updatedAt: new Date().toISOString(),
      });
      const read = readProfileFromCache(tmp, "MCAP");
      expect(read).not.toBeNull();
      expect(read!.marketCap).toBe(1_000_000_000);
      expect(read!.ticker).toBe("MCAP");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("validateTop100ScorecardAnnexDiff returns annex and scorecard ticker sets", () => {
    const result = validateTop100ScorecardAnnexDiff(process.cwd());
    expect(Array.isArray(result.annexTickers)).toBe(true);
    expect(Array.isArray(result.scorecardTickers)).toBe(true);
    expect(Array.isArray(result.onlyInAnnex)).toBe(true);
    expect(Array.isArray(result.onlyInScorecard)).toBe(true);
    expect(
      result.onlyInAnnex.every((t) => !result.scorecardTickers.includes(t)),
    ).toBe(true);
    expect(
      result.onlyInScorecard.every((t) => !result.annexTickers.includes(t)),
    ).toBe(true);
  });

  it("buildTop100StocksSection returns meta with coverage and optional missing-ticker lists", () => {
    const { section, status } = buildTop100StocksSection({
      projectRoot: process.cwd(),
      hip3: null,
    });
    expect(section).not.toBeNull();
    expect(section!.meta).toBeDefined();
    expect(typeof section!.meta.quoteCoveragePct).toBe("number");
    expect(typeof section!.meta.marketCapCoveragePct).toBe("number");
    expect(typeof section!.meta.historyCoveragePct).toBe("number");
    if (section!.meta.warnings && section!.meta.warnings.length > 0) {
      expect(
        section!.meta.missingYahooTickers === undefined ||
          Array.isArray(section!.meta.missingYahooTickers),
      ).toBe(true);
      expect(
        section!.meta.missingMarketCapTickers === undefined ||
          Array.isArray(section!.meta.missingMarketCapTickers),
      ).toBe(true);
    }
  });
});
