/**
 * swarm-orchestrator.ts
 *
 * VINCE Agent Swarm — General Contractor Mode
 *
 * "Using OpenClaw as the orchestrator is like being the general contractor.
 *  You don't swing the hammer. You don't even talk to the carpenter most of the time.
 *  You talk to the foreman — the orchestrator — who holds all the context about the
 *  project: what the client wants, what we tried before, why it failed, what the
 *  constraints are, what 'done' looks like."
 *   — "One Month With the Swarm" (ikigaistudio.substack.com)
 *
 * Usage:
 *   bun run openclaw-agents/swarm/swarm-orchestrator.ts spawn "Add Execute Vince Signal quick action to Otaku"
 *   bun run openclaw-agents/swarm/swarm-orchestrator.ts status
 *   bun run openclaw-agents/swarm/swarm-orchestrator.ts redirect <task-id> "Focus only on src/plugins/plugin-vince/"
 *   bun run openclaw-agents/swarm/swarm-orchestrator.ts review <pr-number>
 *   bun run openclaw-agents/swarm/swarm-orchestrator.ts done <task-id>
 *   bun run openclaw-agents/swarm/swarm-orchestrator.ts learn <task-id>
 *   bun run openclaw-agents/swarm/swarm-orchestrator.ts cleanup
 */

import { execSync, spawnSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createWorktree, destroyWorktree, installDeps, syncWorktree } from "./worktree-manager.js";
import { validateDone, formatDoneResult } from "./definition-of-done.js";
import { reviewPR } from "./pr-reviewer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SWARM_DIR = __dirname;
const REPO_ROOT = path.resolve(__dirname, "../../..");
const REGISTRY_PATH = path.join(SWARM_DIR, "task-registry.json");
const LEARNING_LOG_PATH = path.join(SWARM_DIR, "learning-log.md");
const REPO = "eliza420ai-beep/vince";
const MAX_RETRIES = 3;
const STUCK_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

// ─── Types ─────────────────────────────────────────────────────────────────

export type TaskStatus =
  | "pending"
  | "running"
  | "pr-open"
  | "reviewing"
  | "done"
  | "failed";
export type AgentType = "codex" | "claude";

export interface Task {
  id: string;
  description: string;
  branch: string;
  worktreePath: string;
  tmuxSession: string;
  agent: AgentType;
  status: TaskStatus;
  prNumber?: number;
  attempts: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  hasUIChanges: boolean;
  notes: string[];
}

export interface TaskRegistry {
  tasks: Task[];
  lessons: Array<{
    taskId: string;
    date: string;
    description: string;
    outcome: string;
    lesson: string;
    promptImprovement: string;
  }>;
  stats: {
    totalTasks: number;
    completed: number;
    failed: number;
    totalPRs: number;
  };
}

// ─── Registry ───────────────────────────────────────────────────────────────

function loadRegistry(): TaskRegistry {
  if (!existsSync(REGISTRY_PATH)) {
    return { tasks: [], lessons: [], stats: { totalTasks: 0, completed: 0, failed: 0, totalPRs: 0 } };
  }
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
}

function saveRegistry(registry: TaskRegistry): void {
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

function getTask(registry: TaskRegistry, taskId: string): Task | undefined {
  return registry.tasks.find((t) => t.id === taskId);
}

function updateTask(registry: TaskRegistry, taskId: string, updates: Partial<Task>): void {
  const idx = registry.tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) throw new Error(`Task not found: ${taskId}`);
  registry.tasks[idx] = { ...registry.tasks[idx], ...updates, updatedAt: new Date().toISOString() };
}

// ─── Context Builder ─────────────────────────────────────────────────────────

/**
 * Build the detailed context prompt for a coding agent.
 * This is where "the orchestrator holds everything" — the agent gets full context
 * so it can one-shot the task without follow-up questions.
 */
function buildAgentPrompt(task: Task): string {
  return `# VINCE Coding Task

## Your Assignment
${task.description}

## Why This Exists
You are implementing a feature for VINCE — a multi-agent AI trading system built on ElizaOS.
The system runs 24/7 and handles real positions (via Otaku) on Hyperliquid perps and DeFi.
This task was prioritized by the Sentinel agent based on the active PRD (One Dream — Agent Synergy).

## The 10-Agent Team You're Improving

| Agent | Role | Location |
|-------|------|----------|
| Eliza | Knowledge, research, Substack content | src/agents/eliza.ts |
| VINCE | Options, perps, memes, paper bot, 15+ signals | src/agents/vince.ts |
| ECHO | CT sentiment, X research, social alpha | src/agents/echo.ts |
| Oracle | Polymarket prediction markets | src/agents/oracle.ts |
| Solus | Weekly BTC options planning | src/agents/solus.ts |
| **Otaku** | **ONLY agent with a wallet** — DeFi execution | src/agents/otaku.ts |
| Kelly | Lifestyle concierge, flywheel score | src/agents/kelly.ts |
| Sentinel | Ops, PRDs, ONNX, memory, repo improvements | src/agents/sentinel.ts |
| Naval | Philosophy, mental models, standup | src/agents/naval.ts |
| Clawterm | OpenClaw specialist | src/agents/clawterm.ts |

## Key File Paths

- **Agent characters**: \`src/agents/\`
- **Plugin VINCE** (signals, paper bot, ML): \`src/plugins/plugin-vince/src/\`
  - Types: \`src/plugins/plugin-vince/src/types/\`
  - Actions: \`src/plugins/plugin-vince/src/actions/\`
  - Constants: \`src/plugins/plugin-vince/src/constants/targetAssets.ts\`
- **Plugin Kelly**: \`src/plugins/plugin-kelly/src/\`
- **Action registry**: Look for \`actions/\` in each plugin
- **Tests**: \`vitest.config.vince.ts\`, \`vitest.config.otaku.ts\`, etc.
  - Run tests: \`bun run check-all\`
- **PRDs**: \`docs/standup/prds/PRD_ONE_DREAM_AGENT_SYNERGY.md\`
- **OpenClaw guide**: \`OPENCLAW.md\`

## Development Commands

\`\`\`bash
bun run type-check     # TypeScript check (no emit)
bun run check-all      # type-check + format + tests
elizaos dev            # hot-reload dev server
\`\`\`

## Definition of Done

Your task is COMPLETE when ALL of these are true:
1. ✅ All TypeScript errors resolved (\`bun run type-check\` passes)
2. ✅ Tests pass (\`bun run check-all\` passes)
3. ✅ PR created with descriptive title and body explaining the "why"
4. ✅ Branch pushed to origin (swarm/${task.id})
5. ✅ PR body includes screenshot if you changed any UI components
6. ✅ Commit message follows conventional commits format (feat:, fix:, chore:)

## Task-Specific Notes
${task.notes.length > 0 ? task.notes.join("\n") : "No additional context."}

## When You're Done

Run this command to notify the orchestrator:
\`\`\`bash
openclaw system event --text "Done: ${task.description.slice(0, 80)}" --mode now
\`\`\`

Or create the PR and it will be detected by the monitor loop.

---
Branch: swarm/${task.id}
Task ID: ${task.id}
Started: ${task.startedAt}
`;
}

// ─── tmux helpers ────────────────────────────────────────────────────────────

function tmuxSessionExists(session: string): boolean {
  try {
    execSync(`tmux has-session -t "${session}"`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function createTmuxSession(session: string, wtPath: string): void {
  execSync(`tmux new-session -d -s "${session}" -c "${wtPath}"`, { stdio: "pipe" });
}

/**
 * Send a message into an agent's tmux session.
 * This is "mid-task redirection" — faster and cheaper than respawning.
 * Mirrors how you'd redirect a human dev: a quick Slack message, not a firing.
 */
export function redirectAgent(taskId: string, message: string): void {
  const registry = loadRegistry();
  const task = getTask(registry, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (!tmuxSessionExists(task.tmuxSession)) {
    throw new Error(`tmux session not found: ${task.tmuxSession}. Agent may have exited.`);
  }
  const escaped = message.replace(/"/g, '\\"');
  execSync(`tmux send-keys -t "${task.tmuxSession}" "${escaped}" Enter`);
  updateTask(registry, taskId, { notes: [...task.notes, `[redirect] ${message}`] });
  saveRegistry(registry);
  console.log(`✉️  Redirected agent ${taskId}: "${message}"`);
}

// ─── Core Commands ───────────────────────────────────────────────────────────

/**
 * Spawn a new coding agent for a task.
 * Creates worktree → tmux session → launches agent with full context.
 */
export async function spawnTask(
  description: string,
  options: { agent?: AgentType; hasUIChanges?: boolean; notes?: string[] } = {}
): Promise<Task> {
  const registry = loadRegistry();
  const agent = options.agent ?? "claude";
  const taskId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const branch = `swarm/${taskId}`;
  const tmuxSession = `vince-${taskId}`;

  const task: Task = {
    id: taskId,
    description,
    branch,
    worktreePath: `/tmp/vince-wt-${taskId}`,
    tmuxSession,
    agent,
    status: "pending",
    attempts: 1,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasUIChanges: options.hasUIChanges ?? false,
    notes: options.notes ?? [],
  };

  console.log(`\n🚀 Spawning task: ${description}`);
  console.log(`   ID: ${taskId} | Agent: ${agent} | Branch: ${branch}`);

  // 1. Create worktree
  createWorktree(REPO_ROOT, taskId, branch);

  // 2. Install deps (skip if already installed)
  installDeps(task.worktreePath);

  // 3. Build context prompt
  const prompt = buildAgentPrompt(task);
  writeFileSync(path.join(task.worktreePath, ".swarm-task.md"), prompt);

  // 4. Create tmux session
  createTmuxSession(tmuxSession, task.worktreePath);

  // 5. Launch agent
  const agentCmd =
    agent === "codex"
      ? `codex exec --full-auto "$(cat .swarm-task.md)"`
      : `claude --dangerously-skip-permissions -p "$(cat .swarm-task.md)"`;

  execSync(`tmux send-keys -t "${tmuxSession}" "${agentCmd}" Enter`);

  // 6. Register task
  task.status = "running";
  registry.tasks.push(task);
  registry.stats.totalTasks++;
  saveRegistry(registry);

  console.log(`✅ Agent launched in tmux session: ${tmuxSession}`);
  console.log(`   Monitor: tmux attach -t ${tmuxSession}`);
  console.log(`   Redirect: bun run openclaw-agents/swarm/swarm-orchestrator.ts redirect ${taskId} "your message"`);

  return task;
}

/**
 * Check status of all tasks.
 */
export function getStatus(): void {
  const registry = loadRegistry();
  const now = Date.now();

  console.log("\n═══════════════════════════════════════");
  console.log("   VINCE SWARM STATUS");
  console.log("═══════════════════════════════════════\n");
  console.log(`Stats: ${registry.stats.completed} done | ${registry.stats.failed} failed | ${registry.stats.totalPRs} PRs\n`);

  if (registry.tasks.length === 0) {
    console.log("No tasks yet. Spawn one with: bun run swarm-orchestrator.ts spawn \"description\"");
    return;
  }

  for (const task of registry.tasks) {
    const age = Math.round((now - Date.parse(task.startedAt)) / 60_000);
    const stuck = age > 120 && task.status === "running";
    const icon =
      task.status === "done" ? "✅" :
      task.status === "failed" ? "❌" :
      task.status === "pr-open" ? "🔀" :
      task.status === "reviewing" ? "🔍" :
      stuck ? "⚠️ " : "🔄";

    console.log(`${icon} [${task.id}] ${task.description.slice(0, 60)}`);
    console.log(`   Status: ${task.status} | Agent: ${task.agent} | Age: ${age}min | Attempts: ${task.attempts}`);
    if (task.prNumber) console.log(`   PR: #${task.prNumber}`);
    if (stuck) console.log(`   ⚠️  STUCK: Running >2hr. Use redirect or respawn.`);
    console.log();
  }
}

/**
 * Validate definition-of-done for a task.
 */
export async function checkDone(taskId: string): Promise<void> {
  const registry = loadRegistry();
  const task = getTask(registry, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (!task.prNumber) {
    console.log(`❌ No PR number recorded for task ${taskId}. Update registry manually.`);
    return;
  }

  const result = await validateDone(task.prNumber, REPO, task.hasUIChanges);
  console.log(formatDoneResult(result, task.description));

  if (result.done) {
    updateTask(registry, taskId, { status: "done", completedAt: new Date().toISOString() });
    registry.stats.completed++;
    saveRegistry(registry);
    console.log(`\n🎉 Task ${taskId} marked as done!`);
  }
}

/**
 * Run 3-model PR review for a task.
 */
export async function runReview(prNumber: number): Promise<void> {
  const registry = loadRegistry();
  const task = registry.tasks.find((t) => t.prNumber === prNumber);
  if (task) {
    updateTask(registry, task.id, { status: "reviewing" });
    saveRegistry(registry);
  }

  const summary = await reviewPR(prNumber, REPO, task?.hasUIChanges ?? false);

  if (task) {
    updateTask(registry, task.id, {
      status: summary.ready ? "pr-open" : "running",
      notes: [
        ...task.notes,
        `[review] PR #${prNumber}: ${summary.consensus} by ${summary.reviews.map((r) => r.reviewer).join(", ")}`,
      ],
    });
    saveRegistry(registry);
  }
}

/**
 * Log a lesson from a task (called after failure or success).
 */
export function logLesson(
  taskId: string,
  lesson: string,
  promptImprovement: string
): void {
  const registry = loadRegistry();
  const task = getTask(registry, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  registry.lessons.push({
    taskId,
    date: new Date().toISOString().slice(0, 10),
    description: task.description,
    outcome: task.status,
    lesson,
    promptImprovement,
  });
  saveRegistry(registry);

  // Also append to human-readable learning log
  const entry = `
### [${new Date().toISOString().slice(0, 10)}] Task: ${task.description}

- **Task ID**: \`${taskId}\`
- **Outcome**: ${task.status}
- **Lesson**: ${lesson}
- **Prompt improvement**: ${promptImprovement}
- **Agent**: ${task.agent}
- **Attempts**: ${task.attempts}
`;
  const existing = readFileSync(LEARNING_LOG_PATH, "utf-8");
  const insertPoint = existing.indexOf("## Entries\n") + "## Entries\n".length;
  writeFileSync(
    LEARNING_LOG_PATH,
    existing.slice(0, insertPoint) + entry + existing.slice(insertPoint)
  );

  console.log(`📚 Lesson logged for task ${taskId}`);
}

/**
 * Respawn a failed agent with improved context.
 */
export async function respawnTask(taskId: string, additionalNotes: string[]): Promise<void> {
  const registry = loadRegistry();
  const task = getTask(registry, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  if (task.attempts >= MAX_RETRIES) {
    console.log(`❌ Task ${taskId} has reached max retries (${MAX_RETRIES}). Marking as failed.`);
    updateTask(registry, taskId, { status: "failed" });
    registry.stats.failed++;
    saveRegistry(registry);
    return;
  }

  console.log(`🔄 Respawning task ${taskId} (attempt ${task.attempts + 1}/${MAX_RETRIES})...`);

  // Kill old tmux session if still alive
  if (tmuxSessionExists(task.tmuxSession)) {
    execSync(`tmux kill-session -t "${task.tmuxSession}"`);
  }

  // Sync worktree with latest main
  syncWorktree(task.worktreePath);

  // Update task with additional notes and increment attempts
  updateTask(registry, taskId, {
    status: "running",
    attempts: task.attempts + 1,
    notes: [...task.notes, ...additionalNotes, `[respawn] Attempt ${task.attempts + 1}`],
  });
  saveRegistry(registry);

  // Re-read updated task and relaunch
  const updatedTask = getTask(loadRegistry(), taskId)!;
  const prompt = buildAgentPrompt(updatedTask);
  writeFileSync(path.join(updatedTask.worktreePath, ".swarm-task.md"), prompt);

  createTmuxSession(task.tmuxSession, task.worktreePath);
  const agentCmd =
    task.agent === "codex"
      ? `codex exec --full-auto "$(cat .swarm-task.md)"`
      : `claude --dangerously-skip-permissions -p "$(cat .swarm-task.md)"`;
  execSync(`tmux send-keys -t "${task.tmuxSession}" "${agentCmd}" Enter`);

  console.log(`✅ Respawned in ${task.tmuxSession}`);
}

/**
 * Clean up completed/failed tasks (remove worktrees, kill tmux sessions).
 * Run this daily via cron.
 */
export function cleanup(dryRun = false): void {
  const registry = loadRegistry();
  const toClean = registry.tasks.filter(
    (t) => t.status === "done" || t.status === "failed"
  );

  console.log(`\n🧹 Cleanup: ${toClean.length} tasks to clean up`);
  for (const task of toClean) {
    console.log(`  [${task.status}] ${task.id}: ${task.description.slice(0, 50)}`);
    if (!dryRun) {
      if (tmuxSessionExists(task.tmuxSession)) {
        execSync(`tmux kill-session -t "${task.tmuxSession}"`);
      }
      destroyWorktree(REPO_ROOT, task.id, task.status === "done");
    }
  }

  if (!dryRun) {
    // Remove cleaned tasks from registry (keep for stats/lessons)
    registry.tasks = registry.tasks.filter(
      (t) => t.status !== "done" && t.status !== "failed"
    );
    saveRegistry(registry);
    console.log("✅ Cleanup complete.");
  } else {
    console.log("(dry-run: no changes made)");
  }
}

// ─── CLI ────────────────────────────────────────────────────────────────────

async function main() {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case "spawn": {
      const description = args.join(" ");
      if (!description) {
        console.error("Usage: swarm-orchestrator.ts spawn <description> [--codex] [--ui]");
        process.exit(1);
      }
      const agent: AgentType = args.includes("--codex") ? "codex" : "claude";
      const hasUIChanges = args.includes("--ui");
      await spawnTask(description, { agent, hasUIChanges });
      break;
    }

    case "status":
      getStatus();
      break;

    case "redirect": {
      const [taskId, ...msgParts] = args;
      const message = msgParts.join(" ");
      if (!taskId || !message) {
        console.error("Usage: swarm-orchestrator.ts redirect <task-id> <message>");
        process.exit(1);
      }
      redirectAgent(taskId, message);
      break;
    }

    case "review": {
      const prNumber = parseInt(args[0], 10);
      if (isNaN(prNumber)) {
        console.error("Usage: swarm-orchestrator.ts review <pr-number>");
        process.exit(1);
      }
      await runReview(prNumber);
      break;
    }

    case "done": {
      const [taskId] = args;
      if (!taskId) {
        console.error("Usage: swarm-orchestrator.ts done <task-id>");
        process.exit(1);
      }
      await checkDone(taskId);
      break;
    }

    case "learn": {
      const [taskId, ...rest] = args;
      if (!taskId) {
        console.error("Usage: swarm-orchestrator.ts learn <task-id> <lesson> <prompt-improvement>");
        process.exit(1);
      }
      logLesson(taskId, rest[0] ?? "(no lesson)", rest[1] ?? "(no prompt improvement)");
      break;
    }

    case "respawn": {
      const [taskId, ...notes] = args;
      if (!taskId) {
        console.error("Usage: swarm-orchestrator.ts respawn <task-id> [additional-context...]");
        process.exit(1);
      }
      await respawnTask(taskId, notes.map((n) => `[manual-note] ${n}`));
      break;
    }

    case "cleanup":
      cleanup(args.includes("--dry-run"));
      break;

    default:
      console.log(`
VINCE Agent Swarm Orchestrator

Commands:
  spawn "<description>" [--codex] [--ui]   Spawn a new coding agent
  status                                    List all tasks
  redirect <task-id> "<message>"           Redirect running agent (no respawn)
  review <pr-number>                        Run 3-model PR review
  done <task-id>                            Validate definition-of-done
  learn <task-id> "<lesson>" "<prompt>"     Log lesson from failure/success
  respawn <task-id> [context...]            Retry failed task with improvements
  cleanup [--dry-run]                       Remove completed/failed worktrees

Examples:
  bun run openclaw-agents/swarm/swarm-orchestrator.ts spawn "Add flywheel score to Kelly daily briefing"
  bun run openclaw-agents/swarm/swarm-orchestrator.ts redirect abc123 "Focus on src/plugins/plugin-kelly/src/actions/"
  bun run openclaw-agents/swarm/swarm-orchestrator.ts review 247
`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
