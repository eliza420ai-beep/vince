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
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
            val = val.slice(1, -1);
          process.env[key] = val;
        }
      }
    }
    break;
  }
}
