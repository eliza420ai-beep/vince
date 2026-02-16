/**
 * "What we learned" log for standup action items.
 * Append-only file: docs/standup/standup-learnings.md (or STANDUP_DELIVERABLES_DIR)
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { logger } from "@elizaos/core";
import type { ActionItem } from "./actionItemTracker";

function getLearningsPath(): string {
  const envDir = process.env.STANDUP_DELIVERABLES_DIR?.trim();
  const dir = envDir ? (path.isAbsolute(envDir) ? envDir : path.join(process.cwd(), envDir)) : path.join(process.cwd(), "docs/standup");
  return path.join(dir, "standup-learnings.md");
}

/**
 * Append one learning entry for a completed (or failed) action item.
 */
export async function appendLearning(
  item: ActionItem,
  outcome: string,
  learning?: string,
): Promise<void> {
  const filepath = getLearningsPath();
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toISOString();
  const what = item.what.slice(0, 80).replace(/\n/g, " ");
  const owner = item.owner;
  const status = item.status;
  const line1 = `- **${date}** [${status}] @${owner}: ${what}`;
  const line2 = `  - Outcome: ${outcome.slice(0, 200).replace(/\n/g, " ")}`;
  const line3 = learning ? `  - Learning: ${learning.slice(0, 300).replace(/\n/g, " ")}` : "";
  const block = [line1, line2, line3].filter(Boolean).join("\n") + "\n";

  try {
    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.access(filepath);
    } catch {
      await fs.writeFile(filepath, `# Standup learnings\n\n*Append-only log of action item outcomes and learnings.*\n\n`, "utf-8");
    }
    await fs.appendFile(filepath, block, "utf-8");
    logger.debug(`[Standup] Appended learning for ${item.id}`);
  } catch (err) {
    logger.warn({ err, filepath }, "[Standup] Failed to append learning");
  }
}
