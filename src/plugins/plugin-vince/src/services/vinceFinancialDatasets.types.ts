/**
 * Financial Datasets warehouse types.
 * Per-domain manifests and refresh policies under .elizadb/financialdatasets-cache/.
 */

export const FD_WAREHOUSE_DOMAINS = [
  "prices",
  "fundamentals",
  "earnings",
  "filings",
  "insiders",
  "snapshots",
] as const;

export type FdWarehouseDomain = (typeof FD_WAREHOUSE_DOMAINS)[number];

/** Manifest per dataset family (one per domain). */
export interface FdDomainManifest {
  generatedAt: string;
  source: "financialdatasets";
  domain: FdWarehouseDomain;
  files: Array<{
    ticker: string;
    file: string;
    rowCount?: number;
    recordCount?: number;
  }>;
}

/** Refresh policy: max age in ms before considered stale. */
export const FD_REFRESH_POLICY_MS: Record<FdWarehouseDomain, number> = {
  prices: 24 * 60 * 60 * 1000, // 24h
  fundamentals: 7 * 24 * 60 * 60 * 1000, // 7d
  earnings: 24 * 60 * 60 * 1000, // 1d
  filings: 7 * 24 * 60 * 60 * 1000, // 7d
  insiders: 7 * 24 * 60 * 60 * 1000, // 7d
  snapshots: 24 * 60 * 60 * 1000, // 1d (factor snapshots)
};

/** Cached envelope for fundamentals (income + balance + cash flow). */
export interface FdFundamentalsEnvelope {
  ticker: string;
  source: "financialdatasets";
  fetchedAt: string;
  incomeStatements?: unknown[];
  balanceSheets?: unknown[];
  cashFlowStatements?: unknown[];
}

/** Cached envelope for earnings snapshot. */
export interface FdEarningsEnvelope {
  ticker: string;
  source: "financialdatasets";
  fetchedAt: string;
  earnings: unknown;
}

/** Cached envelope for filings list. */
export interface FdFilingsEnvelope {
  ticker: string;
  source: "financialdatasets";
  fetchedAt: string;
  filings: unknown[];
}

/** Cached envelope for insider trades. */
export interface FdInsidersEnvelope {
  ticker: string;
  source: "financialdatasets";
  fetchedAt: string;
  insider_trades: unknown[];
}
