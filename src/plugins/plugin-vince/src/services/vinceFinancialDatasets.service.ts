/**
 * VINCE Financial Datasets Warehouse Service
 *
 * Manages FD data under .elizadb/financialdatasets-cache/ with per-domain
 * manifests and refresh policies. Supports prices, fundamentals, earnings,
 * filings, and insiders. Used by factor builder, backtests, and discovery.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { getFdSleeveTickers } from "../utils/dexterPortfolio";
import {
  prewarmFdPortfolioHistoryCache,
  readFdCacheManifest,
} from "../utils/fdPortfolioCachePrewarm";
import { buildAllFdSnapshots } from "../utils/fdFactorBuilder";
import type { FdTickerSnapshot } from "../utils/fdFactorBuilder.types";
import { scoreFdProjection } from "../utils/fdProjection";
import type {
  FdDomainManifest,
  FdEarningsEnvelope,
  FdFilingsEnvelope,
  FdFundamentalsEnvelope,
  FdInsidersEnvelope,
  FdWarehouseDomain,
} from "./vinceFinancialDatasets.types";
import {
  FD_REFRESH_POLICY_MS,
  FD_WAREHOUSE_DOMAINS,
} from "./vinceFinancialDatasets.types";

const BASE_URL = "https://api.financialdatasets.ai";

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

async function requestJson(
  url: string,
  apiKey: string,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(url, {
    headers: {
      "X-API-KEY": apiKey,
      Accept: "application/json",
    },
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

export class VinceFinancialDatasetsService extends Service {
  static serviceType = "VINCE_FINANCIAL_DATASETS_SERVICE";
  capabilityDescription =
    "Financial Datasets warehouse: prices, fundamentals, earnings, filings, insiders with per-domain manifests and refresh policies";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceFinancialDatasetsService> {
    const service = new VinceFinancialDatasetsService(runtime);
    logger.info("[VinceFinancialDatasets] Warehouse service started");
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[VinceFinancialDatasets] Warehouse service stopped");
  }

  getApiKey(): string {
    const key =
      this.runtime?.getSetting?.("FINANCIAL_DATASETS_API_KEY") ??
      process.env.FINANCIAL_DATASETS_API_KEY ??
      "";
    return typeof key === "string" ? key.trim() : "";
  }

  /** Cache root: .elizadb/financialdatasets-cache */
  getCacheRoot(projectRoot: string = process.cwd()): string {
    return path.join(projectRoot, ".elizadb", "financialdatasets-cache");
  }

  /** Domain subdir, e.g. prices, fundamentals, earnings, filings, insiders, snapshots */
  getDomainDir(domain: FdWarehouseDomain, projectRoot?: string): string {
    return path.join(this.getCacheRoot(projectRoot ?? process.cwd()), domain);
  }

  /** Per-domain manifest path: {domain}/manifest.json */
  getManifestPath(domain: FdWarehouseDomain, projectRoot?: string): string {
    return path.join(
      this.getDomainDir(domain, projectRoot ?? process.cwd()),
      "manifest.json",
    );
  }

  readManifest(
    domain: FdWarehouseDomain,
    projectRoot?: string,
  ): FdDomainManifest | null {
    const manifestPath = this.getManifestPath(
      domain,
      projectRoot ?? process.cwd(),
    );
    if (!fs.existsSync(manifestPath)) {
      if (domain === "prices") {
        const legacy = readFdCacheManifest(projectRoot ?? process.cwd());
        if (legacy)
          return {
            generatedAt: legacy.generatedAt,
            source: "financialdatasets",
            domain: "prices",
            files: legacy.files,
          };
      }
      return null;
    }
    try {
      const raw = fs.readFileSync(manifestPath, "utf-8");
      return JSON.parse(raw) as FdDomainManifest;
    } catch {
      return null;
    }
  }

  writeManifest(
    domain: FdWarehouseDomain,
    manifest: FdDomainManifest,
    projectRoot?: string,
  ): void {
    const dir = this.getDomainDir(domain, projectRoot ?? process.cwd());
    ensureDir(dir);
    const manifestPath = path.join(dir, "manifest.json");
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({ ...manifest, domain }, null, 2),
      "utf-8",
    );
  }

  /** True if domain has no manifest or manifest generatedAt is older than policy */
  isStale(domain: FdWarehouseDomain, projectRoot?: string): boolean {
    const manifest = this.readManifest(domain, projectRoot ?? process.cwd());
    if (!manifest?.generatedAt) return true;
    const age = Date.now() - new Date(manifest.generatedAt).getTime();
    return age > FD_REFRESH_POLICY_MS[domain];
  }

  /** Fetch and cache fundamentals (income + balance + cash flow) for one ticker */
  async fetchAndCacheFundamentals(
    ticker: string,
    projectRoot?: string,
  ): Promise<FdFundamentalsEnvelope | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      logger.warn(
        "[VinceFinancialDatasets] FINANCIAL_DATASETS_API_KEY missing",
      );
      return null;
    }
    const root = projectRoot ?? process.cwd();
    const dir = this.getDomainDir("fundamentals", root);
    ensureDir(dir);
    const upper = ticker.toUpperCase().trim();
    const period = "quarterly";
    const limit = 20;

    const [incomeRes, balanceRes, cashRes] = await Promise.all([
      requestJson(
        `${BASE_URL}/financials/income-statements?ticker=${upper}&period=${period}&limit=${limit}`,
        apiKey,
      ),
      requestJson(
        `${BASE_URL}/financials/balance-sheets?ticker=${upper}&period=${period}&limit=${limit}`,
        apiKey,
      ),
      requestJson(
        `${BASE_URL}/financials/cash-flow-statements?ticker=${upper}&period=${period}&limit=${limit}`,
        apiKey,
      ),
    ]);

    const incomeStatements =
      incomeRes.ok && incomeRes.json && typeof incomeRes.json === "object"
        ? (incomeRes.json as Record<string, unknown>).income_statements
        : undefined;
    const balanceSheets =
      balanceRes.ok && balanceRes.json && typeof balanceRes.json === "object"
        ? (balanceRes.json as Record<string, unknown>).balance_sheets
        : undefined;
    const cashFlowStatements =
      cashRes.ok && cashRes.json && typeof cashRes.json === "object"
        ? (cashRes.json as Record<string, unknown>).cash_flow_statements
        : undefined;

    const envelope: FdFundamentalsEnvelope = {
      ticker: upper,
      source: "financialdatasets",
      fetchedAt: new Date().toISOString(),
      incomeStatements: Array.isArray(incomeStatements)
        ? incomeStatements
        : undefined,
      balanceSheets: Array.isArray(balanceSheets) ? balanceSheets : undefined,
      cashFlowStatements: Array.isArray(cashFlowStatements)
        ? cashFlowStatements
        : undefined,
    };
    const filePath = path.join(dir, `${upper}_fundamentals.json`);
    fs.writeFileSync(filePath, JSON.stringify(envelope, null, 2), "utf-8");
    return envelope;
  }

  /** Fetch and cache earnings snapshot for one ticker */
  async fetchAndCacheEarnings(
    ticker: string,
    projectRoot?: string,
  ): Promise<FdEarningsEnvelope | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;
    const root = projectRoot ?? process.cwd();
    const dir = this.getDomainDir("earnings", root);
    ensureDir(dir);
    const upper = ticker.toUpperCase().trim();
    const res = await requestJson(
      `${BASE_URL}/earnings?ticker=${upper}`,
      apiKey,
    );
    if (!res.ok || !res.json) return null;
    const earnings =
      res.json && typeof res.json === "object"
        ? (res.json as Record<string, unknown>).earnings
        : undefined;
    const envelope: FdEarningsEnvelope = {
      ticker: upper,
      source: "financialdatasets",
      fetchedAt: new Date().toISOString(),
      earnings: earnings ?? res.json,
    };
    const filePath = path.join(dir, `${upper}_earnings.json`);
    fs.writeFileSync(filePath, JSON.stringify(envelope, null, 2), "utf-8");
    return envelope;
  }

  /** Fetch and cache SEC filings list for one ticker */
  async fetchAndCacheFilings(
    ticker: string,
    limit = 30,
    projectRoot?: string,
  ): Promise<FdFilingsEnvelope | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;
    const root = projectRoot ?? process.cwd();
    const dir = this.getDomainDir("filings", root);
    ensureDir(dir);
    const upper = ticker.toUpperCase().trim();
    const res = await requestJson(
      `${BASE_URL}/filings?ticker=${upper}&limit=${limit}`,
      apiKey,
    );
    if (!res.ok || !res.json) return null;
    const filings =
      res.json && typeof res.json === "object"
        ? (res.json as Record<string, unknown>).filings
        : [];
    const envelope: FdFilingsEnvelope = {
      ticker: upper,
      source: "financialdatasets",
      fetchedAt: new Date().toISOString(),
      filings: Array.isArray(filings) ? filings : [],
    };
    const filePath = path.join(dir, `${upper}_filings.json`);
    fs.writeFileSync(filePath, JSON.stringify(envelope, null, 2), "utf-8");
    return envelope;
  }

  /** Fetch and cache insider trades for one ticker */
  async fetchAndCacheInsiders(
    ticker: string,
    limit = 100,
    projectRoot?: string,
  ): Promise<FdInsidersEnvelope | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;
    const root = projectRoot ?? process.cwd();
    const dir = this.getDomainDir("insiders", root);
    ensureDir(dir);
    const upper = ticker.toUpperCase().trim();
    const res = await requestJson(
      `${BASE_URL}/insider-trades?ticker=${upper}&limit=${limit}`,
      apiKey,
    );
    if (!res.ok || !res.json) return null;
    const insider_trades =
      res.json && typeof res.json === "object"
        ? (res.json as Record<string, unknown>).insider_trades
        : [];
    const envelope: FdInsidersEnvelope = {
      ticker: upper,
      source: "financialdatasets",
      fetchedAt: new Date().toISOString(),
      insider_trades: Array.isArray(insider_trades) ? insider_trades : [],
    };
    const filePath = path.join(dir, `${upper}_insiders.json`);
    fs.writeFileSync(filePath, JSON.stringify(envelope, null, 2), "utf-8");
    return envelope;
  }

  /** Refresh selected domains for one ticker. Does not include prices (use refreshSleeve for that). */
  async refreshTicker(
    ticker: string,
    domains: FdWarehouseDomain[],
    projectRoot?: string,
  ): Promise<{ domain: FdWarehouseDomain; ok: boolean }[]> {
    const root = projectRoot ?? process.cwd();
    const results: { domain: FdWarehouseDomain; ok: boolean }[] = [];
    for (const domain of domains) {
      if (domain === "prices" || domain === "snapshots") continue;
      try {
        if (domain === "fundamentals")
          results.push({
            domain,
            ok: (await this.fetchAndCacheFundamentals(ticker, root)) != null,
          });
        else if (domain === "earnings")
          results.push({
            domain,
            ok: (await this.fetchAndCacheEarnings(ticker, root)) != null,
          });
        else if (domain === "filings")
          results.push({
            domain,
            ok: (await this.fetchAndCacheFilings(ticker, 30, root)) != null,
          });
        else if (domain === "insiders")
          results.push({
            domain,
            ok: (await this.fetchAndCacheInsiders(ticker, 100, root)) != null,
          });
        else results.push({ domain, ok: false });
      } catch (e) {
        logger.warn(
          `[VinceFinancialDatasets] refresh ${ticker} ${domain} failed: ${e}`,
        );
        results.push({ domain, ok: false });
      }
    }
    return results;
  }

  /** Refresh all FD sleeve tickers: prices via prewarm, then fundamentals/earnings/filings/insiders per ticker. */
  async refreshSleeve(
    projectRoot?: string,
    options?: {
      years?: number;
      force?: boolean;
      domains?: FdWarehouseDomain[];
    },
  ): Promise<{
    prices: { tickerCount: number; hits: number; misses: number };
    other: Array<{
      ticker: string;
      results: { domain: FdWarehouseDomain; ok: boolean }[];
    }>;
  }> {
    const root = projectRoot ?? process.cwd();
    const apiKey = this.getApiKey();
    const domains =
      options?.domains ??
      (FD_WAREHOUSE_DOMAINS.filter(
        (d) => d !== "snapshots",
      ) as FdWarehouseDomain[]);

    let pricesResult = { tickerCount: 0, hits: 0, misses: 0 };
    if (domains.includes("prices") && apiKey) {
      try {
        const prewarm = await prewarmFdPortfolioHistoryCache({
          projectRoot: root,
          apiKey,
          years: options?.years ?? 5,
          force: options?.force ?? false,
        });
        pricesResult = {
          tickerCount: prewarm.tickerCount,
          hits: prewarm.hits,
          misses: prewarm.misses,
        };
        const pricesManifestPath = this.getManifestPath("prices", root);
        ensureDir(path.dirname(pricesManifestPath));
        const manifest: FdDomainManifest = {
          generatedAt: new Date().toISOString(),
          source: "financialdatasets",
          domain: "prices",
          files: prewarm.files,
        };
        fs.writeFileSync(
          pricesManifestPath,
          JSON.stringify(manifest, null, 2),
          "utf-8",
        );
      } catch (e) {
        logger.warn(`[VinceFinancialDatasets] prices prewarm failed: ${e}`);
      }
    }

    const tickers = getFdSleeveTickers(root);
    const otherDomains = domains.filter(
      (d) => d !== "prices" && d !== "snapshots",
    );
    const other: Array<{
      ticker: string;
      results: { domain: FdWarehouseDomain; ok: boolean }[];
    }> = [];
    for (const ticker of tickers) {
      const results = await this.refreshTicker(ticker, otherDomains, root);
      other.push({ ticker, results });
    }

    if (otherDomains.length > 0) {
      const generatedAt = new Date().toISOString();
      const suffix: Record<string, string> = {
        fundamentals: "fundamentals",
        earnings: "earnings",
        filings: "filings",
        insiders: "insiders",
      };
      for (const domain of otherDomains) {
        const files = other
          .filter((o) => o.results.some((r) => r.domain === domain && r.ok))
          .map((o) => ({
            ticker: o.ticker,
            file: `${o.ticker}_${suffix[domain] ?? domain}.json`,
            recordCount: 1,
          }));
        this.writeManifest(
          domain,
          {
            generatedAt,
            source: "financialdatasets",
            domain,
            files,
          },
          root,
        );
      }
    }

    return { prices: pricesResult, other };
  }

  /**
   * Refresh FD cache for an arbitrary list of tickers (e.g. full candidate universe).
   * Use this before discovery when ranking net-new names so snapshots exist for peers/expansion.
   */
  async refreshForTickers(
    tickers: string[],
    projectRoot?: string,
    options?: {
      years?: number;
      force?: boolean;
      domains?: FdWarehouseDomain[];
    },
  ): Promise<{
    prices: { tickerCount: number; hits: number; misses: number };
    other: Array<{
      ticker: string;
      results: { domain: FdWarehouseDomain; ok: boolean }[];
    }>;
  }> {
    const root = projectRoot ?? process.cwd();
    const apiKey = this.getApiKey();
    const domains =
      options?.domains ??
      (FD_WAREHOUSE_DOMAINS.filter(
        (d) => d !== "snapshots",
      ) as FdWarehouseDomain[]);
    const list = [
      ...new Set(tickers.map((t) => t.toUpperCase().trim())),
    ].filter(Boolean);
    if (list.length === 0) {
      return {
        prices: { tickerCount: 0, hits: 0, misses: 0 },
        other: [],
      };
    }

    let pricesResult = { tickerCount: 0, hits: 0, misses: 0 };
    if (domains.includes("prices") && apiKey) {
      try {
        const prewarm = await prewarmFdPortfolioHistoryCache({
          projectRoot: root,
          apiKey,
          years: options?.years ?? 5,
          force: options?.force ?? false,
          tickers: list,
        });
        pricesResult = {
          tickerCount: prewarm.tickerCount,
          hits: prewarm.hits,
          misses: prewarm.misses,
        };
        const pricesManifestPath = this.getManifestPath("prices", root);
        ensureDir(path.dirname(pricesManifestPath));
        const manifest: FdDomainManifest = {
          generatedAt: new Date().toISOString(),
          source: "financialdatasets",
          domain: "prices",
          files: prewarm.files,
        };
        fs.writeFileSync(
          pricesManifestPath,
          JSON.stringify(manifest, null, 2),
          "utf-8",
        );
      } catch (e) {
        logger.warn(
          `[VinceFinancialDatasets] refreshForTickers prices prewarm failed: ${e}`,
        );
      }
    }

    const otherDomains = domains.filter(
      (d) => d !== "prices" && d !== "snapshots",
    );
    const other: Array<{
      ticker: string;
      results: { domain: FdWarehouseDomain; ok: boolean }[];
    }> = [];
    for (const ticker of list) {
      const results = await this.refreshTicker(ticker, otherDomains, root);
      other.push({ ticker, results });
    }

    if (otherDomains.length > 0) {
      const generatedAt = new Date().toISOString();
      const suffix: Record<string, string> = {
        fundamentals: "fundamentals",
        earnings: "earnings",
        filings: "filings",
        insiders: "insiders",
      };
      for (const domain of otherDomains) {
        const files = other
          .filter((o) => o.results.some((r) => r.domain === domain && r.ok))
          .map((o) => ({
            ticker: o.ticker,
            file: `${o.ticker}_${suffix[domain] ?? domain}.json`,
            recordCount: 1,
          }));
        this.writeManifest(
          domain,
          {
            generatedAt,
            source: "financialdatasets",
            domain,
            files,
          },
          root,
        );
      }
    }

    return { prices: pricesResult, other };
  }

  /**
   * Build factor snapshots for FD sleeve tickers (or for given tickers when building for full candidate universe).
   */
  buildSnapshots(
    projectRoot?: string,
    options?: { tickers?: string[] },
  ): FdTickerSnapshot[] {
    const root = projectRoot ?? process.cwd();
    const snapshots = buildAllFdSnapshots(root, options?.tickers);
    const manifest: FdDomainManifest = {
      generatedAt: new Date().toISOString(),
      source: "financialdatasets",
      domain: "snapshots",
      files: snapshots.map((s) => ({
        ticker: s.ticker,
        file: `${s.ticker}_snapshot.json`,
        recordCount: 1,
      })),
    };
    this.writeManifest("snapshots", manifest, root);
    return snapshots;
  }

  /**
   * Score FD snapshots into forward projections and register with prediction tracker.
   * Call after buildSnapshots() so snapshots are current.
   */
  async registerFdProjections(projectRoot?: string): Promise<string[]> {
    const root = projectRoot ?? process.cwd();
    const snapshots = buildAllFdSnapshots(root);
    const tracker = this.runtime?.getService?.(
      "VINCE_PREDICTION_TRACKER_SERVICE",
    ) as {
      registerPrediction: (input: {
        agent: string;
        kind: string;
        direction: "up" | "down";
        confidenceProb: number;
        horizonHours: number;
        asset?: string;
        metadata?: Record<string, unknown>;
      }) => Promise<string>;
    } | null;
    const ids: string[] = [];
    for (const s of snapshots) {
      const score = scoreFdProjection(s);
      if (tracker) {
        const id = await tracker.registerPrediction({
          agent: "vince",
          kind: "trade",
          direction: score.direction,
          confidenceProb: score.confidenceProb,
          horizonHours: score.horizonHours,
          asset: score.ticker,
          metadata: {
            source: "fd_factors",
            regime1m: score.regime1m,
            reason: score.reason,
            expectedMovePct: score.expectedMovePct,
          },
        });
        ids.push(id);
      }
    }
    return ids;
  }
}
