/**
 * Research Autopilot — artifact paths and run ledger persistence.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  ResearchAutopilotArtifactPaths,
  ResearchAutopilotRunLedgerEntry,
} from "./types";

const STANDUP_ROOT = "docs/standup";
const AUTOPILOT_DIR = "research-autopilot";
const LEDGER_FILENAME = "runs.jsonl";
const ELIZA_DB_AUTOPILOT = ".elizadb/research-autopilot";

/**
 * Resolve artifact paths for a run (date-based folder).
 */
export function getArtifactPaths(
  projectRoot: string,
  runDate: string,
): ResearchAutopilotArtifactPaths {
  const base = path.join(projectRoot, STANDUP_ROOT, AUTOPILOT_DIR, runDate);
  return {
    runDate,
    selectionPath: path.join(base, "selection.json"),
    dossiersDir: path.join(base, "dossiers"),
    xEnrichmentPath: path.join(base, "x-enrichment.json"),
    synthesisPath: path.join(base, "synthesis.md"),
    essayDraftPath: path.join(base, "essay-draft.md"),
  };
}

/**
 * Ensure directory exists; return false if creation failed.
 */
export function ensureDir(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Append a run ledger entry to .elizadb/research-autopilot/runs.jsonl.
 */
export function appendRunLedger(
  projectRoot: string,
  entry: ResearchAutopilotRunLedgerEntry,
): void {
  const dir = path.join(projectRoot, ELIZA_DB_AUTOPILOT);
  ensureDir(dir);
  const filePath = path.join(dir, LEDGER_FILENAME);
  fs.appendFileSync(filePath, JSON.stringify(entry) + "\n", "utf-8");
}

/**
 * Read the last run ledger entry (for "last run status" API). Returns null if no runs.
 */
export function readLastRunLedgerEntry(
  projectRoot: string,
): ResearchAutopilotRunLedgerEntry | null {
  const filePath = path.join(projectRoot, ELIZA_DB_AUTOPILOT, LEDGER_FILENAME);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8").trim();
  const lines = content ? content.split("\n").filter(Boolean) : [];
  if (lines.length === 0) return null;
  try {
    return JSON.parse(
      lines[lines.length - 1],
    ) as ResearchAutopilotRunLedgerEntry;
  } catch {
    return null;
  }
}
