#!/usr/bin/env bun
/**
 * VinceBench improvement loop: run bench, feed report to LLM, append suggestion to journal.
 *
 * Usage (from repo root):
 *   bun run src/plugins/plugin-vince/scripts/bench-improve.ts
 *   bun run src/plugins/plugin-vince/scripts/bench-improve.ts --iterations 5
 *   bun run src/plugins/plugin-vince/scripts/bench-improve.ts --budget 10
 *
 * Requires OPENAI_API_KEY. Writes to .elizadb/vince-paper-bot/bench-improvements.md
 */
import * as path from "path";
import * as fs from "fs";
import { runReplay } from "../src/bench/runner";
import { generateImprovementSuggestions } from "../src/bench/improvementLoop";

const PERSISTENCE_DIR = "vince-paper-bot";
const BENCH_IMPROVEMENTS_FILE = "bench-improvements.md";

function parseArgs(): { iterations: number; budget: number } {
  const args = process.argv.slice(2);
  let iterations = 1;
  let budget = 5;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--iterations" && args[i + 1])
      iterations = parseInt(args[++i], 10);
    if (args[i] === "--budget" && args[i + 1]) budget = parseInt(args[++i], 10);
  }
  return { iterations, budget };
}

function getJournalPath(): string {
  const base =
    process.env.ELIZA_DATA_DIR ?? path.join(process.cwd(), ".elizadb");
  return path.join(base, PERSISTENCE_DIR, BENCH_IMPROVEMENTS_FILE);
}

function appendImprovement(
  journalPath: string,
  reportId: string,
  finalScore: number,
  suggestion: {
    reasoning: string;
    parameterChanges: Record<string, unknown>;
    missingSignaturesToTarget?: string[];
  },
): void {
  const dir = path.dirname(journalPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const date = new Date().toISOString();
  const block = [
    "---",
    `## VinceBench improvement — ${date}`,
    `Run: ${reportId} | FINAL_SCORE: ${finalScore.toFixed(2)}`,
    "",
    "**Reasoning:** " + suggestion.reasoning,
    "",
    "**Parameter changes:**",
    "```json",
    JSON.stringify(suggestion.parameterChanges, null, 2),
    "```",
    ...(suggestion.missingSignaturesToTarget?.length
      ? [
          "",
          "**Signatures to target:** " +
            suggestion.missingSignaturesToTarget.join(", "),
        ]
      : []),
    "",
  ].join("\n");
  fs.appendFileSync(journalPath, block, "utf-8");
  console.log(`Appended to ${journalPath}`);
}

async function main(): Promise<void> {
  const { iterations } = parseArgs();

  const dataDir = path.join(
    process.cwd(),
    ".elizadb",
    PERSISTENCE_DIR,
    "features",
  );
  const pluginRoot = path.join(import.meta.dir, "..");
  const configPath = path.join(
    pluginRoot,
    "bench-dataset",
    "domains-vince.yaml",
  );

  const journalPath = getJournalPath();

  for (let i = 0; i < iterations; i++) {
    console.log(`\n--- Iteration ${i + 1}/${iterations} ---`);
    const report = runReplay({
      dataDir,
      configPath,
      completeOnly: false,
      limit: 500,
    });
    console.log(
      `FINAL_SCORE: ${report.scoring.finalScore.toFixed(2)} (scenarios: ${report.scenarioCount})`,
    );

    const currentParams = {};
    const suggestion = await generateImprovementSuggestions(
      report,
      currentParams,
    );
    if (suggestion) {
      appendImprovement(journalPath, report.runId, report.scoring.finalScore, {
        reasoning: suggestion.reasoning,
        parameterChanges: suggestion.parameterChanges,
        missingSignaturesToTarget: suggestion.missingSignaturesToTarget,
      });
    } else {
      console.log("No suggestion (LLM call skipped or failed).");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
