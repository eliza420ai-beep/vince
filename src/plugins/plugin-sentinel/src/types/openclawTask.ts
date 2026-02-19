/**
 * OpenClaw task brief schema — machine-consumable format for AI coding agents.
 * Coding agents (OpenClaw, Cursor, Claude Code) read from docs/standup/openclaw-queue/
 * and must create a branch + PR only; never push to main.
 *
 * Schema version: 1
 */

export type OpenClawTaskSource = "sentinel_ship" | "weekly" | "prd" | "suggest";

export interface OpenClawTask {
  /** Unique task id (e.g. openclaw-YYYYMMDD-XXXX) */
  id: string;
  /** Short title */
  title: string;
  /** What to do and why */
  description: string;
  /** What's in scope / out of scope */
  scope: string;
  /** Optional: paths or globs to touch */
  filesToChange?: string[];
  /** Checklist for done */
  acceptanceCriteria: string[];
  /** One sentence expected result */
  expectedOutcome: string;
  /** Where this task came from */
  source: OpenClawTaskSource;
  /** Optional: path to full PRD markdown if generated */
  prdPath?: string;
  /** Suggested branch name (e.g. sentinel/YYYY-MM-DD-short-slug) */
  branchName: string;
  /** ISO timestamp when created */
  createdAt: string;
  /** Optional: plugin or area (e.g. plugin-vince) */
  plugin?: string;
  /** Optional: P0 | P1 | P2 */
  priority?: string;
  /** Optional: XS | S | M | L | XL */
  effort?: string;
  /** Set by consumer when task is picked up; ISO timestamp */
  consumedAt?: string;
  /** Set by consumer when PR is opened */
  prUrl?: string;
}
