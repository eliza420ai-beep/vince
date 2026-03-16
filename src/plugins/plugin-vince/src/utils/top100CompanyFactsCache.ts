import * as fs from "node:fs";
import * as path from "node:path";

export interface CompanyFactsCached {
  ticker: string;
  name?: string;
  sector?: string;
  industry?: string;
  exchange?: string;
  market_cap?: number;
  employee_count?: number;
  fetchedAt?: string;
}

const CACHE_DIR = ".elizadb/financialdatasets-cache/company-facts";

/**
 * Read company facts from FD cache (written by VinceFinancialDatasetsService.fetchAndCacheCompanyFacts).
 */
export function readCompanyFactsFromCache(
  projectRoot: string,
  ticker: string,
): CompanyFactsCached | null {
  const root = path.resolve(projectRoot);
  const upper = ticker.toUpperCase().trim();
  const filePath = path.join(root, CACHE_DIR, `${upper}_facts.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as CompanyFactsCached;
    return data && data.ticker ? data : null;
  } catch {
    return null;
  }
}
