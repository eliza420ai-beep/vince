#!/usr/bin/env bun
/**
 * Ingest VINCE post-mortem markdown files into a machine-readable summary.
 *
 * Sources:
 *   - docs/standup/post-mortems/*.md (excluding README.md)
 *
 * Outputs (overwritten on each run):
 *   - .elizadb/vince-paper-bot/postmortems/postmortems.jsonl
 *       One JSON object per post-mortem:
 *       {
 *         date, asset, direction, closeReason, assetClass,
 *         qualityScore, qualityEscalate,
 *         primaryCause, secondaryCauses,
 *         ptqgComplete, pmevCompletenessPct, missingData,
 *         holdMinutes, adverseMovePct, file
 *       }
 *   - .elizadb/vince-paper-bot/postmortems/root_cause_stats.json
 *       Aggregated counts and averages by assetClass + primaryCause.
 *   - tasks/todo.md
 *       Rewrites the block between POST_MORTEM_CORRECTIVE_ACTIONS_START/END
 *       with auto-generated corrective-action todos for Vince.
 *   - tasks/lessons.md
 *       Rewrites the block between POST_MORTEM_LESSONS_START/END with
 *       aggregated lessons by root-cause tag.
 *   - knowledge/sentinel-docs/POST_MORTEM_LESSONS.md
 *       RAG-friendly summary of "What changes on next trade?" bullets.
 *
 * Usage:
 *   bun run scripts/ingest-postmortems.ts
 *   bun run scripts/ingest-postmortems.ts --dry-run   # compute, no file writes
 */

import * as fs from "fs";
import * as path from "path";

// -----------------------------
// Types
// -----------------------------

type PostMortemCause =
  | "thesis_invalid"
  | "regime_conflict"
  | "sizing_too_aggressive"
  | "stop_too_tight_for_vol"
  | "agent_lane_mismatch"
  | "missing_pretrade_data"
  | "execution_or_slippage"
  | "unknown_insufficient_evidence";

type PtqgAssetClass = "crypto" | "equity" | "commodity" | "other";

interface MachineSummaryJson {
  qualityScore: number;
  qualityEscalate: boolean;
  primaryCause: PostMortemCause;
  secondaryCauses: PostMortemCause[];
  ptqgComplete: boolean;
  pmevCompletenessPct: number;
  missingData: string[];
  holdMinutes: number;
  adverseMovePct: number;
}

interface PostMortemSummary extends MachineSummaryJson {
  date: string;
  asset: string;
  direction: "long" | "short";
  closeReason: string;
  assetClass: PtqgAssetClass;
  file: string;
}

interface CorrectiveAction {
  owner: string;
  dueWindow: string;
  type: "immediate" | "policy" | "experiment" | string;
  action: string;
  successMetric: string;
  rollbackCondition: string;
}

interface ParsedCorrectiveAction extends CorrectiveAction {
  primaryCause: PostMortemCause;
  assetClass: PtqgAssetClass;
  file: string;
}

interface GuardrailStatsEntry {
  count: number;
  avgQualityScore: number;
  avgAdverseMovePct: number;
  avgHoldMinutes: number;
}

type GuardrailStats = Record<
  PtqgAssetClass,
  Record<PostMortemCause, GuardrailStatsEntry>
>;

interface AggregatedCorrectiveAction {
  key: string;
  type: string;
  owner: string;
  primaryCause: PostMortemCause;
  assetClass: PtqgAssetClass;
  action: string;
  successMetric: string;
  rollbackCondition: string;
  count: number;
}

interface AggregatedWhatChangesEntry {
  text: string;
  primaryCause: PostMortemCause;
  assetClass: PtqgAssetClass;
  count: number;
}

// -----------------------------
// Helpers
// -----------------------------

const PROJECT_ROOT = path.resolve(import.meta.dir, "..");
const POSTMORTEM_DIR = path.join(
  PROJECT_ROOT,
  "docs",
  "standup",
  "post-mortems",
);
const OUT_DIR = path.join(
  PROJECT_ROOT,
  ".elizadb",
  "vince-paper-bot",
  "postmortems",
);
const POSTMORTEMS_JSONL = path.join(OUT_DIR, "postmortems.jsonl");
const ROOT_CAUSE_STATS_JSON = path.join(OUT_DIR, "root_cause_stats.json");
const TASKS_TODO_PATH = path.join(PROJECT_ROOT, "tasks", "todo.md");
const TASKS_LESSONS_PATH = path.join(PROJECT_ROOT, "tasks", "lessons.md");
const SENTINEL_KNOWLEDGE_PATH = path.join(
  PROJECT_ROOT,
  "knowledge",
  "sentinel-docs",
  "POST_MORTEM_LESSONS.md",
);

const TODO_MARKER_START = "<!-- POST_MORTEM_CORRECTIVE_ACTIONS_START -->";
const TODO_MARKER_END = "<!-- POST_MORTEM_CORRECTIVE_ACTIONS_END -->";
const LESSONS_MARKER_START = "<!-- POST_MORTEM_LESSONS_START -->";
const LESSONS_MARKER_END = "<!-- POST_MORTEM_LESSONS_END -->";

function inferAssetClass(asset: string): PtqgAssetClass {
  const upper = (asset || "").toUpperCase();
  const crypto = new Set([
    "BTC",
    "ETH",
    "SOL",
    "HYPE",
    "XRP",
    "DOGE",
    "ADA",
    "AVAX",
    "LINK",
  ]);
  const commodities = new Set(["GOLD", "SILVER", "OIL", "USOIL", "COPPER"]);
  if (crypto.has(upper)) return "crypto";
  if (commodities.has(upper)) return "commodity";
  if (/^[A-Z]{1,6}$/.test(upper)) return "equity";
  return "other";
}

function safeJsonParse<T>(text: string, file: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn(
      `[ingest-postmortems] Failed to parse JSON in ${file}: ${
        (e as Error).message
      }`,
    );
    return null;
  }
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// -----------------------------
// Parsers
// -----------------------------

function parsePostMortemFile(
  filePath: string,
): {
  summary: PostMortemSummary | null;
  correctiveActions: ParsedCorrectiveAction[];
  whatChanges: AggregatedWhatChangesEntry[];
} {
  const rel = path.relative(PROJECT_ROOT, filePath);
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/);

  // Header: "# Post-mortem: ASSET direction (closeReason)"
  const headerLine = lines.find((l) => l.startsWith("# Post-mortem:"));
  if (!headerLine) {
    console.warn(
      `[ingest-postmortems] Missing header in ${rel}, skipping structured summary.`,
    );
    return { summary: null, correctiveActions: [], whatChanges: [] };
  }

  const headerMatch =
    /# Post-mortem:\s+(.+?)\s+(long|short)\s+\(([^)]+)\)/i.exec(headerLine);
  if (!headerMatch) {
    console.warn(
      `[ingest-postmortems] Unrecognized header format in ${rel}: ${headerLine}`,
    );
    return { summary: null, correctiveActions: [], whatChanges: [] };
  }
  const asset = headerMatch[1].trim();
  const direction = headerMatch[2].toLowerCase() as "long" | "short";
  const closeReason = headerMatch[3].trim();

  // Date: "**Date:** 2026-02-27"
  const dateLine = lines.find((l) => l.startsWith("**Date:**"));
  const dateMatch = dateLine?.match(/\*\*Date:\*\*\s*(.+)/);
  const date = dateMatch ? dateMatch[1].trim() : "";

  // Machine-readable JSON block (under ```json ... ```)
  const jsonStartIdx = lines.findIndex((l) => l.trim() === "```json");
  const jsonEndIdx =
    jsonStartIdx >= 0
      ? lines.findIndex((l, idx) => idx > jsonStartIdx && l.trim() === "```")
      : -1;
  if (jsonStartIdx < 0 || jsonEndIdx < 0) {
    console.warn(
      `[ingest-postmortems] Missing JSON block in ${rel}, skipping structured summary.`,
    );
    return { summary: null, correctiveActions: [], whatChanges: [] };
  }
  const jsonText = lines
    .slice(jsonStartIdx + 1, jsonEndIdx)
    .join("\n")
    .trim();
  const machine = safeJsonParse<MachineSummaryJson>(jsonText, rel);
  if (!machine) {
    return { summary: null, correctiveActions: [], whatChanges: [] };
  }

  const assetClass = inferAssetClass(asset);

  const summary: PostMortemSummary = {
    ...machine,
    date,
    asset,
    direction,
    closeReason,
    assetClass,
    file: rel,
  };

  // Parse Corrective Actions
  const correctiveActions = parseCorrectiveActions(
    lines,
    summary,
    rel,
  ).map((c) => ({
    ...c,
    primaryCause: summary.primaryCause,
    assetClass: summary.assetClass,
    file: rel,
  }));

  // Parse "What changes on next trade?" bullets
  const whatChanges = parseWhatChanges(lines, summary).map((entry) => ({
    ...entry,
    file: rel,
  })) as AggregatedWhatChangesEntry[];

  return { summary, correctiveActions, whatChanges };
}

function parseCorrectiveActions(
  lines: string[],
  summary: PostMortemSummary,
  fileRel: string,
): CorrectiveAction[] {
  const out: CorrectiveAction[] = [];
  const startIdx = lines.findIndex((l) =>
    l.startsWith("## Corrective Actions"),
  );
  if (startIdx < 0) return out;

  let i = startIdx + 1;
  let current: CorrectiveAction | null = null;

  const commitCurrent = () => {
    if (
      current &&
      current.action &&
      current.owner &&
      current.type &&
      current.dueWindow
    ) {
      out.push(current);
    }
    current = null;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ") && !line.startsWith("## Corrective Actions")) {
      // Next section
      break;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }

    // Start of new action block
    const actionHeaderMatch =
      /^(\d+)\.\s+\[([^\]]+)\]\s+owner=([a-zA-Z_]+)\s+due=([^\s]+)\s*$/i.exec(
        trimmed,
      );
    if (actionHeaderMatch) {
      commitCurrent();
      const type = actionHeaderMatch[2].toLowerCase();
      const owner = actionHeaderMatch[3].toLowerCase();
      const dueWindow = actionHeaderMatch[4];
      current = {
        owner,
        dueWindow,
        type: type as CorrectiveAction["type"],
        action: "",
        successMetric: "",
        rollbackCondition: "",
      };
      i++;
      continue;
    }

    if (current && trimmed.startsWith("- action:")) {
      current.action = normalizeWhitespace(trimmed.replace("- action:", ""));
      i++;
      continue;
    }
    if (current && trimmed.startsWith("- success_metric:")) {
      current.successMetric = normalizeWhitespace(
        trimmed.replace("- success_metric:", ""),
      );
      i++;
      continue;
    }
    if (current && trimmed.startsWith("- rollback:")) {
      current.rollbackCondition = normalizeWhitespace(
        trimmed.replace("- rollback:", ""),
      );
      i++;
      continue;
    }

    i++;
  }

  commitCurrent();

  // Basic sanity filter
  if (out.length === 0) {
    console.warn(
      `[ingest-postmortems] No corrective actions parsed from ${fileRel} (primaryCause=${summary.primaryCause}).`,
    );
  }

  return out;
}

function parseWhatChanges(
  lines: string[],
  summary: PostMortemSummary,
): AggregatedWhatChangesEntry[] {
  const out: AggregatedWhatChangesEntry[] = [];
  const idx = lines.findIndex((l) =>
    l.startsWith("## What changes on next trade?"),
  );
  if (idx < 0) return out;

  let i = idx + 1;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ") && !line.startsWith("## What changes")) break;
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      const text = normalizeWhitespace(trimmed.replace(/^-+\s*/, ""));
      if (text) {
        out.push({
          text,
          primaryCause: summary.primaryCause,
          assetClass: summary.assetClass,
          count: 1,
        });
      }
    }
    i++;
  }
  return out;
}

// -----------------------------
// Aggregation + Writers
// -----------------------------

function aggregateGuardrailStats(
  summaries: PostMortemSummary[],
): GuardrailStats {
  const stats: GuardrailStats = {
    crypto: Object.create(null),
    equity: Object.create(null),
    commodity: Object.create(null),
    other: Object.create(null),
  };

  const accum: Record<
    PtqgAssetClass,
    Record<
      PostMortemCause,
      { count: number; sumQuality: number; sumAdverseMove: number; sumHold: number }
    >
  > = {
    crypto: Object.create(null),
    equity: Object.create(null),
    commodity: Object.create(null),
    other: Object.create(null),
  };

  for (const s of summaries) {
    const cls = s.assetClass;
    const cause = s.primaryCause;
    if (!accum[cls][cause]) {
      accum[cls][cause] = {
        count: 0,
        sumQuality: 0,
        sumAdverseMove: 0,
        sumHold: 0,
      };
    }
    const a = accum[cls][cause];
    a.count += 1;
    a.sumQuality += s.qualityScore;
    a.sumAdverseMove += s.adverseMovePct;
    a.sumHold += s.holdMinutes;
  }

  (Object.keys(accum) as PtqgAssetClass[]).forEach((cls) => {
    const byCause = accum[cls];
    const outForCls: Record<PostMortemCause, GuardrailStatsEntry> =
      Object.create(null);
    (Object.keys(byCause) as PostMortemCause[]).forEach((cause) => {
      const a = byCause[cause];
      if (!a || a.count === 0) return;
      outForCls[cause] = {
        count: a.count,
        avgQualityScore: Number((a.sumQuality / a.count).toFixed(2)),
        avgAdverseMovePct: Number(
          (a.sumAdverseMove / a.count).toFixed(3),
        ),
        avgHoldMinutes: Number((a.sumHold / a.count).toFixed(1)),
      };
    });
    stats[cls] = outForCls;
  });

  return stats;
}

function aggregateCorrectiveActions(
  actions: ParsedCorrectiveAction[],
): AggregatedCorrectiveAction[] {
  const map = new Map<string, AggregatedCorrectiveAction>();

  for (const a of actions) {
    const key = [
      a.owner,
      a.type,
      a.primaryCause,
      a.assetClass,
      normalizeWhitespace(a.action),
    ].join("|");
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        key,
        type: a.type,
        owner: a.owner,
        primaryCause: a.primaryCause,
        assetClass: a.assetClass,
        action: normalizeWhitespace(a.action),
        successMetric: normalizeWhitespace(a.successMetric),
        rollbackCondition: normalizeWhitespace(a.rollbackCondition),
        count: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function aggregateWhatChanges(
  entries: AggregatedWhatChangesEntry[],
): AggregatedWhatChangesEntry[] {
  const map = new Map<string, AggregatedWhatChangesEntry>();
  for (const e of entries) {
    const key = [
      e.primaryCause,
      e.assetClass,
      normalizeWhitespace(e.text),
    ].join("|");
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        text: normalizeWhitespace(e.text),
        primaryCause: e.primaryCause,
        assetClass: e.assetClass,
        count: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function ensureDir(p: string): void {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

function writeJsonl(
  filePath: string,
  records: PostMortemSummary[],
): void {
  const lines = records.map((r) => JSON.stringify(r));
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
}

function rewriteSection(
  content: string,
  startMarker: string,
  endMarker: string,
  newInner: string,
): string {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    console.warn(
      `[ingest-postmortems] Markers ${startMarker} / ${endMarker} not found; skipping update.`,
    );
    return content;
  }
  const before = content.slice(0, startIdx + startMarker.length);
  const after = content.slice(endIdx);
  return `${before}\n${newInner}\n${after}`;
}

function buildTodoSectionMarkdown(
  aggregated: AggregatedCorrectiveAction[],
): string {
  if (aggregated.length === 0) {
    return [
      "",
      "### Post-mortem corrective actions (auto-generated)",
      "",
      "_No corrective actions parsed from docs/standup/post-mortems yet._",
      "",
    ].join("\n");
  }

  const lines: string[] = [];
  lines.push("");
  lines.push("### Post-mortem corrective actions (auto-generated)");
  lines.push("");
  lines.push(
    "_Generated from docs/standup/post-mortems/*.md. Edit source post-mortems, then re-run `bun run scripts/ingest-postmortems.ts`._",
  );
  lines.push("");

  // Focus on Vince-owned actions (immediate + policy) first
  const sorted = aggregated.filter(
    (a) => a.owner === "vince" || a.owner === "sentinel",
  );
  const others = aggregated.filter(
    (a) => a.owner !== "vince" && a.owner !== "sentinel",
  );

  const render = (list: AggregatedCorrectiveAction[]) => {
    for (const a of list) {
      const label = `${a.type} · ${a.primaryCause} · ${a.assetClass}`;
      const countLabel = a.count > 1 ? ` (seen in ${a.count} post-mortems)` : "";
      lines.push(
        `- [ ] **${label}**: ${a.action}${countLabel}`,
      );
    }
  };

  render(sorted);
  if (others.length > 0) {
    lines.push("");
    lines.push(
      "#### Other agent-owned corrective actions (Echo/Oracle/Solus/human)",
    );
    lines.push("");
    render(others);
  }

  lines.push("");
  return lines.join("\n");
}

function buildLessonsSectionMarkdown(
  summaries: PostMortemSummary[],
  stats: GuardrailStats,
): string {
  const lines: string[] = [];
  lines.push("");
  lines.push("### Post-mortem lessons (auto-generated)");
  lines.push("");
  lines.push(
    "_Summarized from docs/standup/post-mortems/*.md. Edit source post-mortems, then re-run `bun run scripts/ingest-postmortems.ts`._",
  );
  lines.push("");

  // For each assetClass + primaryCause combo with at least 2 occurrences, emit a lesson bullet.
  (["crypto", "equity", "commodity", "other"] as PtqgAssetClass[]).forEach(
    (cls) => {
      const byCause = stats[cls];
      const causes = Object.keys(byCause) as PostMortemCause[];
      const relevant = causes
        .map((cause) => ({ cause, data: byCause[cause] }))
        .filter((c) => c.data && c.data.count >= 2);
      if (relevant.length === 0) return;

      lines.push(`- **${cls}**:`);
      for (const { cause, data } of relevant) {
        lines.push(
          `  - **${cause} (${data.count} losses)**: avg quality=${data.avgQualityScore.toFixed(
            1,
          )}, avg adverse move=${data.avgAdverseMovePct.toFixed(
            2,
          )}%, avg hold=${data.avgHoldMinutes.toFixed(
            1,
          )}m. Treat this combo as a guardrail review target.`,
        );
      }
      lines.push("");
    },
  );

  if (lines.length === 4) {
    // No lessons added beyond header
    lines.push("_No repeated root-cause patterns yet (need ≥2 occurrences)._");
    lines.push("");
  }

  return lines.join("\n");
}

function buildSentinelKnowledgeMarkdown(
  aggregatedWhatChanges: AggregatedWhatChangesEntry[],
): string {
  const lines: string[] = [];
  lines.push("# Post-mortem lessons (auto-generated)");
  lines.push("");
  lines.push(
    "Generated by `scripts/ingest-postmortems.ts` from `docs/standup/post-mortems/*.md`.",
  );
  lines.push(
    "Use this as Sentinel/VINCE RAG input when reasoning about guardrails and process changes.",
  );
  lines.push("");

  if (aggregatedWhatChanges.length === 0) {
    lines.push(
      "_No `What changes on next trade?` bullets found yet. Run more post-mortems first._",
    );
    lines.push("");
    return lines.join("\n");
  }

  lines.push("## Aggregated \"What changes on next trade?\"");
  lines.push("");

  for (const entry of aggregatedWhatChanges) {
    const meta = `${entry.assetClass} · ${entry.primaryCause}`;
    const countLabel =
      entry.count > 1 ? ` (seen in ${entry.count} post-mortems)` : "";
    lines.push(`- **${meta}**: ${entry.text}${countLabel}`);
  }

  lines.push("");
  return lines.join("\n");
}

// -----------------------------
// Main
// -----------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  if (!fs.existsSync(POSTMORTEM_DIR)) {
    console.error(
      `[ingest-postmortems] Post-mortem directory not found: ${POSTMORTEM_DIR}`,
    );
    process.exit(1);
  }

  const files = fs
    .readdirSync(POSTMORTEM_DIR)
    .filter(
      (f) =>
        f.endsWith("-post-mortem.md") &&
        !f.toLowerCase().includes("readme"),
    )
    .sort();

  if (files.length === 0) {
    console.error(
      `[ingest-postmortems] No post-mortem files found in ${POSTMORTEM_DIR}`,
    );
    process.exit(1);
  }

  const summaries: PostMortemSummary[] = [];
  const allActions: ParsedCorrectiveAction[] = [];
  const allWhatChanges: AggregatedWhatChangesEntry[] = [];

  for (const name of files) {
    const fp = path.join(POSTMORTEM_DIR, name);
    const { summary, correctiveActions, whatChanges } =
      parsePostMortemFile(fp);
    if (summary) summaries.push(summary);
    allActions.push(
      ...correctiveActions.map((a) => ({
        ...a,
        file: path.relative(PROJECT_ROOT, fp),
      })),
    );
    allWhatChanges.push(...whatChanges);
  }

  if (summaries.length === 0) {
    console.error(
      "[ingest-postmortems] Parsed 0 structured post-mortems; aborting.",
    );
    process.exit(1);
  }

  const guardrailStats = aggregateGuardrailStats(summaries);
  const aggregatedActions = aggregateCorrectiveActions(allActions);
  const aggregatedWhatChanges = aggregateWhatChanges(allWhatChanges);

  console.log(
    `[ingest-postmortems] Parsed ${summaries.length} post-mortems, ${allActions.length} corrective actions (${aggregatedActions.length} unique), ${aggregatedWhatChanges.length} unique "What changes" bullets.`,
  );

  if (dryRun) {
    console.log(
      "[ingest-postmortems] --dry-run: not writing JSONL, tasks, or knowledge files.",
    );
    return;
  }

  // Ensure output dir
  ensureDir(OUT_DIR);

  // 1) Write JSONL
  writeJsonl(POSTMORTEMS_JSONL, summaries);
  fs.writeFileSync(
    ROOT_CAUSE_STATS_JSON,
    JSON.stringify(guardrailStats, null, 2),
    "utf-8",
  );
  console.log(
    `[ingest-postmortems] Wrote ${POSTMORTEMS_JSONL} and ${ROOT_CAUSE_STATS_JSON}`,
  );

  // 2) Update tasks/todo.md
  if (fs.existsSync(TASKS_TODO_PATH)) {
    const todoContent = fs.readFileSync(TASKS_TODO_PATH, "utf-8");
    const todoInner = buildTodoSectionMarkdown(aggregatedActions);
    const updated = rewriteSection(
      todoContent,
      TODO_MARKER_START,
      TODO_MARKER_END,
      todoInner,
    );
    if (updated !== todoContent) {
      fs.writeFileSync(TASKS_TODO_PATH, updated, "utf-8");
      console.log(
        `[ingest-postmortems] Updated post-mortem corrective actions section in ${path.relative(
          PROJECT_ROOT,
          TASKS_TODO_PATH,
        )}`,
      );
    }
  } else {
    console.warn(
      `[ingest-postmortems] tasks/todo.md not found at ${TASKS_TODO_PATH}; skipping todo update.`,
    );
  }

  // 3) Update tasks/lessons.md
  if (fs.existsSync(TASKS_LESSONS_PATH)) {
    const lessonsContent = fs.readFileSync(TASKS_LESSONS_PATH, "utf-8");
    const lessonsInner = buildLessonsSectionMarkdown(
      summaries,
      guardrailStats,
    );
    const updated = rewriteSection(
      lessonsContent,
      LESSONS_MARKER_START,
      LESSONS_MARKER_END,
      lessonsInner,
    );
    if (updated !== lessonsContent) {
      fs.writeFileSync(TASKS_LESSONS_PATH, updated, "utf-8");
      console.log(
        `[ingest-postmortems] Updated post-mortem lessons section in ${path.relative(
          PROJECT_ROOT,
          TASKS_LESSONS_PATH,
        )}`,
      );
    }
  } else {
    console.warn(
      `[ingest-postmortems] tasks/lessons.md not found at ${TASKS_LESSONS_PATH}; skipping lessons update.`,
    );
  }

  // 4) Sentinel RAG knowledge doc
  ensureDir(path.dirname(SENTINEL_KNOWLEDGE_PATH));
  const sentinelMd = buildSentinelKnowledgeMarkdown(aggregatedWhatChanges);
  fs.writeFileSync(SENTINEL_KNOWLEDGE_PATH, sentinelMd, "utf-8");
  console.log(
    `[ingest-postmortems] Wrote Sentinel knowledge doc ${path.relative(
      PROJECT_ROOT,
      SENTINEL_KNOWLEDGE_PATH,
    )}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

