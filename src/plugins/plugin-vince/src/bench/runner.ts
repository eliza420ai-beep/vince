/**
 * VinceBench runner: replay mode — load scenarios, normalize, evaluate, produce report.
 */
import { loadConfig } from "./configLoader";
import { evaluate } from "./evaluator";
import { loadScenarios, recordsToEvaluations } from "./scenarioLoader";
import type { LoadScenariosOptions } from "./scenarioLoader";
import type { VinceBenchConfig, VinceBenchReport } from "./types";

export interface RunBenchOptions {
  /** Feature store directory (default: .elizadb/vince-paper-bot/features) */
  dataDir?: string;
  /** Path to domains-vince.yaml */
  configPath?: string;
  /** Only records with outcome (closed trades) */
  completeOnly?: boolean;
  /** Only avoided decisions */
  avoidedOnly?: boolean;
  /** Max records to load */
  limit?: number;
  /** Include synthetic JSONL files */
  includeSynthetic?: boolean;
  /** Custom run ID */
  runId?: string;
}

/**
 * Run VinceBench in replay mode: load feature store records, normalize to signatures, score.
 */
export function runReplay(options: RunBenchOptions = {}): VinceBenchReport {
  const config = loadConfig(options.configPath);
  const loadOpts: LoadScenariosOptions = {
    dataDir: options.dataDir,
    completeOnly: options.completeOnly,
    avoidedOnly: options.avoidedOnly,
    limit: options.limit,
    includeSynthetic: options.includeSynthetic,
  };
  const records = loadScenarios(loadOpts);
  const perDecision = recordsToEvaluations(records);
  return evaluate(perDecision, config, options.runId);
}
