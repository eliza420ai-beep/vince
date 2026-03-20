/**
 * X bookmarks pipeline → paper bot overlay
 *
 * Ingests finance `.meta.json` artifacts into append-only JSONL read by
 * VinceSignalAggregator (source: XBookmarks). Queue lives under
 * data/x-bookmarks-pipeline/ (gitignored) by default.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { logger } from "@elizaos/core";
import { normalizeWttTicker } from "../constants/targetAssets";

export const X_BOOKMARK_PAPER_SCHEMA_VERSION = 1 as const;

export interface XBookmarkPaperSignalLine {
  schemaVersion: typeof X_BOOKMARK_PAPER_SCHEMA_VERSION;
  tweet_id: string;
  asset: string;
  direction: "long" | "short";
  strength: number;
  confidence: number;
  rationale: string;
  tweet_url?: string;
  validation_passed?: boolean;
  classification_confidence?: number;
  ingestedAt: string;
  /** Relative to repo root when possible */
  source_meta_path?: string;
}

function defaultQueuePath(cwd: string): string {
  const env = process.env.X_BOOKMARKS_PAPER_QUEUE_PATH?.trim();
  if (env) return path.isAbsolute(env) ? env : path.join(cwd, env);
  return path.join(cwd, "data", "x-bookmarks-pipeline", "paper-signals.jsonl");
}

/** Strip common perp suffixes before WTT normalization. */
export function stripPipelineTickerSymbol(raw: string): string {
  let u = raw.trim().toUpperCase();
  u = u.replace(/-PERP$/i, "").replace(/PERP$/i, "");
  u = u.replace(/USDT$/i, "").replace(/USDC$/i, "").replace(/USD$/i, "");
  return u.trim();
}

export function parseBookmarkDirection(
  raw: string | undefined,
): "long" | "short" | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (t === "long" || t === "buy" || t === "bullish" || t === "bull")
    return "long";
  if (t === "short" || t === "sell" || t === "bearish" || t === "bear")
    return "short";
  return null;
}

function scoreFromMeta(m: Record<string, unknown>): {
  strength: number;
  confidence: number;
} {
  const validated = m.validation_passed === true;
  const clsConf = typeof m.confidence === "number" ? m.confidence : undefined;
  let scale = 1;
  if (clsConf != null && clsConf > 0) {
    if (clsConf <= 1) scale = 0.88 + clsConf * 0.12;
    else if (clsConf <= 100)
      scale = Math.min(1.08, 0.88 + (clsConf / 100) * 0.2);
  }
  const baseS = validated ? 58 : 50;
  const baseC = validated ? 56 : 47;
  return {
    strength: Math.round(Math.min(72, baseS * scale)),
    confidence: Math.round(Math.min(70, baseC * scale)),
  };
}

async function collectMetaJsonFiles(dir: string, acc: string[] = []) {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const name = String(e.name);
    const p = path.join(dir, name);
    if (e.isDirectory()) await collectMetaJsonFiles(p, acc);
    else if (name.endsWith(".meta.json")) acc.push(p);
  }
  return acc;
}

function lineToRecord(line: string): XBookmarkPaperSignalLine | null {
  const t = line.trim();
  if (!t) return null;
  try {
    const o = JSON.parse(t) as XBookmarkPaperSignalLine;
    if (o.schemaVersion !== X_BOOKMARK_PAPER_SCHEMA_VERSION) return null;
    if (!o.tweet_id || !o.asset || !o.direction) return null;
    return o;
  } catch {
    return null;
  }
}

export async function loadExistingTweetIds(
  queuePath: string,
): Promise<Set<string>> {
  const ids = new Set<string>();
  try {
    const raw = await fs.readFile(queuePath, "utf-8");
    for (const line of raw.split("\n")) {
      const rec = lineToRecord(line);
      if (rec) ids.add(rec.tweet_id);
    }
  } catch {
    /* missing */
  }
  return ids;
}

/**
 * Scan pipeline output dir; append new finance rows to the paper queue.
 */
export async function ingestPipelineOutputToPaperQueue(options: {
  cwd: string;
  outputDir: string;
  queuePath?: string;
}): Promise<{ appended: number; skipped: number }> {
  const queuePath = options.queuePath ?? defaultQueuePath(options.cwd);
  await fs.mkdir(path.dirname(queuePath), { recursive: true });

  const existing = await loadExistingTweetIds(queuePath);
  const metaFiles = await collectMetaJsonFiles(options.outputDir);
  const linesOut: string[] = [];
  let skipped = 0;

  for (const fp of metaFiles) {
    let raw: string;
    try {
      raw = await fs.readFile(fp, "utf-8");
    } catch {
      skipped++;
      continue;
    }
    let m: Record<string, unknown>;
    try {
      m = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      skipped++;
      continue;
    }

    if (m.is_finance !== true) {
      skipped++;
      continue;
    }

    const tweetId =
      typeof m.tweet_id === "string"
        ? m.tweet_id
        : typeof m.tweet_id === "number"
          ? String(m.tweet_id)
          : "";
    if (!tweetId || existing.has(tweetId)) {
      skipped++;
      continue;
    }

    const tickerRaw =
      typeof m.ticker === "string"
        ? m.ticker
        : typeof (m as { plan?: { ticker?: string } }).plan?.ticker === "string"
          ? (m as { plan: { ticker: string } }).plan.ticker
          : "";
    const dir = parseBookmarkDirection(
      typeof m.direction === "string"
        ? m.direction
        : typeof (m as { plan?: { direction?: string } }).plan?.direction ===
            "string"
          ? (m as { plan: { direction: string } }).plan.direction
          : undefined,
    );
    if (!tickerRaw || !dir) {
      skipped++;
      continue;
    }

    const asset = normalizeWttTicker(stripPipelineTickerSymbol(tickerRaw));
    if (!asset) {
      skipped++;
      continue;
    }

    const rationale =
      typeof m.rationale === "string"
        ? m.rationale
        : typeof m.summary === "string"
          ? m.summary
          : "X bookmark pipeline";
    const tweet_url = typeof m.tweet_url === "string" ? m.tweet_url : undefined;
    const validation_passed =
      typeof m.validation_passed === "boolean"
        ? m.validation_passed
        : undefined;
    const classification_confidence =
      typeof m.confidence === "number" ? m.confidence : undefined;

    const { strength, confidence } = scoreFromMeta(m);

    const rec: XBookmarkPaperSignalLine = {
      schemaVersion: X_BOOKMARK_PAPER_SCHEMA_VERSION,
      tweet_id: tweetId,
      asset,
      direction: dir,
      strength,
      confidence,
      rationale: rationale.slice(0, 500),
      tweet_url,
      validation_passed,
      classification_confidence,
      ingestedAt: new Date().toISOString(),
      source_meta_path: path.relative(options.cwd, fp),
    };

    linesOut.push(JSON.stringify(rec));
    existing.add(tweetId);
  }

  if (linesOut.length > 0) {
    await fs.appendFile(queuePath, linesOut.join("\n") + "\n", "utf-8");
    logger.info(
      `[xBookmarksPaperQueue] Appended ${linesOut.length} row(s) → ${queuePath}`,
    );
  }

  return { appended: linesOut.length, skipped };
}

function parseIsoMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Load queue rows newer than maxAgeMs (by ingestedAt).
 */
export async function loadRecentXBookmarkPaperSignals(options: {
  cwd: string;
  maxAgeMs: number;
  queuePath?: string;
}): Promise<XBookmarkPaperSignalLine[]> {
  const queuePath = options.queuePath ?? defaultQueuePath(options.cwd);
  const cutoff = Date.now() - options.maxAgeMs;
  const out: XBookmarkPaperSignalLine[] = [];
  let raw: string;
  try {
    raw = await fs.readFile(queuePath, "utf-8");
  } catch {
    return out;
  }
  for (const line of raw.split("\n")) {
    const rec = lineToRecord(line);
    if (!rec) continue;
    if (parseIsoMs(rec.ingestedAt) >= cutoff) out.push(rec);
  }
  return out;
}

/** Latest row per asset (by ingestedAt). */
export function latestXBookmarkSignalByAsset(
  rows: XBookmarkPaperSignalLine[],
): Map<string, XBookmarkPaperSignalLine> {
  const map = new Map<string, XBookmarkPaperSignalLine>();
  for (const r of rows) {
    const key = r.asset.toUpperCase();
    const prev = map.get(key);
    if (!prev || parseIsoMs(r.ingestedAt) > parseIsoMs(prev.ingestedAt)) {
      map.set(key, r);
    }
  }
  return map;
}

export function xBookmarkAgeDecay(ingestedAt: string, ttlMs: number): number {
  const t0 = parseIsoMs(ingestedAt);
  if (!t0) return 0;
  const age = Date.now() - t0;
  if (age >= ttlMs) return 0;
  return 1 - (age / ttlMs) * 0.45;
}

export function getDefaultXBookmarkQueuePath(cwd: string): string {
  return defaultQueuePath(cwd);
}
