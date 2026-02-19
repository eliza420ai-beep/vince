#!/usr/bin/env bun
/**
 * VinceBench CLI: run decision-quality benchmark on feature store data.
 *
 * Usage (from repo root):
 *   bun run src/plugins/plugin-vince/scripts/run-bench.ts
 *   bun run src/plugins/plugin-vince/scripts/run-bench.ts --output docs/standup/bench-reports
 *   bun run src/plugins/plugin-vince/scripts/run-bench.ts --complete-only --limit 200
 *
 * From plugin-vince:
 *   bun run scripts/run-bench.ts
 */
import * as path from "path";
import { runReplay } from "../src/bench/runner";
import { toMarkdown, writeReports } from "../src/bench/reporter";

function parseArgs(): {
  output?: string;
  completeOnly: boolean;
  avoidedOnly: boolean;
  limit?: number;
  dataDir?: string;
  configPath?: string;
  includeSynthetic: boolean;
} {
  const args = process.argv.slice(2);
  let output: string | undefined;
  let completeOnly = false;
  let avoidedOnly = false;
  let limit: number | undefined;
  let dataDir: string | undefined;
  let configPath: string | undefined;
  let includeSynthetic = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" && args[i + 1]) {
      output = args[++i];
    } else if (args[i] === "--complete-only") {
      completeOnly = true;
    } else if (args[i] === "--avoided-only") {
      avoidedOnly = true;
    } else if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[++i], 10);
    } else if (args[i] === "--data-dir" && args[i + 1]) {
      dataDir = args[++i];
    } else if (args[i] === "--config" && args[i + 1]) {
      configPath = args[++i];
    } else if (args[i] === "--include-synthetic") {
      includeSynthetic = true;
    }
  }

  return {
    output,
    completeOnly,
    avoidedOnly,
    limit,
    dataDir,
    configPath,
    includeSynthetic,
  };
}

async function main(): Promise<void> {
  const opts = parseArgs();

  const dataDir =
    opts.dataDir ??
    path.join(process.cwd(), ".elizadb", "vince-paper-bot", "features");
  const pluginRoot = path.join(import.meta.dir, "..");
  const defaultConfig = path.join(
    pluginRoot,
    "bench-dataset",
    "domains-vince.yaml",
  );
  const configPath = opts.configPath ?? defaultConfig;

  const report = runReplay({
    dataDir,
    configPath,
    completeOnly: opts.completeOnly,
    avoidedOnly: opts.avoidedOnly,
    limit: opts.limit,
    includeSynthetic: opts.includeSynthetic,
  });

  console.log(toMarkdown(report));

  if (opts.output) {
    const { jsonPath, mdPath } = writeReports(report, opts.output);
    console.log(`\nWrote ${jsonPath}`);
    console.log(`Wrote ${mdPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
