/**
 * OpenClaw Task Brief Service
 *
 * Builds structured task briefs (OpenClawTask) from Sentinel's "Top pick" or
 * weekly #1 suggestion and writes them to docs/standup/openclaw-queue/ for
 * AI coding agents (OpenClaw, Cursor, Claude Code).
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";
import type { OpenClawTask, OpenClawTaskSource } from "../types/openclawTask";

const DEFAULT_QUEUE_DIR = "docs/standup/openclaw-queue";

/**
 * Get the OpenClaw task queue directory (respects STANDUP_DELIVERABLES_DIR).
 */
export function getOpenClawQueueDir(): string {
  const base = process.env.STANDUP_DELIVERABLES_DIR?.trim();
  const root = base ? path.resolve(process.cwd(), base) : process.cwd();
  return path.join(root, base ? "openclaw-queue" : DEFAULT_QUEUE_DIR);
}

/**
 * Parse "🎯 Top pick: [title] — [reason]" or "Top pick: [title] - [reason]"
 * and return { title, reason } or null.
 */
export function parseTopPick(
  text: string,
): { title: string; reason: string } | null {
  const match = text.match(/(?:🎯\s*)?Top pick:\s*(.+?)(?:\s+[—\-]\s+)(.+)/i);
  if (match) {
    return {
      title: match[1].trim(),
      reason: match[2].trim(),
    };
  }
  const fallback = text.match(/(?:🎯\s*)?Top pick:\s*(.+)/i);
  if (fallback) {
    const rest = fallback[1].trim();
    const dash = rest.search(/\s+[—\-]\s+/);
    if (dash > 0) {
      return {
        title: rest.slice(0, dash).trim(),
        reason: rest
          .slice(dash)
          .replace(/^\s*[—\-]\s*/, "")
          .trim(),
      };
    }
    return { title: rest, reason: "Highest impact per Sentinel analysis." };
  }
  return null;
}

/**
 * Generate a short slug from title for filenames and branch names.
 */
function slugify(title: string, maxLen = 40): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLen);
}

/**
 * Generate task id (e.g. openclaw-20260219-A1B2).
 */
function generateTaskId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `openclaw-${date}-${rand}`;
}

const DEFAULT_ACCEPTANCE_CRITERIA = [
  "Feature or fix works as described in the task.",
  "No regression in existing functionality.",
  "Tests pass: bun test",
  "TypeScript compiles: bun run build",
];

/**
 * Build an OpenClawTask from a "Top pick" line and source.
 */
export function buildTaskFromTopPick(
  topPickText: string,
  source: OpenClawTaskSource,
): OpenClawTask | null {
  const parsed = parseTopPick(topPickText);
  if (!parsed) return null;

  const now = new Date().toISOString();
  const date = now.slice(0, 10);
  const slug = slugify(parsed.title);
  const id = generateTaskId();

  const task: OpenClawTask = {
    id,
    title: parsed.title,
    description: `${parsed.title}. ${parsed.reason}`,
    scope: `In scope: ${parsed.title}. Out of scope: UI or database changes unless explicitly stated.`,
    acceptanceCriteria: DEFAULT_ACCEPTANCE_CRITERIA,
    expectedOutcome: parsed.reason,
    source,
    branchName: `sentinel/${date}-${slug}`,
    createdAt: now,
    priority: "P1",
    effort: "M",
  };

  const pluginMatch = parsed.title.match(/\((plugin-[a-z0-9-]+)\)/i);
  if (pluginMatch) task.plugin = pluginMatch[1];

  return task;
}

/**
 * Build an OpenClawTask from a single suggestion line (e.g. from weekly list).
 * Line format often: "1. **Title** (plugin-x) — reason" or "1. Title — reason"
 */
export function buildTaskFromSuggestionLine(
  line: string,
  source: OpenClawTaskSource,
): OpenClawTask {
  const cleaned = line
    .replace(/^\d+\.\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
  const dashIdx = cleaned.search(/\s+[—\-]\s+/);
  const title = dashIdx > 0 ? cleaned.slice(0, dashIdx).trim() : cleaned;
  const reason =
    dashIdx > 0
      ? cleaned
          .slice(dashIdx)
          .replace(/^\s*[—\-]\s*/, "")
          .trim()
      : "Prioritized by Sentinel.";

  const now = new Date().toISOString();
  const date = now.slice(0, 10);
  const slug = slugify(title);
  const id = generateTaskId();

  const task: OpenClawTask = {
    id,
    title,
    description: `${title}. ${reason}`,
    scope: `In scope: ${title}. Out of scope: UI or database changes unless explicitly stated.`,
    acceptanceCriteria: DEFAULT_ACCEPTANCE_CRITERIA,
    expectedOutcome: reason,
    source,
    branchName: `sentinel/${date}-${slug}`,
    createdAt: now,
    priority: "P1",
    effort: "M",
  };

  const pluginMatch = title.match(/\((plugin-[a-z0-9-]+)\)/i);
  if (pluginMatch) task.plugin = pluginMatch[1];

  return task;
}

/**
 * Write task to the OpenClaw queue directory. Creates dir if needed.
 * Returns the absolute path of the written file.
 */
export function writeTaskToQueue(task: OpenClawTask): string {
  const queueDir = getOpenClawQueueDir();
  if (!fs.existsSync(queueDir)) {
    fs.mkdirSync(queueDir, { recursive: true });
  }

  const date = task.createdAt.slice(0, 10);
  const slug = slugify(task.title);
  const filename = `${date}-${task.id}-${slug}.json`;
  const filepath = path.join(queueDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(task, null, 2), "utf-8");
  logger.info(`[OpenClawTaskBrief] Wrote task ${task.id} to ${filepath}`);
  return filepath;
}
