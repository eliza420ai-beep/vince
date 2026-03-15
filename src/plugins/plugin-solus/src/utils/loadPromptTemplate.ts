/**
 * Load a prompt template from repo root and interpolate {{variable}} placeholders.
 * Used so runtime reads the same file Forge mutates (solus-strike-ritual.md).
 */

import fs from "node:fs";
import path from "node:path";
import { logger } from "@elizaos/core";

/**
 * Load a template file and replace {{key}} with vars[key].
 * @param relativePath - Path relative to process.cwd() (e.g. "prompts/solus-strike-ritual.md")
 * @param vars - Map of variable names to values
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
