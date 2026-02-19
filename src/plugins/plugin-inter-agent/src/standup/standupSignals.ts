/**
 * Standup Signals — Contract for paper bot aggregator
 *
 * After the Day Report is saved, we write a minimal signals file so the paper
 * trading bot can consume standup/Solus as a first-class signal source.
 * Location: docs/standup/signals/YYYY-MM-DD-signals.json (or STANDUP_DELIVERABLES_DIR/signals).
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { logger } from "@elizaos/core";

/** One signal from standup (e.g. Solus call or extracted from report). */
export interface StandupSignalEntry {
  asset: string;
  direction: "long" | "short" | "neutral";
  confidence_pct?: number;
  source: "standup" | "solus";
  raw?: string;
}

/** File shape written for the paper bot. */
export interface StandupSignalsFile {
  date: string;
  signals: StandupSignalEntry[];
}

function getDeliverablesDir(): string {
  const envDir = process.env.STANDUP_DELIVERABLES_DIR?.trim();
  if (envDir) {
    return path.isAbsolute(envDir) ? envDir : path.join(process.cwd(), envDir);
  }
  return path.join(process.cwd(), "docs", "standup");
}

export function getSignalsDir(): string {
  return path.join(getDeliverablesDir(), "signals");
}

export function getSignalsPath(date?: Date): string {
  const d = date ?? new Date();
  const dateStr = d.toISOString().slice(0, 10);
  return path.join(getSignalsDir(), `${dateStr}-signals.json`);
}

/**
 * Parse Day Report content for "Solus's call: [X] — Y" line.
 * X may be "Above", "Below", "Uncertain", or "ASSET/Above" etc.
 * Returns at most one Solus signal when present.
 */
export function parseSignalsFromDayReportContent(
  reportText: string,
): StandupSignalEntry[] {
  const signals: StandupSignalEntry[] = [];
  const match = reportText.match(
    /\*\*Solus'?s call:?\*\*\s*\[?([^\]\n]*)\]?\s*[—\-]\s*([^\n*]+)/i,
  );
  if (!match) return signals;
  const bracketPart = (match[1] ?? "").trim();
  const raw = (match[2] ?? "").trim().slice(0, 200);
  let asset = "BTC";
  let direction: "long" | "short" | "neutral" = "neutral";
  if (bracketPart.includes("/")) {
    const [a, d] = bracketPart.split("/").map((s) => s.trim());
    if (a) asset = a.toUpperCase();
    const dir = (d ?? "").toLowerCase();
    if (dir === "above") direction = "long";
    else if (dir === "below") direction = "short";
  } else {
    const d = bracketPart.toLowerCase();
    if (d === "above") direction = "long";
    else if (d === "below") direction = "short";
  }
  signals.push({
    asset,
    direction,
    confidence_pct: 50,
    source: "solus",
    raw,
  });
  return signals;
}

/**
 * Write standup signals to disk for the paper bot.
 * Call after saving the Day Report when signals are available.
 */
export async function writeStandupSignalsFile(
  signals: StandupSignalEntry[],
  date?: Date,
): Promise<string | null> {
  if (signals.length === 0) return null;
  try {
    const dir = getSignalsDir();
    await fs.mkdir(dir, { recursive: true });
    const dateStr = (date ?? new Date()).toISOString().slice(0, 10);
    const filepath = getSignalsPath(date ?? undefined);
    const payload: StandupSignalsFile = { date: dateStr, signals };
    await fs.writeFile(filepath, JSON.stringify(payload, null, 2), "utf-8");
    logger.info(
      `[StandupSignals] Wrote ${signals.length} signal(s) to ${filepath}`,
    );
    return filepath;
  } catch (err) {
    logger.warn({ err }, "[StandupSignals] Failed to write signals file");
    return null;
  }
}

/**
 * Load today's standup signals file (for the paper bot aggregator).
 * Returns null when file missing or invalid.
 */
export async function loadStandupSignalsFile(
  date?: Date,
): Promise<StandupSignalsFile | null> {
  try {
    const filepath = getSignalsPath(date);
    const raw = await fs.readFile(filepath, "utf-8");
    const data = JSON.parse(raw) as StandupSignalsFile;
    if (!data || !Array.isArray(data.signals)) return null;
    return data;
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    return null;
  }
}
