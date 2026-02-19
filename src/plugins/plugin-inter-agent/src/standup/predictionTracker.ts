/**
 * Prediction Tracker
 *
 * Saves Solus's standup calls (asset, direction, strike, confidence, expiry) and
 * validates them after expiry by comparing to actual price. Stores in
 * docs/standup/predictions.json (or STANDUP_DELIVERABLES_DIR). Used for accuracy stats and feedback loop.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { logger } from "@elizaos/core";
import type { ParsedStructuredBlock } from "./crossAgentValidation";

function getDeliverablesDir(): string {
  const envDir = process.env.STANDUP_DELIVERABLES_DIR?.trim();
  if (envDir) {
    return path.isAbsolute(envDir) ? envDir : path.join(process.cwd(), envDir);
  }
  return path.join(process.cwd(), "docs/standup");
}

function getPredictionsPath(): string {
  return path.join(getDeliverablesDir(), "predictions.json");
}

export interface PredictionInput {
  date: string;
  asset: string;
  direction: string;
  strike?: number;
  confidence: number;
  expiryDate: string;
  source?: string;
}

export interface Prediction extends PredictionInput {
  id?: string;
  outcome?: "correct" | "incorrect";
  actualPrice?: number;
  validatedAt?: string;
}

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  SOL: "solana",
  ETH: "ethereum",
  HYPE: "hype", // may need adjustment if different on CoinGecko
};

/** Load predictions from disk. */
export async function loadPredictions(): Promise<Prediction[]> {
  const filepath = getPredictionsPath();
  try {
    const raw = await fs.readFile(filepath, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return [];
    logger.warn(
      { err: e },
      "[PredictionTracker] Failed to load predictions.json",
    );
    return [];
  }
}

/** Save predictions array to disk. */
async function savePredictions(predictions: Prediction[]): Promise<void> {
  const dir = getDeliverablesDir();
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    /* ignore */
  }
  const filepath = getPredictionsPath();
  await fs.writeFile(filepath, JSON.stringify(predictions, null, 2), "utf-8");
}

/**
 * Save a new prediction (e.g. from Solus's structured call after Day Report).
 */
export async function savePrediction(
  input: PredictionInput,
): Promise<Prediction> {
  const predictions = await loadPredictions();
  const id = `pred-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const pred: Prediction = { ...input, id, source: input.source ?? "Solus" };
  predictions.push(pred);
  await savePredictions(predictions);
  logger.info(
    `[PredictionTracker] Saved prediction: ${input.asset} ${input.direction} ${input.strike ?? "—"} expiry ${input.expiryDate}`,
  );
  return pred;
}

/**
 * Fetch current USD price for an asset (CoinGecko simple price API, no key required).
 */
async function fetchPriceUsd(asset: string): Promise<number | null> {
  const id = COINGECKO_IDS[asset.toUpperCase()] ?? asset.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { usd?: number }>;
    const price = data[id]?.usd;
    return typeof price === "number" ? price : null;
  } catch (e) {
    logger.warn({ err: e, asset }, "[PredictionTracker] Failed to fetch price");
    return null;
  }
}

/**
 * Validate predictions whose expiry has passed: fetch actual price and set outcome.
 */
export async function validatePredictions(): Promise<{
  validated: number;
  correct: number;
  incorrect: number;
}> {
  const predictions = await loadPredictions();
  const now = new Date().toISOString();
  let validated = 0;
  let correct = 0;
  let incorrect = 0;
  for (const p of predictions) {
    if (p.outcome != null) continue;
    if (!p.expiryDate || p.expiryDate > now) continue;
    const actualPrice = await fetchPriceUsd(p.asset);
    if (actualPrice == null) continue;
    const strike = p.strike ?? 0;
    const aboveHit =
      p.direction.toLowerCase() === "above" && actualPrice >= strike;
    const belowHit =
      p.direction.toLowerCase() === "below" && actualPrice <= strike;
    const hit = aboveHit || belowHit;
    p.outcome = hit ? "correct" : "incorrect";
    p.actualPrice = actualPrice;
    p.validatedAt = now;
    validated++;
    if (hit) correct++;
    else incorrect++;
  }
  if (validated > 0) {
    await savePredictions(predictions);
    logger.info(
      `[PredictionTracker] Validated ${validated} predictions: ${correct} correct, ${incorrect} incorrect`,
    );
  }
  return { validated, correct, incorrect };
}

/**
 * Get accuracy stats for the last N predictions (only validated ones).
 */
export function getAccuracyStats(
  predictions: Prediction[],
  lastN = 10,
): {
  total: number;
  correct: number;
  incorrect: number;
  accuracyPct: number;
  lastMiss: string | null;
} {
  const withOutcome = predictions.filter((p) => p.outcome != null);
  const last = withOutcome.slice(-lastN);
  const correct = last.filter((p) => p.outcome === "correct").length;
  const incorrect = last.filter((p) => p.outcome === "incorrect").length;
  const total = last.length;
  const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const lastIncorrect = [...withOutcome]
    .reverse()
    .find((p) => p.outcome === "incorrect");
  const lastMiss =
    lastIncorrect != null && lastIncorrect.actualPrice != null
      ? `${lastIncorrect.asset} ${lastIncorrect.direction} $${lastIncorrect.strike ?? "?"} on ${(lastIncorrect.expiryDate ?? "").slice(0, 10)} — was $${lastIncorrect.actualPrice}`
      : null;
  return { total, correct, incorrect, accuracyPct, lastMiss };
}

/**
 * Format a short scoreboard line for standup kickoff (last N predictions, accuracy, last miss).
 */
export async function formatPredictionScoreboard(lastN = 10): Promise<string> {
  const predictions = await loadPredictions();
  const stats = getAccuracyStats(predictions, lastN);
  if (stats.total === 0) {
    return "## Prediction scoreboard\nNo validated predictions yet.";
  }
  const lines = [
    `## Prediction scoreboard`,
    `Solus's last ${stats.total} calls: ${stats.correct}/${stats.total} correct (${stats.accuracyPct}% accuracy).`,
  ];
  if (stats.lastMiss) lines.push(`Last miss: ${stats.lastMiss}`);
  return lines.join("\n");
}

/**
 * Extract Solus call from structured block and save as prediction.
 * Expiry is parsed from call.expiry (ISO date string); if missing, use 7 days from now.
 */
export function predictionFromStructuredCall(
  parsed: ParsedStructuredBlock,
  date: string,
): PredictionInput | null {
  const call = parsed?.call;
  if (!call?.asset || !call?.direction) return null;
  let expiryDate = call.expiry?.trim();
  if (!expiryDate) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    expiryDate = d.toISOString().slice(0, 10);
  } else if (expiryDate.length === 10) {
    expiryDate = `${expiryDate}T23:59:59.000Z`;
  }
  return {
    date,
    asset: call.asset,
    direction: call.direction,
    strike: call.strike,
    confidence: call.confidence_pct ?? 50,
    expiryDate,
    source: "Solus",
  };
}
