/**
 * Load .env once from project root (walk up from cwd or from this file's dir).
 * Call from services that need X_BEARER_TOKEN so it works regardless of startup (elizaos dev, bun run dev, etc.).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let _done = false;

// #region agent log
const _dbg = (msg: string, data: Record<string, unknown>) => { fetch('http://127.0.0.1:7243/ingest/ba1458fc-b64e-474b-974f-75567a9e0b02',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'loadEnvOnce.ts',message:msg,data,timestamp:Date.now()})}).catch(()=>{}); };
// #endregion

function findProjectRoot(): string | null {
  const cwd = process.cwd();
  const fromCwd = walkUpForEnv(cwd);
  if (fromCwd) return fromCwd;
  try {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const fromThis = walkUpForEnv(thisDir);
    _dbg("findProjectRoot: cwd failed, tried thisDir", { hypothesisId: "H1", cwd, thisDir, fromCwd: !!fromCwd, fromThis: !!fromThis });
    return fromThis;
  } catch (e) {
    _dbg("findProjectRoot: exception", { hypothesisId: "H1", err: String(e) });
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
  _dbg("loadEnvOnce entry", { hypothesisId: "H4", _done });
  if (_done) return;
  _done = true;
  const root = findProjectRoot();
  _dbg("loadEnvOnce after findProjectRoot", { hypothesisId: "H1", root: root ?? null, cwd: process.cwd() });
  if (!root) return;
  const envPath = resolve(root, ".env");
  try {
    const content = readFileSync(envPath, "utf8");
    let keyCount = 0;
    let hadXBearer = false;
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
          keyCount++;
          if (key === "X_BEARER_TOKEN") hadXBearer = true;
        }
      }
    }
    const tokenSet = !!process.env.X_BEARER_TOKEN?.trim();
    _dbg("loadEnvOnce after parse", { hypothesisId: "H2", keyCount, hadXBearer, tokenSet });
  } catch (e) {
    _dbg("loadEnvOnce read error", { hypothesisId: "H2", err: String(e) });
  }
}
