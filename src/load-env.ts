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

// @elizaos/plugin-anthropic <=1.5.12 hardcodes "claude-3-5-haiku-20241022" as the
// TEXT_SMALL default. That model is deprecated and 404s on the Anthropic API.
// Force ANTHROPIC_SMALL_MODEL so the plugin never falls back to it.
if (!process.env.ANTHROPIC_SMALL_MODEL?.trim()) {
  process.env.ANTHROPIC_SMALL_MODEL = "claude-haiku-4-20250414";
}

// Also normalize ANTHROPIC_LARGE_MODEL if set to a deprecated value.
const DEPRECATED_MODELS = new Set(["claude-3-5-haiku-20241022"]);
for (const key of ["ANTHROPIC_LARGE_MODEL", "ANTHROPIC_SMALL_MODEL"]) {
  const val = process.env[key]?.trim();
  if (val && DEPRECATED_MODELS.has(val)) {
    process.env[key] =
      key === "ANTHROPIC_SMALL_MODEL"
        ? "claude-haiku-4-20250414"
        : "claude-sonnet-4-20250514";
  }
}
