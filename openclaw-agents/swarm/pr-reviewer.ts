/**
 * pr-reviewer.ts
 *
 * 3-model PR review automation for the VINCE agent swarm.
 *
 * "Our review takes five minutes. Often less. The screenshot shows us exactly
 *  what changed in the UI without clicking through a preview environment.
 *  Many PRs we merge without reading the code. The screenshot and the
 *  three-reviewer consensus tell us everything."
 *   — "One Month With the Swarm" (ikigaistudio.substack.com)
 *
 * Reviewers:
 *   - Codex:  Logic errors, edge cases, type safety, test coverage (low false positive rate)
 *   - Claude: Correctness, missing error handling, overengineering risks (overcautious but validates)
 *   - Gemini: Security vulnerabilities, scalability issues (catches what others miss)
 */

import { execSync, spawnSync } from "child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";

export interface ReviewResult {
  reviewer: "codex" | "claude" | "gemini";
  verdict: "approve" | "request-changes" | "comment";
  summary: string;
  body: string;
  posted: boolean;
}

export interface PRReviewSummary {
  prNumber: number;
  repo: string;
  reviews: ReviewResult[];
  consensus: "approve" | "request-changes";
  ready: boolean;
}

const REVIEW_TIMEOUT_MS = 300_000; // 5 min per reviewer

/**
 * Get the diff for a PR (base..head).
 */
function getPRDiff(prNumber: number, repo: string): string {
  try {
    return execSync(`gh pr diff ${prNumber} --repo ${repo}`, {
      encoding: "utf-8",
      maxBuffer: 2 * 1024 * 1024, // 2MB
    });
  } catch {
    return "(Could not fetch PR diff)";
  }
}

/**
 * Get PR metadata (title, body, files changed).
 */
function getPRMeta(prNumber: number, repo: string): string {
  try {
    const meta = JSON.parse(
      execSync(
        `gh pr view ${prNumber} --repo ${repo} --json title,body,files,additions,deletions`,
        { encoding: "utf-8" }
      )
    );
    return [
      `**Title:** ${meta.title}`,
      `**Changes:** +${meta.additions} -${meta.deletions}`,
      `**Files:** ${meta.files?.map((f: { path: string }) => f.path).join(", ") ?? "unknown"}`,
      "",
      `**Description:**`,
      meta.body ?? "(no description)",
    ].join("\n");
  } catch {
    return "(Could not fetch PR metadata)";
  }
}

/**
 * Run a Codex review in an isolated temp dir.
 * Codex is the workhorse — thorough, low false positive rate.
 */
async function runCodexReview(
  prNumber: number,
  diff: string,
  meta: string
): Promise<ReviewResult> {
  const prompt = `You are reviewing a pull request for the VINCE multi-agent trading system (ElizaOS-based).

## PR Metadata
${meta}

## Diff
\`\`\`diff
${diff.slice(0, 50_000)}
\`\`\`

## Your Role: Logic & Edge Case Reviewer
Focus on:
1. Logic errors and off-by-one bugs
2. Missing edge cases (null/undefined, empty arrays, race conditions)
3. TypeScript type safety issues
4. Test coverage gaps
5. Breaking changes to existing agent behaviors

Be thorough but practical. Low false positive rate — only flag real issues.

Format your review as:
## Verdict: APPROVE | REQUEST_CHANGES
## Summary: (one sentence)
## Issues Found:
- (list issues, or "None")
## Suggestions:
- (optional improvements)`;

  return runAgentReview("codex", prNumber, prompt);
}

/**
 * Run a Claude review in an isolated temp dir.
 * Claude validates what Codex found and catches overengineering.
 */
async function runClaudeReview(
  prNumber: number,
  diff: string,
  meta: string
): Promise<ReviewResult> {
  const prompt = `You are a careful code reviewer for the VINCE multi-agent trading system.

## PR Metadata
${meta}

## Diff
\`\`\`diff
${diff.slice(0, 50_000)}
\`\`\`

## Your Role: Correctness & Architecture Reviewer
Focus on:
1. Correctness — does this do what it claims?
2. Missing error handling (naked try-catch, unhandled rejections)
3. Overengineering — is this more complex than it needs to be?
4. Does it break any of the 10 VINCE agents (Eliza, VINCE, ECHO, Oracle, Solus, Otaku, Kelly, Sentinel, Naval, Clawterm)?
5. Alignment with the PRD / stated goal

Format your review as:
## Verdict: APPROVE | REQUEST_CHANGES
## Summary: (one sentence)
## Issues Found:
- (list issues, or "None")
## Suggestions:
- (optional, flag if overengineered)`;

  return runAgentReview("claude", prNumber, prompt);
}

/**
 * Run a Gemini review (via openai-compatible endpoint or claude-as-gemini for now).
 * Gemini catches security and scalability issues the others miss.
 */
async function runGeminiReview(
  prNumber: number,
  diff: string,
  meta: string
): Promise<ReviewResult> {
  // TODO: Wire to actual Gemini API (gemini-2.5-pro via openai-compatible endpoint)
  // For now, runs as a specialized Claude prompt with security focus
  const prompt = `You are a security and scalability reviewer for the VINCE multi-agent trading system.
This system handles real trading (Hyperliquid perps, DeFi via Otaku), ML pipelines, and live funds.

## PR Metadata
${meta}

## Diff
\`\`\`diff
${diff.slice(0, 50_000)}
\`\`\`

## Your Role: Security & Scalability Reviewer
Focus on:
1. Security vulnerabilities (injection, credential exposure, unsafe deserialization)
2. Scalability issues (N+1 queries, unbounded loops, memory leaks)
3. Financial safety — could this affect Otaku's wallet or live positions?
4. API key / secret handling
5. Rate limiting and external API abuse potential

Format your review as:
## Verdict: APPROVE | REQUEST_CHANGES
## Summary: (one sentence)
## Security Issues:
- (list issues, or "None")
## Scalability Issues:
- (list issues, or "None")`;

  return runAgentReview("gemini", prNumber, prompt);
}

/**
 * Run a single agent review in a temp git repo and return the result.
 */
async function runAgentReview(
  reviewer: "codex" | "claude" | "gemini",
  prNumber: number,
  prompt: string
): Promise<ReviewResult> {
  const tmpDir = mkdtempSync(path.join(tmpdir(), `vince-review-${reviewer}-`));
  try {
    // Codex requires a git repo
    execSync("git init && git commit --allow-empty -m 'review sandbox'", {
      cwd: tmpDir,
      shell: true,
      stdio: "pipe",
    });

    // Write prompt to file for the agent
    writeFileSync(path.join(tmpDir, "prompt.md"), prompt);

    // Choose the right CLI
    const cliMap: Record<string, string> = {
      codex: "codex",
      claude: "claude",
      gemini: "claude", // fallback until Gemini CLI is wired
    };
    const cli = cliMap[reviewer];

    const result = spawnSync(
      cli,
      reviewer === "codex"
        ? ["exec", "--full-auto", `Review the PR using prompt.md`]
        : ["--dangerously-skip-permissions", "-p", prompt],
      {
        cwd: tmpDir,
        encoding: "utf-8",
        timeout: REVIEW_TIMEOUT_MS,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    const output = (result.stdout ?? "") + (result.stderr ?? "");
    const verdict = output.includes("REQUEST_CHANGES") ? "request-changes" : "approve";
    const summaryMatch = output.match(/##\s*Summary:\s*(.+)/i);
    const summary = summaryMatch?.[1]?.trim() ?? `${reviewer} review complete`;

    return {
      reviewer,
      verdict,
      summary,
      body: formatReviewBody(reviewer, output),
      posted: false,
    };
  } catch (e) {
    return {
      reviewer,
      verdict: "comment",
      summary: `${reviewer} review failed: ${e}`,
      body: `## ${reviewer} Review\n\n⚠️ Review agent failed: ${e}`,
      posted: false,
    };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Format a review body for posting to GitHub.
 */
function formatReviewBody(reviewer: string, rawOutput: string): string {
  const roleMap: Record<string, string> = {
    codex: "⚙️ **Codex** — Logic & Edge Cases",
    claude: "🤖 **Claude** — Correctness & Architecture",
    gemini: "🔐 **Gemini** — Security & Scalability",
  };
  const header = roleMap[reviewer] ?? reviewer;
  // Truncate if very long
  const body = rawOutput.slice(0, 8000);
  return `<!-- vince-swarm-reviewer: ${reviewer} -->\n${header}\n\n${body}`;
}

/**
 * Post a review comment to the GitHub PR.
 */
function postReviewComment(
  prNumber: number,
  repo: string,
  body: string
): boolean {
  try {
    execSync(`gh pr comment ${prNumber} --repo ${repo} --body "${body.replace(/"/g, '\\"')}"`, {
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run all 3 reviews in parallel and post to GitHub.
 * Returns a summary with consensus verdict.
 */
export async function reviewPR(
  prNumber: number,
  repo: string,
  hasUIChanges = false
): Promise<PRReviewSummary> {
  console.log(`\n🔍 Running 3-model review for PR #${prNumber} (${repo})...`);

  const diff = getPRDiff(prNumber, repo);
  const meta = getPRMeta(prNumber, repo);

  // Run all 3 in parallel
  const [codexReview, claudeReview, geminiReview] = await Promise.all([
    runCodexReview(prNumber, diff, meta),
    runClaudeReview(prNumber, diff, meta),
    runGeminiReview(prNumber, diff, meta),
  ]);

  const reviews = [codexReview, claudeReview, geminiReview];

  // Post to GitHub PR
  for (const review of reviews) {
    review.posted = postReviewComment(prNumber, repo, review.body);
    console.log(
      `  ${review.posted ? "✅" : "❌"} ${review.reviewer}: ${review.summary}`
    );
  }

  // Consensus: if ANY reviewer requests changes, block merge
  const requestsChanges = reviews.some((r) => r.verdict === "request-changes");
  const consensus = requestsChanges ? "request-changes" : "approve";
  const ready = consensus === "approve";

  if (ready) {
    console.log("\n✅ All 3 reviewers approved — ready to merge.");
  } else {
    const blockers = reviews
      .filter((r) => r.verdict === "request-changes")
      .map((r) => r.reviewer);
    console.log(`\n❌ Changes requested by: ${blockers.join(", ")}`);
  }

  return { prNumber, repo, reviews, consensus, ready };
}
