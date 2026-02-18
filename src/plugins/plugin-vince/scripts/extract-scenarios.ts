#!/usr/bin/env bun
/**
 * Extract curated scenario sets from feature store for VinceBench.
 *
 * Usage (from repo root):
 *   bun run src/plugins/plugin-vince/scripts/extract-scenarios.ts
 *   bun run src/plugins/plugin-vince/scripts/extract-scenarios.ts --min-trades 50
 *   bun run src/plugins/plugin-vince/scripts/extract-scenarios.ts --regime bear --out bench-dataset/scenarios
 *
 * From plugin-vince:
 *   bun run scripts/extract-scenarios.ts
 */
import * as fs from "fs";
import * as path from "path";
import { loadScenarios } from "../src/bench/scenarioLoader";
import type { FeatureRecord } from "../src/services/vinceFeatureStore.service";

function parseArgs(): {
  dataDir?: string;
  outDir: string;
  minTrades: number;
  regime?: string;
  limit?: number;
} {
  const args = process.argv.slice(2);
  let dataDir: string | undefined;
  let outDir = path.join(import.meta.dir, "..", "bench-dataset", "scenarios");
  let minTrades = 0;
  let regime: string | undefined;
  let limit: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--data-dir" && args[i + 1]) dataDir = args[++i];
    else if (args[i] === "--out" && args[i + 1]) outDir = args[++i];
    else if (args[i] === "--min-trades" && args[i + 1]) minTrades = parseInt(args[++i], 10);
    else if (args[i] === "--regime" && args[i + 1]) regime = args[++i];
    else if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[++i], 10);
  }
  return { dataDir, outDir, minTrades, regime, limit };
}

function filterByRegime(records: FeatureRecord[], regime: string): FeatureRecord[] {
  const r = regime.toLowerCase();
  return records.filter((rec) => {
    const mr = (rec.regime?.marketRegime ?? "").toLowerCase();
    const vr = (rec.regime?.volatilityRegime ?? "").toLowerCase();
    return mr.includes(r) || vr.includes(r);
  });
}

function main(): void {
  const { dataDir, outDir, minTrades, regime, limit } = parseArgs();

  const dataPath = dataDir ?? path.join(process.cwd(), ".elizadb", "vince-paper-bot", "features");
  let records = loadScenarios({
    dataDir: dataPath,
    completeOnly: true,
    limit: limit ?? 10_000,
    includeSynthetic: false,
  });

  if (minTrades > 0 && records.length < minTrades) {
    console.warn(`Only ${records.length} complete records (min-trades ${minTrades}). Proceeding anyway.`);
  }

  if (regime) {
    records = filterByRegime(records, regime);
    console.log(`Filtered to ${records.length} records for regime "${regime}".`);
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const allPath = path.join(outDir, "all_complete.jsonl");
  const lines = records.map((r) => JSON.stringify(r)).join("\n");
  fs.writeFileSync(allPath, lines + (lines ? "\n" : ""), "utf-8");
  console.log(`Wrote ${records.length} scenarios to ${allPath}`);

  const byRegime = new Map<string, FeatureRecord[]>();
  for (const rec of records) {
    const mr = rec.regime?.marketRegime ?? "unknown";
    if (!byRegime.has(mr)) byRegime.set(mr, []);
    byRegime.get(mr)!.push(rec);
  }
  for (const [name, arr] of byRegime) {
    const safe = name.replace(/[^a-z0-9_-]/gi, "_");
    const p = path.join(outDir, `regime_${safe}.jsonl`);
    fs.writeFileSync(
      p,
      arr.map((r) => JSON.stringify(r)).join("\n") + (arr.length ? "\n" : ""),
      "utf-8",
    );
    console.log(`Wrote ${arr.length} scenarios to ${p}`);
  }
}

main();
