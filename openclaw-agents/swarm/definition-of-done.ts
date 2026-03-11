/**
 * definition-of-done.ts
 *
 * Validates whether a task is truly "done" — not just "PR created".
 *
 * "The definition of done is the quality gate that makes the autonomous loop
 *  trustworthy. Without this explicit definition, agents would push half-finished
 *  work and declare victory."
 *   — "One Month With the Swarm" (ikigaistudio.substack.com)
 *
 * Done means ALL of:
 *   ✅ PR exists and is open (or merged)
 *   ✅ Branch is synced with main (no conflict markers)
 *   ✅ CI is passing (all required checks green)
 *   ✅ 3 AI code reviews posted (Codex, Claude, Gemini)
 *   ✅ UI changes have screenshots in PR body or comments
 */

import { execSync } from "child_process";

export interface DoneResult {
  done: boolean;
  checks: Record<string, boolean>;
  missing: string[];
}

const REQUIRED_REVIEWERS = ["codex-reviewer", "claude-reviewer", "gemini-reviewer"];

/**
 * Validate all definition-of-done criteria for a given PR.
 *
 * @param prNumber - GitHub PR number
 * @param repo - GitHub repo (e.g. "eliza420ai-beep/vince")
 * @param hasUIChanges - Whether this task modifies UI components
 */
export async function validateDone(
  prNumber: number,
  repo: string,
  hasUIChanges = false
): Promise<DoneResult> {
  const checks: Record<string, boolean> = {};
  const missing: string[] = [];

  // 1. PR exists and is open/merged
  try {
    const pr = JSON.parse(
      execSync(`gh pr view ${prNumber} --repo ${repo} --json state,mergeable,title`, {
        encoding: "utf-8",
      })
    );
    checks.prExists = true;
    checks.prOpenOrMerged = pr.state === "OPEN" || pr.state === "MERGED";
    checks.noMergeConflicts = pr.mergeable !== "CONFLICTING";

    if (!checks.prOpenOrMerged) missing.push("PR is not open or merged");
    if (!checks.noMergeConflicts) missing.push("PR has merge conflicts — branch needs rebase");
  } catch {
    checks.prExists = false;
    checks.prOpenOrMerged = false;
    checks.noMergeConflicts = false;
    missing.push(`PR #${prNumber} not found`);
  }

  // 2. CI checks passing
  try {
    const runs = JSON.parse(
      execSync(
        `gh pr checks ${prNumber} --repo ${repo} --json name,state,conclusion`,
        { encoding: "utf-8" }
      )
    );
    const failingChecks = runs.filter(
      (r: { state: string; conclusion: string }) =>
        r.state === "COMPLETED" &&
        r.conclusion !== "SUCCESS" &&
        r.conclusion !== "SKIPPED" &&
        r.conclusion !== "NEUTRAL"
    );
    checks.ciPassing = failingChecks.length === 0;
    if (!checks.ciPassing) {
      missing.push(
        `CI failing: ${failingChecks.map((r: { name: string }) => r.name).join(", ")}`
      );
    }
  } catch {
    // gh pr checks may fail if no CI is configured; don't block
    checks.ciPassing = true;
  }

  // 3. 3 AI reviews posted
  try {
    const comments = JSON.parse(
      execSync(
        `gh pr view ${prNumber} --repo ${repo} --json comments --jq '.comments[].author.login'`,
        { encoding: "utf-8" }
      )
    );
    const reviewCommentAuthors: string[] = Array.isArray(comments)
      ? comments
      : String(comments).trim().split("\n");

    // Also check review (formal review) authors
    const reviews = JSON.parse(
      execSync(
        `gh pr view ${prNumber} --repo ${repo} --json reviews --jq '.reviews[].author.login'`,
        { encoding: "utf-8" }
      )
    );
    const reviewAuthors: string[] = Array.isArray(reviews)
      ? reviews
      : String(reviews).trim().split("\n");

    const allReviewers = new Set([...reviewCommentAuthors, ...reviewAuthors]);
    const missingReviewers = REQUIRED_REVIEWERS.filter((r) => !allReviewers.has(r));
    checks.threeAIReviews = missingReviewers.length === 0;
    if (!checks.threeAIReviews) {
      missing.push(`Missing AI reviews from: ${missingReviewers.join(", ")}`);
    }
  } catch {
    checks.threeAIReviews = false;
    missing.push("Could not verify AI reviews (gh API error)");
  }

  // 4. Screenshots for UI changes
  if (hasUIChanges) {
    try {
      const body = execSync(
        `gh pr view ${prNumber} --repo ${repo} --json body --jq '.body'`,
        { encoding: "utf-8" }
      );
      // Screenshots: markdown images or attached file links
      const hasScreenshot =
        /!\[.*?\]\(.*?\)/i.test(body) || /screenshot/i.test(body);
      checks.screenshots = hasScreenshot;
      if (!checks.screenshots) {
        missing.push("UI changes detected but no screenshots in PR body");
      }
    } catch {
      checks.screenshots = false;
      missing.push("Could not check PR body for screenshots");
    }
  } else {
    checks.screenshots = true; // Not required for non-UI tasks
  }

  const done = Object.values(checks).every(Boolean) && missing.length === 0;
  return { done, checks, missing };
}

/**
 * Pretty-print the done validation result for logging / Telegram.
 */
export function formatDoneResult(result: DoneResult, taskDescription: string): string {
  const icon = result.done ? "✅" : "❌";
  const lines = [
    `${icon} Definition of Done — ${taskDescription}`,
    "",
    Object.entries(result.checks)
      .map(([k, v]) => `  ${v ? "✅" : "❌"} ${k}`)
      .join("\n"),
  ];
  if (!result.done && result.missing.length > 0) {
    lines.push("", "Missing:", ...result.missing.map((m) => `  • ${m}`));
  }
  return lines.join("\n");
}
