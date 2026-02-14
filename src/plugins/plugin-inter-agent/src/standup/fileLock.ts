/**
 * Simple file-based lock for standup deliverables (manifest, action-items.json).
 * Uses a .lock sentinel file; stale locks (> LOCK_STALE_MS) are removed and retried.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const LOCK_STALE_MS = 30_000;
const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 100;

/**
 * Run fn with an exclusive lock on filepath. Lock file is filepath + ".lock".
 * Creates lock file with 'wx'; if EEXIST, checks staleness and retries.
 */
export async function withLock<T>(filepath: string, fn: () => Promise<T>): Promise<T> {
  const lockPath = filepath + ".lock";
  const dir = path.dirname(filepath);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await fs.mkdir(dir, { recursive: true });
      const fd = await fs.open(lockPath, "wx");
      await fd.write(`${process.pid}\n${Date.now()}\n`, 0, "utf-8");
      await fd.close();
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "EEXIST") {
        try {
          const stat = await fs.stat(lockPath);
          if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
            await fs.unlink(lockPath);
          }
        } catch {
          // ignore stat/unlink errors
        }
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
      }
      throw err;
    }

    try {
      return await fn();
    } finally {
      await fs.unlink(lockPath).catch(() => {});
    }
  }

  throw new Error(`[Standup] Could not acquire lock for ${filepath} after ${MAX_RETRIES} attempts`);
}
