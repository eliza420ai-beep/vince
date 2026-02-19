#!/usr/bin/env bun
/**
 * One-time backfill: add labels.benchScore to existing feature-store JSONL records
 * that have outcome and execution but no benchScore. New closed trades get benchScore
 * automatically from the feature store (deriveLabels); use this script only for
 * historical files.
 *
 * Usage (from repo root):
 *   bun run src/plugins/plugin-vince/scripts/backfill-bench-scores.ts --input .elizadb/vince-paper-bot/features
 *   bun run src/plugins/plugin-vince/scripts/backfill-bench-scores.ts --input ./features_2025-01-01.jsonl --output ./features_2025-01-01_backfilled.jsonl
 *
 * From plugin-vince:
 *   bun run scripts/backfill-bench-scores.ts --input /path/to/features
 *
 * Options:
 *   --input   Path to a .jsonl file or directory of features_*.jsonl (default: .elizadb/vince-paper-bot/features)
 *   --output  If input is a single file, write here; else ignored. If omitted and input is a file, overwrites with .bak backup.
 *   --config  Optional path to domains-vince.yaml (default: resolve from cwd or plugin)
 */
import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "../src/bench/configLoader";
import { scoreSingleDecision } from "../src/bench/evaluator";
import { normalize } from "../src/bench/normalizer";
import type { FeatureRecord } from "../src/services/vinceFeatureStore.service";

function parseArgs(): { input: string; output?: string; configPath?: string } {
  const args = process.argv.slice(2);
  let input = ".elizadb/vince-paper-bot/features";
  let output: string | undefined;
  let configPath: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) {
      input = args[++i];
    } else if (args[i] === "--output" && args[i + 1]) {
      output = args[++i];
    } else if (args[i] === "--config" && args[i + 1]) {
      configPath = args[++i];
    }
  }
  return { input, output, configPath };
}

function getJsonlFiles(inputPath: string): string[] {
  const stat = fs.statSync(inputPath);
  if (stat.isFile()) {
    return inputPath.endsWith(".jsonl") ? [inputPath] : [];
  }
  return fs
    .readdirSync(inputPath)
    .filter(
      (f) =>
        f.endsWith(".jsonl") &&
        (f.startsWith("features_") || f === "combined.jsonl"),
    )
    .map((f) => path.join(inputPath, f));
}

function backfillFile(
  filePath: string,
  outputPath: string,
  configPath: string | undefined,
): { updated: number; skipped: number; errors: number } {
  const config = loadConfig(configPath);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const outLines: string[] = [];

  for (const line of lines) {
    try {
      const record = JSON.parse(line) as FeatureRecord;
      const hasOutcome = record.outcome != null;
      const hasExecution = record.execution != null;
      const hasBenchScore = record.labels?.benchScore != null;

      if (!hasOutcome || !hasExecution) {
        outLines.push(line);
        skipped++;
        continue;
      }
      if (hasBenchScore) {
        outLines.push(line);
        skipped++;
        continue;
      }

      const signatures = normalize(record);
      const score = scoreSingleDecision(signatures, config);
      if (!record.labels) record.labels = {} as FeatureRecord["labels"];
      (record.labels as { benchScore?: number }).benchScore =
        Math.round(score * 100) / 100;
      outLines.push(JSON.stringify(record));
      updated++;
    } catch (e) {
      errors++;
      outLines.push(line);
    }
  }

  fs.writeFileSync(
    outputPath,
    outLines.join("\n") + (outLines.length ? "\n" : ""),
    "utf-8",
  );
  return { updated, skipped, errors };
}

function main(): void {
  const { input, output, configPath } = parseArgs();
  const resolvedInput = path.isAbsolute(input)
    ? input
    : path.join(process.cwd(), input);

  const files = getJsonlFiles(resolvedInput);
  if (files.length === 0) {
    console.error("No .jsonl files found at", resolvedInput);
    process.exit(1);
  }

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const filePath of files) {
    const isSingleFile =
      files.length === 1 && fs.statSync(resolvedInput).isFile();
    let outPath: string;
    if (isSingleFile && output) {
      outPath = path.isAbsolute(output)
        ? output
        : path.join(process.cwd(), output);
    } else {
      fs.copyFileSync(filePath, filePath + ".bak");
      outPath = filePath;
    }

    const { updated, skipped, errors } = backfillFile(
      filePath,
      outPath,
      configPath,
    );
    totalUpdated += updated;
    totalSkipped += skipped;
    totalErrors += errors;
    if (updated > 0 || errors > 0) {
      console.log(
        path.basename(filePath),
        "updated:",
        updated,
        "skipped:",
        skipped,
        "errors:",
        errors,
      );
    }
  }

  console.log(
    "Done. Total updated:",
    totalUpdated,
    "skipped:",
    totalSkipped,
    "errors:",
    totalErrors,
  );
}

main();
