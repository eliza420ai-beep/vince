#!/usr/bin/env bun
/**
 * Sync standup deliverables into the vault: latest day report + predictions accuracy
 * → vault/06-meetings/standup-YYYY-MM-DD.md and vault/03-resources/standup-accuracy-log.md.
 *
 * Usage:
 *   bun run scripts/sync-standup-to-vault.ts
 *   bun run vault:standup
 *   bun run scripts/sync-standup-to-vault.ts --date=2025-02-14
 *
 * Env: STANDUP_DELIVERABLES_DIR (default standup-deliverables), VAULT_DIR (default vault).
 * Idempotent: overwrites same-date meeting note; appends to accuracy log. Does not fail on
 * missing day report or predictions—writes what's available and logs warnings.
 *
 * Optional cron example (run after standup, e.g. 10:00 UTC if standup at 09:00):
 *   0 10 * * * cd /path/to/vince && bun run vault:standup
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const STANDUP_DELIVERABLES_DIR = process.env.STANDUP_DELIVERABLES_DIR?.trim() || "standup-deliverables";
const VAULT_DIR = process.env.VAULT_DIR?.trim() || "vault";
const LAST_N = 10;

function resolveDeliverablesDir(cwd: string): string {
  const dir = path.isAbsolute(STANDUP_DELIVERABLES_DIR)
    ? STANDUP_DELIVERABLES_DIR
    : path.join(cwd, STANDUP_DELIVERABLES_DIR);
  return dir;
}

function resolveVaultDir(cwd: string): string {
  const dir = path.isAbsolute(VAULT_DIR) ? VAULT_DIR : path.join(cwd, VAULT_DIR);
  return dir;
}

function parseArgs(): { date: string | null } {
  const arg = process.argv.find((a) => a.startsWith("--date="));
  if (!arg) return { date: null };
  const date = arg.slice("--date=".length).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return { date };
  return { date: null };
}

interface Prediction {
  outcome?: "correct" | "incorrect";
  asset?: string;
  direction?: string;
  strike?: number;
  expiryDate?: string;
  actualPrice?: number;
}

function getAccuracyStats(
  predictions: Prediction[],
  lastN: number
): { total: number; correct: number; incorrect: number; accuracyPct: number; lastMiss: string | null } {
  const withOutcome = predictions.filter((p) => p.outcome != null);
  const last = withOutcome.slice(-lastN);
  const correct = last.filter((p) => p.outcome === "correct").length;
  const incorrect = last.filter((p) => p.outcome === "incorrect").length;
  const total = last.length;
  const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const lastIncorrect = [...withOutcome].reverse().find((p) => p.outcome === "incorrect");
  const lastMiss =
    lastIncorrect != null && lastIncorrect.actualPrice != null
      ? `${lastIncorrect.asset ?? "?"} ${lastIncorrect.direction ?? "?"} $${lastIncorrect.strike ?? "?"} on ${(lastIncorrect.expiryDate ?? "").slice(0, 10)} — was $${lastIncorrect.actualPrice}`
      : null;
  return { total, correct, incorrect, accuracyPct, lastMiss };
}

async function loadPredictions(deliverablesDir: string): Promise<Prediction[]> {
  const filepath = path.join(deliverablesDir, "predictions.json");
  try {
    const raw = await fs.readFile(filepath, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return [];
    console.warn("sync-standup-to-vault: Failed to load predictions.json:", (e as Error).message);
    return [];
  }
}

async function findLatestDayReport(
  deliverablesDir: string,
  explicitDate: string | null
): Promise<{ date: string; filepath: string; content: string } | null> {
  const dayReportsDir = path.join(deliverablesDir, "day-reports");
  if (explicitDate) {
    const name = `${explicitDate}-day-report.md`;
    const filepath = path.join(dayReportsDir, name);
    try {
      const content = await fs.readFile(filepath, "utf-8");
      return { date: explicitDate, filepath, content };
    } catch {
      console.warn(`sync-standup-to-vault: No day report for ${explicitDate} at ${filepath}`);
      return null;
    }
  }
  let entries: { name: string; path: string }[];
  try {
    entries = (await fs.readdir(dayReportsDir, { withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.endsWith(".md") && e.name.includes("-day-report"))
      .map((e) => ({ name: e.name, path: path.join(dayReportsDir, e.name) }));
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") {
      console.warn("sync-standup-to-vault: No day-reports directory at", dayReportsDir);
      return null;
    }
    throw e;
  }
  if (entries.length === 0) {
    console.warn("sync-standup-to-vault: No day report files in", dayReportsDir);
    return null;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const latest = entries[entries.length - 1];
  const match = latest.name.match(/^(\d{4}-\d{2}-\d{2})-/);
  const date = match ? match[1] : latest.name.replace("-day-report.md", "").slice(0, 10);
  const content = await fs.readFile(latest.path, "utf-8");
  return { date, filepath: latest.path, content };
}

function extractTldr(content: string): string {
  const tldrMatch = content.match(/(?:^|\n)\s*###\s+TL;DR\s*\n([\s\S]*?)(?=\n###|\n##|\n#|$)/i);
  if (tldrMatch) return tldrMatch[1].trim();
  return "";
}

function extractSolusCallOneLiner(content: string): string {
  const solusSection = content.match(/(?:^|\n)\s*###\s+Solus\s+call\s*\n([\s\S]*?)(?=\n###|\n##|\n#|$)/i)
    || content.match(/(?:^|\n)\s*##?\s*Solus[^\n]*\n([\s\S]*?)(?=\n###|\n##|\n#|$)/i);
  if (solusSection) {
    const firstLine = solusSection[1].split("\n")[0].trim();
    return firstLine || "";
  }
  return "";
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const deliverablesDir = resolveDeliverablesDir(cwd);
  const vaultDir = resolveVaultDir(cwd);
  const { date: explicitDate } = parseArgs();

  const dayReport = await findLatestDayReport(deliverablesDir, explicitDate);
  const predictions = await loadPredictions(deliverablesDir);
  const stats = getAccuracyStats(predictions, LAST_N);

  const date = dayReport?.date ?? (explicitDate || new Date().toISOString().slice(0, 10));
  const relativeDayReportPath = dayReport
    ? path.relative(cwd, dayReport.filepath)
    : "standup-deliverables/day-reports/";
  const tldr = dayReport ? extractTldr(dayReport.content) : "";
  const solusCall = dayReport ? extractSolusCallOneLiner(dayReport.content) : "";

  let accuracySnippet: string;
  if (stats.total === 0) {
    accuracySnippet = "No validated predictions yet.";
  } else {
    accuracySnippet = `Last ${stats.total}: ${stats.correct}/${stats.total} correct (${stats.accuracyPct}%).`;
    if (stats.lastMiss) accuracySnippet += ` Last miss: ${stats.lastMiss}`;
  }

  const meetingPath = path.join(vaultDir, "06-meetings", `standup-${date}.md`);
  const meetingContent = [
    `# Standup ${date}`,
    "",
    `- **Day report:** \`${relativeDayReportPath}\``,
    "",
    "## TL;DR",
    tldr || "_No TL;DR (no day report or section not found)._",
    "",
    "## Solus call",
    solusCall || "_Not found._",
    "",
    "## Accuracy",
    accuracySnippet,
    "",
  ].join("\n");

  await fs.mkdir(path.dirname(meetingPath), { recursive: true });
  await fs.writeFile(meetingPath, meetingContent, "utf-8");
  console.log("sync-standup-to-vault: Wrote", meetingPath);

  const logPath = path.join(vaultDir, "03-resources", "standup-accuracy-log.md");
  const logLine = `${date} | ${stats.correct}/${stats.total} correct | ${stats.accuracyPct}%\n`;
  try {
    await fs.appendFile(logPath, logLine, "utf-8");
    console.log("sync-standup-to-vault: Appended to", logPath);
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") {
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.writeFile(logPath, `# Standup accuracy log\n\n${logLine}`, "utf-8");
      console.log("sync-standup-to-vault: Created", logPath);
    } else {
      console.warn("sync-standup-to-vault: Failed to append accuracy log:", (e as Error).message);
    }
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("sync-standup-to-vault:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
);
