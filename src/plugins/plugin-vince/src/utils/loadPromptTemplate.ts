/**
 * Load a prompt template from disk and interpolate {{variable}} placeholders.
 * Used so runtime reads the same files Forge mutates (vince-entry-gate, solus-strike-ritual).
 */

import fs from "node:fs";
import path from "node:path";
import { logger } from "@elizaos/core";

export const DEFAULT_PROMPTS_DIR = "prompts";

/**
 * Load a template file and replace {{key}} with vars[key].
 * @param relativePath - Path relative to process.cwd() (e.g. "prompts/vince-entry-gate.md")
 * @param vars - Map of variable names to values (e.g. { asset: "BTC", direction: "long" })
 * @returns Interpolated string, or null if file missing
 */
export function loadPromptTemplate(
  relativePath: string,
  vars: Record<string, string | number>,
): string | null {
  const fullPath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(process.cwd(), relativePath);
  try {
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    const raw = fs.readFileSync(fullPath, "utf-8");
    let out = raw;
    for (const [key, value] of Object.entries(vars)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      out = out.replace(placeholder, String(value ?? ""));
    }
    return out;
  } catch (e) {
    logger.debug(
      `[loadPromptTemplate] ${(e as Error).message} path=${relativePath}`,
    );
    return null;
  }
}
