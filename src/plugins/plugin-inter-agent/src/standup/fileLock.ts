/**
 * Simple file-based lock for standup deliverables (manifest, action-items.json).
 * Uses a .lock sentinel file; stale locks (> LOCK_STALE_MS) are removed and retried.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const LOCK_STALE_MS = 10_000;
const MAX_RETRIES = 50;
const BASE_DELAY_MS = 50;
const MAX_DELAY_MS = 2_000;

function retryDelay(attempt: number): number {
  const exponential = Math.min(
    BASE_DELAY_MS * Math.pow(2, attempt),
    MAX_DELAY_MS,
  );
  const jitter = Math.random() * BASE_DELAY_MS;
  return exponential + jitter;
}

/**
 * Run fn with an exclusive lock on filepath. Lock file is filepath + ".lock".
 * Creates lock file with 'wx'; if EEXIST, checks staleness and retries
 * with exponential backoff + jitter.
 */
export async function withLock<T>(
  filepath: string,
  fn: () => Promise<T>,
): Promise<T> {
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
          // lock disappeared between check and unlink — next attempt will succeed
        }
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, retryDelay(attempt)));
          continue;
        }
        // All retries exhausted — force-remove in case of orphaned lock
        await fs.unlink(lockPath).catch(() => {});
        throw new Error(
          `[Standup] Could not acquire lock for ${path.basename(filepath)} after ${MAX_RETRIES} attempts — removed stale lock`,
        );
      }
      throw err;
    }

    try {
      return await fn();
    } finally {
      await fs.unlink(lockPath).catch(() => {});
    }
  }

  throw new Error(
    `[Standup] Could not acquire lock for ${path.basename(filepath)} after ${MAX_RETRIES} attempts`,
  );
}
