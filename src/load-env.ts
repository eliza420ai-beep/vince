/**
 * Load .env from project root as early as possible.
 * Import this first in src/index.ts so X_BEARER_TOKEN and other vars are set
 * before any plugin or service code runs (regardless of how the process was started).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const candidates = [
  resolve(process.cwd(), ".env"),
  resolve(__dirname, "..", ".env"),
  resolve(__dirname, "..", "..", ".env"),
];

let loaded = false;
for (const envPath of candidates) {
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eq = trimmed.indexOf("=");
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          let val = trimmed.slice(eq + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          )
            val = val.slice(1, -1);
          process.env[key] = val;
        }
      }
    }
    loaded = true;
    const hasX = !!process.env.X_BEARER_TOKEN?.trim();
    if (typeof process.stdout?.write === "function") {
      process.stdout.write(
        `[load-env] Loaded .env from ${envPath} | X_BEARER_TOKEN: ${hasX ? "set" : "NOT SET"}\n`,
      );
    }
    break;
  }
}
if (!loaded && typeof process.stdout?.write === "function") {
  process.stdout.write(
    `[load-env] No .env found (tried: ${candidates.join(", ")}) | cwd=${process.cwd()}\n`,
  );
}

// Normalize deprecated Anthropic model IDs so plugins that read ANTHROPIC_LARGE_MODEL
// directly (e.g. @elizaos/plugin-anthropic) never send invalid model names to the API.
const DEPRECATED_ANTHROPIC_MODELS = new Set(["claude-3-5-haiku-20241022"]);
const DEFAULT_ANTHROPIC_LARGE = "claude-sonnet-4-20250514";
const anthropicModel = process.env.ANTHROPIC_LARGE_MODEL?.trim();
if (anthropicModel && DEPRECATED_ANTHROPIC_MODELS.has(anthropicModel)) {
  process.env.ANTHROPIC_LARGE_MODEL = DEFAULT_ANTHROPIC_LARGE;
}
