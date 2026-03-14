#!/usr/bin/env bun

import * as fs from "node:fs";
import * as path from "node:path";

type LedgerRow = {
  command?: string;
  jobId?: string;
  acceptedAt?: string;
  finalStatus?: string;
  resultHash?: string;
  baseUrl?: string;
  agentName?: string;
  agentId?: string;
  updatedAt?: string;
  error?: string;
  rejectReasons?: string;
};

const LEDGER_PATH = path.join(process.cwd(), ".elizadb", "forge", "jobs.jsonl");
const DEFAULT_LIMIT = 20;

function parseLimit(argv: string[]): number {
  const args = [...argv];
  let limit = DEFAULT_LIMIT;
  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if ((token === "--limit" || token === "-n") && args[i + 1]) {
      const parsed = Number.parseInt(args[++i], 10);
      if (Number.isFinite(parsed) && parsed > 0) limit = parsed;
    } else if (token.startsWith("--limit=")) {
      const parsed = Number.parseInt(token.split("=")[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) limit = parsed;
    }
  }
  return limit;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function readRows(limit: number): LedgerRow[] {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  const raw = fs.readFileSync(LEDGER_PATH, "utf-8").trim();
  if (!raw) return [];
  const lines = raw.split("\n").filter(Boolean);
  const tail = lines.slice(-limit);
  const out: LedgerRow[] = [];
  for (const line of tail) {
    try {
      out.push(JSON.parse(line) as LedgerRow);
    } catch {
      out.push({ finalStatus: "parse_error", error: "invalid json line" });
    }
  }
  return out;
}

function formatTime(iso?: string): string {
  if (!iso) return "-";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return iso;
  return t.toISOString().replace("T", " ").slice(0, 19);
}

function pad(value: string, width: number): string {
  if (value.length >= width) return value;
  return value + " ".repeat(width - value.length);
}

function render(rows: LedgerRow[]): void {
  if (rows.length === 0) {
    console.log(`[forge-jobs-tail] no rows found at ${LEDGER_PATH}`);
    return;
  }

  const header = [
    pad("acceptedAt", 19),
    pad("status", 10),
    pad("jobId", 36),
    pad("resultHash", 16),
    "command",
    pad("rejectReasons", 40),
  ].join(" | ");
  const sep = "-".repeat(header.length);
  console.log(header);
  console.log(sep);

  for (const r of rows) {
    const line = [
      pad(formatTime(r.acceptedAt), 19),
      pad(truncate(r.finalStatus ?? "-", 10), 10),
      pad(truncate(r.jobId ?? "-", 36), 36),
      pad(truncate(r.resultHash ?? "-", 16), 16),
      truncate(r.command ?? "-", 50),
      truncate(r.rejectReasons ?? "-", 40),
    ].join(" | ");
    console.log(line);
    if (r.error) {
      console.log(`  error: ${truncate(r.error, 140)}`);
    }
  }

  console.log(
    `\n[forge-jobs-tail] showing ${rows.length} row(s) from ${LEDGER_PATH}`,
  );
}

function main(): void {
  const limit = parseLimit(process.argv.slice(2));
  const rows = readRows(limit);
  render(rows);
}

main();

