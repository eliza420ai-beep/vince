/**
 * Verifier for standup action items: check deliverable exists (build/north-star) or accept remind.
 */

import * as fs from "node:fs/promises";
import type { IAgentRuntime } from "@elizaos/core";
import type { ActionItem } from "./actionItemTracker";
import type { BuildActionResult } from "./standup.build";

export interface VerifyResult {
  ok: boolean;
  message?: string;
}

/**
 * Verify an action item result before marking done.
 * Build/north-star: require deliverable path to exist and be non-empty (or message-only result accepted).
 * Remind: no deliverable; pass result like { message: "remind sent" } for ok.
 */
export async function verifyActionItem(
  _runtime: IAgentRuntime,
  _item: ActionItem,
  result: BuildActionResult | { message?: string } | null,
): Promise<VerifyResult> {
  if (result == null) {
    return { ok: false, message: "No result from execution" };
  }

  const pathToCheck = (result as BuildActionResult).path;
  if (pathToCheck) {
    try {
      const stat = await fs.stat(pathToCheck);
      if (!stat.isFile()) {
        return { ok: false, message: "Deliverable path is not a file" };
      }
      const content = await fs.readFile(pathToCheck, "utf-8");
      if (!content || content.trim().length === 0) {
        return { ok: false, message: "Deliverable file is empty" };
      }
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `Deliverable check failed: ${msg}` };
    }
  }

  if ((result as { message?: string }).message) {
    return { ok: true };
  }

  return { ok: false, message: "No path or message in result" };
}
