/**
 * SOLUS_ASSIGNMENT_CALIBRATION — Record assignment predictions, resolve (assigned / not), and report Brier.
 * Same Brier formula as skills/quant/2.py. Store: solus-assignment-predictions.jsonl in .elizadb/solus/.
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { isSolus } from "../utils/solus";
import { getNextFriday0800UTC } from "../utils/assignmentProbability";
import {
  appendRecord,
  resolveLatestForAssetStrike,
  computeBrier,
  getResolvedCount,
} from "../utils/assignmentPredictionsStore";

const MIN_RESOLVED_FOR_TRAINING = 50;

const ASSETS = ["BTC", "ETH", "SOL", "HYPE"];

const RECORD_TRIGGERS = [
  "record assignment prediction",
  "record assignment prob",
  "record assignment probability",
];

const RESOLVE_ASSIGNED_TRIGGERS = [
  "we got assigned",
  "got assigned",
  "we were assigned",
  "were assigned",
];

const RESOLVE_NOT_ASSIGNED_TRIGGERS = [
  "we didn't get assigned",
  "didn't get assigned",
  "we weren't assigned",
  "weren't assigned",
  "not assigned",
];

const REPORT_TRIGGERS = [
  "assignment calibration",
  "assignment calibration?",
  "how's our assignment calibration",
  "solus assignment calibration",
];

function hasTrigger(text: string, triggers: string[]): boolean {
  const lower = text.toLowerCase();
  return triggers.some((t) => lower.includes(t));
}

function parseAsset(text: string): string | null {
  const upper = text.toUpperCase();
  for (const a of ASSETS) {
    if (upper.includes(a)) return a;
  }
  return null;
}

function parseStrike(text: string): number | null {
  const match = text.match(/\$?\s*(\d+(?:\.\d+)?)\s*k?/i);
  if (!match) return null;
  let n = parseFloat(match[1]);
  if (
    match[0].toLowerCase().endsWith("k") ||
    match[0].toLowerCase().includes("k")
  ) {
    n *= 1000;
  }
  return n > 0 ? n : null;
}

function parseProb(text: string): number | null {
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return Math.min(1, Math.max(0, parseFloat(pct[1]) / 100));
  const dec = text.match(/\b0?\.\d+\b/);
  if (dec) return Math.min(1, Math.max(0, parseFloat(dec[0])));
  return null;
}

export const solusAssignmentCalibrationAction: Action = {
  name: "SOLUS_ASSIGNMENT_CALIBRATION",
  similes: ["ASSIGNMENT_CALIBRATION", "RECORD_ASSIGNMENT_PREDICTION"],
  description:
    "Record an assignment probability prediction (asset, strike, prob), resolve with 'we got assigned' or 'we didn't get assigned', or report assignment calibration (Brier score over resolved predictions).",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (!isSolus(runtime)) return false;
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      hasTrigger(text, RECORD_TRIGGERS) ||
      hasTrigger(text, RESOLVE_ASSIGNED_TRIGGERS) ||
      hasTrigger(text, RESOLVE_NOT_ASSIGNED_TRIGGERS) ||
      hasTrigger(text, REPORT_TRIGGERS)
    );
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const text = (message.content?.text ?? "").trim();
    const lower = text.toLowerCase();

    try {
      if (hasTrigger(lower, REPORT_TRIGGERS)) {
        const report = computeBrier(30);
        const resolvedTotal = getResolvedCount();
        const resolvedLine = `Resolved: ${resolvedTotal}/${MIN_RESOLVED_FOR_TRAINING} for calibration training.`;
        if (report.count === 0) {
          await callback({
            text: `No resolved assignment predictions yet. ${resolvedLine} Record predictions with "record assignment prediction: BTC 106000 24%", then resolve with "we got assigned" or "we didn't get assigned" to see calibration (Brier score).`,
            actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
          });
          return { success: true };
        }
        await callback({
          text: `**Assignment calibration** (last 30 days): Brier = ${report.meanBrier.toFixed(4)} (n = ${report.count}). Lower is better; 0 = perfect. ${resolvedLine}`,
          actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
        });
        return { success: true };
      }

      if (hasTrigger(lower, RESOLVE_ASSIGNED_TRIGGERS)) {
        const asset = parseAsset(text);
        if (!asset) {
          await callback({
            text: 'Say which asset was assigned (e.g. "we got assigned on BTC 106k").',
            actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
          });
          return { success: true };
        }
        const strike = parseStrike(text);
        const ok = resolveLatestForAssetStrike(asset, 1, strike ?? undefined);
        if (ok) {
          await callback({
            text: `Recorded: ${asset}${strike != null ? ` $${strike.toLocaleString()}` : ""} — assigned (1).`,
            actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
          });
        } else {
          await callback({
            text: `No open assignment prediction found for ${asset}. Record one first with \"record assignment prediction: ${asset} <strike> <prob>%\".`,
            actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
          });
        }
        return { success: true };
      }

      if (hasTrigger(lower, RESOLVE_NOT_ASSIGNED_TRIGGERS)) {
        const asset = parseAsset(text);
        if (!asset) {
          await callback({
            text: 'Say which asset (e.g. "we didn\'t get assigned on BTC").',
            actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
          });
          return { success: true };
        }
        const strike = parseStrike(text);
        const ok = resolveLatestForAssetStrike(asset, 0, strike ?? undefined);
        if (ok) {
          await callback({
            text: `Recorded: ${asset}${strike != null ? ` $${strike.toLocaleString()}` : ""} — not assigned (0).`,
            actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
          });
        } else {
          await callback({
            text: `No open assignment prediction found for ${asset}. Record one first.`,
            actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
          });
        }
        return { success: true };
      }

      if (hasTrigger(lower, RECORD_TRIGGERS)) {
        const asset = parseAsset(text);
        const strike = parseStrike(text);
        const prob = parseProb(text);
        if (!asset || !strike || prob == null) {
          await callback({
            text: 'Use: "record assignment prediction: <asset> <strike> <prob>" (e.g. BTC 106000 24% or ETH 3500 0.25).',
            actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
          });
          return { success: true };
        }
        const nextFriday = getNextFriday0800UTC(new Date());
        appendRecord({
          asset,
          strike,
          expiryUtc: new Date(nextFriday).toISOString(),
          predictedAssignProb: prob,
        });
        await callback({
          text: `Recorded assignment prediction: ${asset} $${strike.toLocaleString()} @ ${(prob * 100).toFixed(0)}%. Resolve at expiry with \"we got assigned\" or \"we didn't get assigned.\"`,
          actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
        });
        return { success: true };
      }

      await callback({
        text: 'Say "record assignment prediction", "we got assigned" / "we didn\'t get assigned", or "assignment calibration".',
        actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
      });
      return { success: true };
    } catch (error) {
      logger.error("[SOLUS_ASSIGNMENT_CALIBRATION] Failed:", error);
      await callback({
        text: 'Assignment calibration failed. Try again or say "assignment calibration" for the current Brier report.',
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Record assignment prediction: BTC 106000 24%" },
      },
      {
        name: "{{agent}}",
        content: {
          text: 'Recorded assignment prediction: BTC $106,000 @ 24%. Resolve at expiry with "we got assigned" or "we didn\'t get assigned."',
          actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "We got assigned on BTC 106k" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Recorded: BTC $106,000 — assigned (1).",
          actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Assignment calibration?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Assignment calibration** (last 30 days): Brier = 0.0523 (n = 12). Lower is better; 0 = perfect.",
          actions: ["SOLUS_ASSIGNMENT_CALIBRATION"],
        },
      },
    ],
  ],
};
