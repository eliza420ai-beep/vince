#!/usr/bin/env bun
/**
 * Push VINCE improvement journal entries (PENDING_CLAWDBOT) to claude-code-controller as tasks.
 *
 * Run periodically (e.g. cron) or on-demand. Reads improvement-journal.md from
 * .elizadb/vince-paper-bot/ or IMPROVEMENT_JOURNAL_PATH. Creates one controller task per
 * pending entry and assigns to CLAUDE_CODE_CONTROLLER_AGENT (default: coder).
 *
 * Usage:
 *   bun run scripts/improvement-journal-to-controller.ts
 *   bun run scripts/improvement-journal-to-controller.ts --dry-run
 *
 * Env: CLAUDE_CODE_CONTROLLER_URL, CLAUDE_CODE_CONTROLLER_AGENT, IMPROVEMENT_JOURNAL_PATH (optional)
 */

import * as fs from "fs";
import * as path from "path";

const BASE_URL =
  process.env.CLAUDE_CODE_CONTROLLER_URL?.trim() || "http://localhost:3456";
const AGENT_NAME =
  process.env.CLAUDE_CODE_CONTROLLER_AGENT?.trim() || "coder";
const JOURNAL_PATH =
  process.env.IMPROVEMENT_JOURNAL_PATH?.trim() ||
  path.join(process.cwd(), ".elizadb", "vince-paper-bot", "improvement-journal.md");
const MAX_TASKS_PER_RUN = 5;

const dryRun = process.argv.includes("--dry-run");

async function fetchJson(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: unknown }> {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      },
    });
    const data = res.headers.get("content-type")?.includes("json")
      ? await res.json().catch(() => ({}))
      : undefined;
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: String(e) } };
  }
}

function parsePendingEntries(content: string): { subject: string; description: string }[] {
  const entries: { subject: string; description: string }[] = [];
  const blocks = content.split(/\n---+\n/).filter((b) => b.trim().length > 0);
  for (const block of blocks) {
    if (!block.includes("Status:") || !block.includes("PENDING_CLAWDBOT")) continue;
    const lines = block.trim().split("\n");
    let issue = "";
    for (const line of lines) {
      if (line.startsWith("Issue:") || line.startsWith("**Issue:**")) {
        issue = line.replace(/^(Issue:\s*|\*\*Issue:\*\*\s*)/i, "").trim();
        break;
      }
    }
    const subject =
      issue.slice(0, 80) || block.slice(0, 80).replace(/\n/g, " ");
    entries.push({ subject, description: block.trim() });
  }
  return entries;
}

async function main() {
  if (!fs.existsSync(JOURNAL_PATH)) {
    console.log("[improvement-journal-to-controller] No journal file at", JOURNAL_PATH);
    process.exit(0);
  }

  const content = fs.readFileSync(JOURNAL_PATH, "utf-8");
  const pending = parsePendingEntries(content);
  if (pending.length === 0) {
    console.log("[improvement-journal-to-controller] No PENDING_CLAWDBOT entries.");
    process.exit(0);
  }

  console.log(
    "[improvement-journal-to-controller] Found",
    pending.length,
    "pending entries. Controller:",
    BASE_URL
  );

  if (dryRun) {
    pending.slice(0, MAX_TASKS_PER_RUN).forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.subject}`);
    });
    console.log("[improvement-journal-to-controller] Dry run. Exiting.");
    process.exit(0);
  }

  const health = await fetchJson(BASE_URL, "/health");
  if (!health.ok) {
    console.error("[improvement-journal-to-controller] Controller not reachable at", BASE_URL);
    process.exit(1);
  }

  const sessionRes = await fetchJson(BASE_URL, "/session");
  if (!sessionRes.ok || !sessionRes.data) {
    const initRes = await fetchJson(BASE_URL, "/session/init", {
      method: "POST",
      body: JSON.stringify({ teamName: "vince", cwd: process.cwd() }),
    });
    if (!initRes.ok) {
      console.error("[improvement-journal-to-controller] Session init failed:", initRes.status);
      process.exit(1);
    }
  }

  const agentsRes = await fetchJson(BASE_URL, "/agents");
  const agents = (agentsRes.data as { agents?: { name: string }[] })?.agents ?? [];
  const agentExists = agents.some((a: { name: string }) => a.name === AGENT_NAME);
  if (!agentExists) {
    const spawnRes = await fetchJson(BASE_URL, "/agents", {
      method: "POST",
      body: JSON.stringify({ name: AGENT_NAME, model: "sonnet" }),
    });
    if (!spawnRes.ok) {
      console.error("[improvement-journal-to-controller] Failed to spawn agent:", spawnRes.status);
      process.exit(1);
    }
    console.log("[improvement-journal-to-controller] Spawned agent", AGENT_NAME);
  }

  const toCreate = pending.slice(0, MAX_TASKS_PER_RUN);
  for (const entry of toCreate) {
    const createRes = await fetchJson(BASE_URL, "/tasks", {
      method: "POST",
      body: JSON.stringify({
        subject: entry.subject,
        description: entry.description,
      }),
    });
    if (!createRes.ok) {
      console.error("[improvement-journal-to-controller] Create task failed:", createRes.status, createRes.data);
      continue;
    }
    const taskId = (createRes.data as { id?: string })?.id;
    if (!taskId) {
      console.error("[improvement-journal-to-controller] No task id in response");
      continue;
    }
    const assignRes = await fetchJson(BASE_URL, `/tasks/${taskId}/assign`, {
      method: "POST",
      body: JSON.stringify({ agent: AGENT_NAME }),
    });
    if (!assignRes.ok) {
      console.error("[improvement-journal-to-controller] Assign failed for task", taskId, assignRes.status);
    } else {
      console.log("[improvement-journal-to-controller] Created and assigned task:", taskId, entry.subject.slice(0, 50));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
