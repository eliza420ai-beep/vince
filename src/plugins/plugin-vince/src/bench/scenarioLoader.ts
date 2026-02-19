/**
 * Load feature store records (scenarios) from JSONL for VinceBench replay.
 */
import * as fs from "fs";
import * as path from "path";
import type { FeatureRecord } from "../services/vinceFeatureStore.service";
import type { DecisionEvaluation } from "./types";
import { normalize } from "./normalizer";

const DEFAULT_FEATURES_DIR = ".elizadb/vince-paper-bot/features";
const GLOB_PATTERNS = ["features_*.jsonl", "combined.jsonl"];

export interface LoadScenariosOptions {
  /** Directory containing feature JSONL files. Default: .elizadb/vince-paper-bot/features */
  dataDir?: string;
  /** If set, only include records with outcome (closed trades). */
  completeOnly?: boolean;
  /** If set, only include avoided decisions (no execution). */
  avoidedOnly?: boolean;
  /** Max number of records to load (newest first by timestamp). */
  limit?: number;
  /** Include synthetic_*.jsonl files. */
  includeSynthetic?: boolean;
}

/**
 * Resolve features directory: optional custom path, else cwd + DEFAULT_FEATURES_DIR.
 */
function resolveDataDir(customDir?: string): string {
  if (customDir && fs.existsSync(customDir)) return path.resolve(customDir);
  const fromCwd = path.join(process.cwd(), DEFAULT_FEATURES_DIR);
  if (fs.existsSync(fromCwd)) return fromCwd;
  return path.resolve(customDir || fromCwd);
}

/**
 * Check if a parsed object looks like a minimal FeatureRecord (id, timestamp, asset, market, session, signal, regime, news).
 */
function isRecordLike(obj: unknown): obj is FeatureRecord {
  if (obj == null || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.timestamp === "number" &&
    typeof o.asset === "string" &&
    o.market != null &&
    typeof o.market === "object" &&
    o.session != null &&
    typeof o.session === "object" &&
    o.signal != null &&
    typeof o.signal === "object" &&
    o.regime != null &&
    typeof o.regime === "object" &&
    o.news != null &&
    typeof o.news === "object"
  );
}

/**
 * Load all feature records from the data directory matching patterns.
 */
export function loadScenarios(
  options: LoadScenariosOptions = {},
): FeatureRecord[] {
  const dataDir = resolveDataDir(options.dataDir);
  if (!fs.existsSync(dataDir)) return [];

  const patterns = [...GLOB_PATTERNS];
  if (options.includeSynthetic) patterns.push("synthetic_*.jsonl");

  const records: FeatureRecord[] = [];
  const files = fs.readdirSync(dataDir);

  for (const file of files) {
    const match = patterns.some((p) => {
      const re = new RegExp("^" + p.replace(/\*/g, ".*") + "$");
      return re.test(file);
    });
    if (!match) continue;
    const filepath = path.join(dataDir, file);
    if (!fs.statSync(filepath).isFile()) continue;
    const content = fs.readFileSync(filepath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as unknown;
        if (!isRecordLike(obj)) continue;
        if (options.completeOnly && (!obj.execution?.executed || !obj.outcome))
          continue;
        if (options.avoidedOnly && !obj.avoided) continue;
        records.push(obj as FeatureRecord);
      } catch {
        // skip malformed lines
      }
    }
  }

  records.sort((a, b) => b.timestamp - a.timestamp);
  if (options.limit != null && options.limit > 0) {
    return records.slice(0, options.limit);
  }
  return records;
}

/**
 * Convert loaded FeatureRecords into DecisionEvaluation[] (with signatures and optional outcome).
 */
export function recordsToEvaluations(
  records: FeatureRecord[],
): DecisionEvaluation[] {
  return records.map((rec) => {
    const signatures = normalize(rec);
    const ev: DecisionEvaluation = {
      recordId: rec.id,
      timestamp: rec.timestamp,
      asset: rec.asset,
      signatures,
    };
    if (rec.outcome != null && rec.labels != null) {
      ev.outcome = {
        realizedPnl: rec.outcome.realizedPnl,
        realizedPnlPct: rec.outcome.realizedPnlPct,
        profitable: rec.labels.profitable,
        exitReason: rec.outcome.exitReason,
      };
    }
    return ev;
  });
}
