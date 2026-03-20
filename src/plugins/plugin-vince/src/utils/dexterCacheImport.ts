import * as fs from "node:fs";
import * as path from "node:path";
import { resolveDexterArtifactRoot } from "./dexterPortfolio";
import type {
  FdCompanyFacts,
  FdDomainManifest,
  FdEarningsEnvelope,
  FdInsidersEnvelope,
  FdWarehouseDomain,
} from "../services/vinceFinancialDatasets.types";
import type { FdCacheEnvelope, FdPriceRow } from "./financialDatasetsCache";

type ImportDomain = "prices" | "company-facts" | "earnings" | "insiders";

export interface DexterCacheImportResult {
  sourceRoot: string;
  destRoot: string;
  imported: Record<ImportDomain, number>;
  skipped: Record<ImportDomain, number>;
  errors: Record<ImportDomain, number>;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeTicker(ticker: string): string {
  return ticker.toUpperCase().trim();
}

function safeIso(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

function sourceFileNewerThanDest(
  sourcePath: string,
  destPath: string,
): boolean {
  if (!fs.existsSync(destPath)) return true;
  try {
    const s = fs.statSync(sourcePath).mtimeMs;
    const d = fs.statSync(destPath).mtimeMs;
    return s > d;
  } catch {
    return true;
  }
}

function writeJsonIfNewer(
  sourcePath: string,
  destPath: string,
  payload: unknown,
): boolean {
  if (!sourceFileNewerThanDest(sourcePath, destPath)) return false;
  ensureDir(path.dirname(destPath));
  fs.writeFileSync(destPath, JSON.stringify(payload, null, 2), "utf-8");
  return true;
}

function getDexterCacheRoot(projectRoot: string): string {
  const root = path.resolve(projectRoot);
  const dexterDefault = path.join(root, ".dexter", "cache");
  if (fs.existsSync(dexterDefault)) return dexterDefault;
  const preferred = path.join(root, "cache_dexter");
  if (fs.existsSync(preferred)) return preferred;
  return path.join(root, "cache");
}

function getVinceFdCacheRoot(projectRoot: string): string {
  return path.join(
    path.resolve(projectRoot),
    ".elizadb",
    "financialdatasets-cache",
  );
}

function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

function tryReadJson(filePath: string): unknown | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function getTickerFromDexterWrapper(doc: unknown): string | null {
  if (!isObj(doc)) return null;
  const params = doc.params;
  if (!isObj(params)) return null;
  const ticker = params.ticker;
  if (typeof ticker !== "string" || !ticker.trim()) return null;
  return normalizeTicker(ticker);
}

function writeDomainManifest(
  domain: FdWarehouseDomain,
  projectRoot: string,
  files: Array<{
    ticker: string;
    file: string;
    recordCount?: number;
    rowCount?: number;
  }>,
): void {
  const root = getVinceFdCacheRoot(projectRoot);
  const dir = path.join(root, domain);
  ensureDir(dir);
  const manifest: FdDomainManifest = {
    generatedAt: new Date().toISOString(),
    source: "financialdatasets",
    domain,
    files,
  };
  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );
}

function importPrices(
  projectRoot: string,
  sourceRoot: string,
): {
  imported: number;
  skipped: number;
  errors: number;
} {
  const srcDir = path.join(sourceRoot, "prices");
  const destDir = path.join(getVinceFdCacheRoot(projectRoot), "prices");

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const manifestFiles: Array<{
    ticker: string;
    file: string;
    rowCount: number;
  }> = [];

  for (const filePath of listJsonFiles(srcDir)) {
    const doc = tryReadJson(filePath);
    const ticker = getTickerFromDexterWrapper(doc);
    if (!ticker) {
      errors++;
      continue;
    }
    if (!isObj(doc) || !isObj(doc.params) || !isObj(doc.data)) {
      errors++;
      continue;
    }

    const params = doc.params as Record<string, unknown>;
    const data = doc.data as Record<string, unknown>;
    const startDate =
      typeof params.start_date === "string" ? params.start_date : null;
    const endDate =
      typeof params.end_date === "string" ? params.end_date : null;
    const prices = data.prices;
    if (!startDate || !endDate || !Array.isArray(prices)) {
      errors++;
      continue;
    }

    const rows: FdPriceRow[] = (prices as Record<string, unknown>[]).map(
      (p) => {
        const time = typeof p.time === "string" ? p.time : undefined;
        return {
          date: time ? time.slice(0, 10) : undefined,
          time,
          open: typeof p.open === "number" ? p.open : undefined,
          high: typeof p.high === "number" ? p.high : undefined,
          low: typeof p.low === "number" ? p.low : undefined,
          close: typeof p.close === "number" ? p.close : undefined,
          volume: typeof p.volume === "number" ? p.volume : undefined,
        };
      },
    );

    const fetchedAt =
      safeIso((doc as Record<string, unknown>).cachedAt) ??
      new Date().toISOString();
    const envelope: FdCacheEnvelope = {
      ticker,
      source: "financialdatasets",
      endpoint: "/prices/",
      interval: "day",
      startDate,
      endDate,
      fetchedAt,
      rowCount: rows.length,
      rows,
    };

    const outFile = `${ticker}_${startDate}_${endDate}_day.json`;
    const destPath = path.join(destDir, outFile);
    const didWrite = writeJsonIfNewer(filePath, destPath, envelope);
    if (didWrite) imported++;
    else skipped++;
    manifestFiles.push({ ticker, file: outFile, rowCount: rows.length });
  }

  if (manifestFiles.length) {
    writeDomainManifest("prices", projectRoot, manifestFiles);
  }
  return { imported, skipped, errors };
}

function importCompanyFacts(
  projectRoot: string,
  sourceRoot: string,
): {
  imported: number;
  skipped: number;
  errors: number;
} {
  const srcDir = path.join(sourceRoot, "company_facts");
  const destDir = path.join(getVinceFdCacheRoot(projectRoot), "company-facts");

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const manifestFiles: Array<{
    ticker: string;
    file: string;
    recordCount: number;
  }> = [];

  for (const filePath of listJsonFiles(srcDir)) {
    const doc = tryReadJson(filePath);
    const ticker = getTickerFromDexterWrapper(doc);
    if (!ticker) {
      errors++;
      continue;
    }
    if (!isObj(doc) || !isObj(doc.data)) {
      errors++;
      continue;
    }
    const data = doc.data as Record<string, unknown>;
    const facts = data.company_facts;
    if (!isObj(facts)) {
      errors++;
      continue;
    }
    const fetchedAt =
      safeIso((doc as Record<string, unknown>).cachedAt) ??
      new Date().toISOString();

    const out: FdCompanyFacts = {
      ticker,
      name: typeof facts.name === "string" ? facts.name : undefined,
      sector: typeof facts.sector === "string" ? facts.sector : undefined,
      industry: typeof facts.industry === "string" ? facts.industry : undefined,
      exchange: typeof facts.exchange === "string" ? facts.exchange : undefined,
      fetchedAt,
    };

    const outFile = `${ticker}_facts.json`;
    const destPath = path.join(destDir, outFile);
    const didWrite = writeJsonIfNewer(filePath, destPath, out);
    if (didWrite) imported++;
    else skipped++;
    manifestFiles.push({ ticker, file: outFile, recordCount: 1 });
  }

  if (manifestFiles.length) {
    // This domain is not part of FD_WAREHOUSE_DOMAINS; keep manifest next to folder for human inspection.
    // Do not write via writeDomainManifest (typed domain union) to avoid widening core types.
    const manifest: Omit<FdDomainManifest, "domain"> & { domain: string } = {
      generatedAt: new Date().toISOString(),
      source: "financialdatasets",
      domain: "company-facts",
      files: manifestFiles,
    };
    ensureDir(destDir);
    fs.writeFileSync(
      path.join(destDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf-8",
    );
  }
  return { imported, skipped, errors };
}

function importEarnings(
  projectRoot: string,
  sourceRoot: string,
): {
  imported: number;
  skipped: number;
  errors: number;
} {
  const srcDir = path.join(sourceRoot, "earnings");
  const destDir = path.join(getVinceFdCacheRoot(projectRoot), "earnings");

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const manifestFiles: Array<{
    ticker: string;
    file: string;
    recordCount: number;
  }> = [];

  for (const filePath of listJsonFiles(srcDir)) {
    const doc = tryReadJson(filePath);
    const ticker = getTickerFromDexterWrapper(doc);
    if (!ticker) {
      errors++;
      continue;
    }
    if (!isObj(doc) || !isObj(doc.data)) {
      errors++;
      continue;
    }
    const data = doc.data as Record<string, unknown>;
    const earnings = data.earnings;
    if (earnings == null) {
      errors++;
      continue;
    }
    const fetchedAt =
      safeIso((doc as Record<string, unknown>).cachedAt) ??
      new Date().toISOString();
    const envelope: FdEarningsEnvelope = {
      ticker,
      source: "financialdatasets",
      fetchedAt,
      earnings,
    };

    const outFile = `${ticker}_earnings.json`;
    const destPath = path.join(destDir, outFile);
    const didWrite = writeJsonIfNewer(filePath, destPath, envelope);
    if (didWrite) imported++;
    else skipped++;
    manifestFiles.push({ ticker, file: outFile, recordCount: 1 });
  }

  if (manifestFiles.length) {
    writeDomainManifest("earnings", projectRoot, manifestFiles);
  }
  return { imported, skipped, errors };
}

function importInsiders(
  projectRoot: string,
  sourceRoot: string,
): {
  imported: number;
  skipped: number;
  errors: number;
} {
  const srcDir = path.join(sourceRoot, "insider-trades");
  const destDir = path.join(getVinceFdCacheRoot(projectRoot), "insiders");

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const manifestFiles: Array<{
    ticker: string;
    file: string;
    recordCount: number;
  }> = [];

  for (const filePath of listJsonFiles(srcDir)) {
    const doc = tryReadJson(filePath);
    const ticker = getTickerFromDexterWrapper(doc);
    if (!ticker) {
      errors++;
      continue;
    }
    if (!isObj(doc) || !isObj(doc.data)) {
      errors++;
      continue;
    }
    const data = doc.data as Record<string, unknown>;
    const insider_trades = Array.isArray(data.insider_trades)
      ? data.insider_trades
      : [];
    const fetchedAt =
      safeIso((doc as Record<string, unknown>).cachedAt) ??
      new Date().toISOString();
    const envelope: FdInsidersEnvelope = {
      ticker,
      source: "financialdatasets",
      fetchedAt,
      insider_trades,
    };

    const outFile = `${ticker}_insiders.json`;
    const destPath = path.join(destDir, outFile);
    const didWrite = writeJsonIfNewer(filePath, destPath, envelope);
    if (didWrite) imported++;
    else skipped++;
    manifestFiles.push({ ticker, file: outFile, recordCount: 1 });
  }

  if (manifestFiles.length) {
    writeDomainManifest("insiders", projectRoot, manifestFiles);
  }
  return { imported, skipped, errors };
}

export function importDexterCacheToVinceFdWarehouse(
  projectRoot: string = process.cwd(),
  options?: {
    sourceRoot?: string;
    domains?: ImportDomain[];
  },
): DexterCacheImportResult {
  const sourceRoot = path.resolve(
    options?.sourceRoot ?? getDexterCacheRoot(resolveDexterArtifactRoot()),
  );
  const destRoot = getVinceFdCacheRoot(projectRoot);
  const domains: ImportDomain[] =
    options?.domains && options.domains.length
      ? options.domains
      : ["prices", "company-facts", "earnings", "insiders"];

  const result: DexterCacheImportResult = {
    sourceRoot,
    destRoot,
    imported: { prices: 0, "company-facts": 0, earnings: 0, insiders: 0 },
    skipped: { prices: 0, "company-facts": 0, earnings: 0, insiders: 0 },
    errors: { prices: 0, "company-facts": 0, earnings: 0, insiders: 0 },
  };

  if (!fs.existsSync(sourceRoot)) return result;

  for (const d of domains) {
    if (d === "prices") {
      const r = importPrices(projectRoot, sourceRoot);
      result.imported.prices += r.imported;
      result.skipped.prices += r.skipped;
      result.errors.prices += r.errors;
    } else if (d === "company-facts") {
      const r = importCompanyFacts(projectRoot, sourceRoot);
      result.imported["company-facts"] += r.imported;
      result.skipped["company-facts"] += r.skipped;
      result.errors["company-facts"] += r.errors;
    } else if (d === "earnings") {
      const r = importEarnings(projectRoot, sourceRoot);
      result.imported.earnings += r.imported;
      result.skipped.earnings += r.skipped;
      result.errors.earnings += r.errors;
    } else if (d === "insiders") {
      const r = importInsiders(projectRoot, sourceRoot);
      result.imported.insiders += r.imported;
      result.skipped.insiders += r.skipped;
      result.errors.insiders += r.errors;
    }
  }

  return result;
}

export function getDexterCacheDomainsPresent(
  _projectRoot: string = process.cwd(),
  sourceRoot?: string,
): Array<{ domain: ImportDomain; path: string; fileCount: number }> {
  const root = path.resolve(
    sourceRoot ?? getDexterCacheRoot(resolveDexterArtifactRoot()),
  );
  const out: Array<{ domain: ImportDomain; path: string; fileCount: number }> =
    [];
  const checks: Array<{ domain: ImportDomain; sub: string }> = [
    { domain: "prices", sub: "prices" },
    { domain: "company-facts", sub: "company_facts" },
    { domain: "earnings", sub: "earnings" },
    { domain: "insiders", sub: "insider-trades" },
  ];
  for (const c of checks) {
    const p = path.join(root, c.sub);
    const files = listJsonFiles(p);
    if (files.length)
      out.push({ domain: c.domain, path: p, fileCount: files.length });
  }
  return out;
}
