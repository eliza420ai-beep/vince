/**
 * Load .env once from project root (walk up from cwd or from this file's dir).
 * Call from services that need X_BEARER_TOKEN so it works regardless of startup (elizaos dev, bun run dev, etc.).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let _done = false;

function findProjectRoot(): string | null {
  const fromCwd = walkUpForEnv(process.cwd());
  if (fromCwd) return fromCwd;
  try {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    return walkUpForEnv(thisDir);
  } catch {
    return null;
  }
}

function walkUpForEnv(startDir: string): string | null {
  let dir = resolve(startDir);
  for (let i = 0; i < 8; i++) {
    const envPath = resolve(dir, ".env");
    if (existsSync(envPath)) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

export function loadEnvOnce(): void {
  if (_done) return;
  _done = true;
  const root = findProjectRoot();
  if (!root) return;
  const envPath = resolve(root, ".env");
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eq = trimmed.indexOf("=");
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          let val = trimmed.slice(eq + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
            val = val.slice(1, -1);
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  } catch {
    // ignore
  }
}
