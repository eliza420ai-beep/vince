/**
 * Append a composite-metric snapshot to a JSONL file under data/ for time-series tracking.
 * Used by Forge nightly, genome evolution, and ML training to chart improvement over time.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");

/**
 * Append one JSON line to data/{filename}.jsonl. Creates data/ if needed.
 */
export function appendCompositeSnapshot(
  filename: string,
  record: Record<string, unknown>,
): void {
  const safeName = filename.replace(/[^a-z0-9-_]/gi, "");
  const filePath = path.join(DATA_DIR, `${safeName}.jsonl`);
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.appendFileSync(filePath, JSON.stringify(record) + "\n", "utf-8");
}
