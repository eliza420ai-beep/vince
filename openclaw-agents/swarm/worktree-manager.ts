/**
 * worktree-manager.ts
 *
 * Git worktree lifecycle for the VINCE agent swarm.
 *
 * Pattern: One agent per worktree, one worktree per feature, each in its own
 * tmux session. Clean separation — agents never see each other's work until
 * it's PR'd and reviewed.
 *
 * Reference: "One Month With the Swarm" (ikigaistudio.substack.com)
 */

import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import path from "path";

export const WORKTREE_BASE = "/tmp";

export interface Worktree {
  taskId: string;
  path: string;
  branch: string;
  head: string;
  linked: boolean;
}

/**
 * Parse `git worktree list --porcelain` output into structured objects.
 */
export function listWorktrees(repoRoot: string): Worktree[] {
  try {
    const raw = execSync("git worktree list --porcelain", {
      cwd: repoRoot,
      encoding: "utf-8",
    });
    const worktrees: Worktree[] = [];
    const blocks = raw.trim().split("\n\n");
    for (const block of blocks) {
      const lines = block.trim().split("\n");
      const wtPath = lines.find((l) => l.startsWith("worktree "))?.slice(9) ?? "";
      const head = lines.find((l) => l.startsWith("HEAD "))?.slice(5) ?? "";
      const branch = lines.find((l) => l.startsWith("branch "))?.slice(7).replace("refs/heads/", "") ?? "";
      const linked = !lines.some((l) => l === "bare") && wtPath !== repoRoot;
      // Only include VINCE swarm worktrees (prefixed vince-wt-)
      if (wtPath.includes("vince-wt-")) {
        const taskId = path.basename(wtPath).replace("vince-wt-", "");
        worktrees.push({ taskId, path: wtPath, branch, head, linked });
      }
    }
    return worktrees;
  } catch {
    return [];
  }
}

/**
 * Create a new git worktree for a task.
 * - Branch: `swarm/<taskId>` (e.g. swarm/abc123)
 * - Path: `/tmp/vince-wt-<taskId>`
 */
export function createWorktree(
  repoRoot: string,
  taskId: string,
  branchName: string
): string {
  const wtPath = path.join(WORKTREE_BASE, `vince-wt-${taskId}`);
  const branch = branchName.startsWith("swarm/") ? branchName : `swarm/${branchName}`;

  if (existsSync(wtPath)) {
    console.log(`[worktree] Worktree already exists at ${wtPath}`);
    return wtPath;
  }

  // Create worktree on a new branch from main
  execSync(`git worktree add -b "${branch}" "${wtPath}" main`, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  console.log(`[worktree] Created: ${wtPath} (branch: ${branch})`);
  return wtPath;
}

/**
 * Sync a worktree with the latest main branch (rebase).
 * Call before spawning an agent to ensure it starts fresh.
 */
export function syncWorktree(wtPath: string): void {
  try {
    execSync("git fetch origin main", { cwd: wtPath, stdio: "inherit" });
    execSync("git rebase origin/main", { cwd: wtPath, stdio: "inherit" });
    console.log(`[worktree] Synced ${wtPath} with origin/main`);
  } catch (e) {
    console.warn(`[worktree] Sync failed for ${wtPath}: ${e}`);
  }
}

/**
 * Remove a worktree and optionally delete its branch.
 * Called by the daily cleanup cron after PRs are merged.
 */
export function destroyWorktree(
  repoRoot: string,
  taskId: string,
  deleteBranch = false
): void {
  const wtPath = path.join(WORKTREE_BASE, `vince-wt-${taskId}`);

  try {
    execSync(`git worktree remove "${wtPath}" --force`, {
      cwd: repoRoot,
      stdio: "inherit",
    });
    console.log(`[worktree] Removed worktree: ${wtPath}`);
  } catch {
    // If git worktree remove fails, force-delete the directory
    if (existsSync(wtPath)) {
      rmSync(wtPath, { recursive: true, force: true });
      console.log(`[worktree] Force-removed directory: ${wtPath}`);
    }
  }

  if (deleteBranch) {
    try {
      const branch = `swarm/${taskId}`;
      execSync(`git branch -D "${branch}"`, { cwd: repoRoot, stdio: "inherit" });
      execSync(`git push origin --delete "${branch}"`, { cwd: repoRoot, stdio: "inherit" });
      console.log(`[worktree] Deleted branch: ${branch}`);
    } catch (e) {
      console.warn(`[worktree] Branch deletion failed: ${e}`);
    }
  }
}

/**
 * Install deps in a worktree without polluting the main install.
 * Uses bun (consistent with VINCE), with a shared cache.
 */
export function installDeps(wtPath: string): void {
  // If node_modules already exists (from a previous run), skip for speed
  if (existsSync(path.join(wtPath, "node_modules"))) {
    console.log(`[worktree] node_modules exists, skipping bun install`);
    return;
  }
  console.log(`[worktree] Running bun install in ${wtPath}...`);
  execSync("bun install --frozen-lockfile", {
    cwd: wtPath,
    stdio: "inherit",
    timeout: 120_000,
  });
}
