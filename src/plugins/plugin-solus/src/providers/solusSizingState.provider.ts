/**
 * SOLUS_SIZING_STATE — Parses the private solus-options-sizing.md file
 * into a structured wheel/sizing state for Solus.
 *
 * The source file lives at knowledge/private/solus-options-sizing.md and is
 * gitignored upstream; it is treated as local operator state. This provider
 * gives Solus a consistent view of:
 * - Current wheel / options structures per asset (BTC, HYPE, SOL, etc.)
 * - Weekly premium targets and outcomes
 * - Assigned sizes when the wheel has flipped legs
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

export interface SolusSizingEntry {
  asset: string;
  venue?: string;
  positionType?: string;
  previousPositionType?: string;
  contracts?: number;
  approxSize?: number;
  strikeUsd?: number;
  costBasisUsd?: number;
  expiryUtc?: string;
  weeklyPremiumTargetUsd?: number;
  outcome?: string;
  status?: string;
  assignedSize?: number;
  newPositionType?: string;
  newStrikeUsd?: number;
  newUpfrontPremiumUsd?: number;
  questionForSolus?: string;
  notes?: string;
  currentPlan?: string;
  raw: Record<string, string>;
  missing: string[];
}

export interface SolusSizingState {
  entries: Record<string, SolusSizingEntry>;
  rawMarkdown: string | null;
}

const SIZING_RELATIVE_PATH = path.join(
  "knowledge",
  "private",
  "solus-options-sizing.md",
);

export function safeReadSizingFile(): string | null {
  try {
    const fullPath = path.join(process.cwd(), SIZING_RELATIVE_PATH);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    return fs.readFileSync(fullPath, "utf-8");
  } catch (error) {
    logger.debug(
      "[Solus] Failed to read solus-options-sizing.md: " +
        (error instanceof Error ? error.message : String(error)),
    );
    return null;
  }
}

export function parseSizingMarkdown(markdown: string): SolusSizingState {
  const lines = markdown.split(/\r?\n/);
  const entries: Record<string, SolusSizingEntry> = {};

  let i = 0;
  // Skip optional frontmatter (--- ... ---)
  if (lines[i]?.trim() === "---") {
    i += 1;
    while (i < lines.length && lines[i].trim() !== "---") {
      i += 1;
    }
    if (i < lines.length && lines[i].trim() === "---") {
      i += 1;
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      const heading = line.replace(/^###\s+/, "").trim();
      const assetToken = heading.split("—")[0]?.trim() ?? heading;
      const asset = assetToken.toUpperCase();

      const raw: Record<string, string> = {};
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith("### ")) {
        const current = lines[j];
        const bulletMatch = current.match(/^\-\s*([^:]+):\s*(.*)$/);
        if (bulletMatch) {
          const rawKey = bulletMatch[1].trim();
          const key =
            rawKey
              .toLowerCase()
              .replace(/\s+/g, "_")
              .replace(/[^a-z0-9_]/g, "") ?? rawKey;
          let value = bulletMatch[2] ?? "";
          // Multi-line values (notes/current_plan/question) using YAML-style >
          if (value === ">" || value === "|") {
            const collected: string[] = [];
            j += 1;
            while (
              j < lines.length &&
              !lines[j].startsWith("- ") &&
              !lines[j].startsWith("### ")
            ) {
              if (lines[j].trim().length > 0) {
                collected.push(lines[j].trim());
              }
              j += 1;
            }
            j -= 1; // compensate for extra increment at loop end
            value = collected.join(" ");
          }
          raw[key] = value.trim();
        }
        j += 1;
      }

      // Current position: use position_type, or when wheel flipped use new_position_type (not previous)
      const currentPositionType =
        raw["position_type"] ?? raw["new_position_type"];
      const entry: SolusSizingEntry = {
        asset,
        venue: raw["venue"],
        positionType: currentPositionType,
        previousPositionType: raw["previous_position_type"],
        contracts: Number.isFinite(Number(raw["contracts_btc"]))
          ? Number(raw["contracts_btc"])
          : undefined,
        approxSize: Number.isFinite(Number(raw["approx_size_sol"]))
          ? Number(raw["approx_size_sol"])
          : undefined,
        // When wheel flipped (new_position_type), current strike is new_strike_usd
        strikeUsd: Number.isFinite(Number(raw["new_strike_usd"]))
          ? Number(raw["new_strike_usd"])
          : Number.isFinite(Number(raw["strike_usd"]))
            ? Number(raw["strike_usd"])
            : Number.isFinite(Number(raw["previous_strike_usd"]))
              ? Number(raw["previous_strike_usd"])
              : undefined,
        costBasisUsd: Number.isFinite(Number(raw["cost_basis_usd"]))
          ? Number(raw["cost_basis_usd"])
          : Number.isFinite(Number(raw["entry_price_usd"]))
            ? Number(raw["entry_price_usd"])
            : undefined,
        expiryUtc:
          raw["expiry_utc"] ??
          raw["previous_expiry_utc"] ??
          raw["new_expiry_utc"],
        weeklyPremiumTargetUsd: Number.isFinite(
          Number(raw["weekly_premium_target_usd"]),
        )
          ? Number(raw["weekly_premium_target_usd"])
          : undefined,
        outcome: raw["outcome"] ?? raw["previous_outcome"],
        status: raw["status"],
        assignedSize: Number.isFinite(Number(raw["assigned_size_hype"]))
          ? Number(raw["assigned_size_hype"])
          : undefined,
        newPositionType: raw["new_position_type"],
        newStrikeUsd: Number.isFinite(Number(raw["new_strike_usd"]))
          ? Number(raw["new_strike_usd"])
          : undefined,
        newUpfrontPremiumUsd: Number.isFinite(
          Number(raw["new_upfront_premium_usd"]),
        )
          ? Number(raw["new_upfront_premium_usd"])
          : undefined,
        questionForSolus: raw["question_for_solus"],
        notes: raw["notes"],
        currentPlan: raw["current_plan"],
        raw,
        missing: [],
      };

      const criticalFields: string[] = ["positionType", "venue"];
      if (
        entry.positionType === "covered_calls" ||
        entry.positionType === "secured_puts"
      ) {
        criticalFields.push("strikeUsd", "expiryUtc");
      }
      if (entry.positionType === "spot_stack") {
        criticalFields.push("approxSize");
      }

      entry.missing = criticalFields.filter((field) => {
        const v = (entry as unknown as Record<string, unknown>)[field];
        return (
          v === undefined ||
          v === null ||
          (typeof v === "string" && v.trim().length === 0)
        );
      });

      entries[asset] = entry;
      i = j;
      continue;
    }
    i += 1;
  }

  return { entries, rawMarkdown: markdown };
}

export interface ActivePositionForPortfolio {
  asset: string;
  strike: number;
  type: "cc" | "csp";
}

/**
 * Returns active options positions (CC/CSP with strike) for portfolio risk.
 * Used by SOLUS_OPTIONS_CONTEXT to append portfolio assignment risk when 2+ positions.
 */
export function getActivePositionsForPortfolio(): ActivePositionForPortfolio[] {
  const markdown = safeReadSizingFile();
  if (!markdown) return [];
  const sizing = parseSizingMarkdown(markdown);
  const positions: ActivePositionForPortfolio[] = [];
  for (const entry of Object.values(sizing.entries)) {
    const pt = (entry.positionType ?? "").toLowerCase();
    if (
      (pt !== "covered_calls" && pt !== "secured_puts") ||
      entry.strikeUsd == null ||
      entry.strikeUsd <= 0
    ) {
      continue;
    }
    positions.push({
      asset: entry.asset.toUpperCase(),
      strike: entry.strikeUsd,
      type: pt === "covered_calls" ? "cc" : "csp",
    });
  }
  return positions;
}

export const solusSizingStateProvider: Provider = {
  name: "SOLUS_SIZING_STATE",
  description:
    "Solus wheel and sizing state parsed from knowledge/private/solus-options-sizing.md for BTC/HYPE/SOL and other assets.",
  position: -5,

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    const markdown = safeReadSizingFile();
    if (!markdown) {
      return {};
    }
    const sizing = parseSizingMarkdown(markdown);
    if (Object.keys(sizing.entries).length === 0) {
      return {};
    }

    const summaryLines: string[] = ["[Solus sizing state]"];
    for (const entry of Object.values(sizing.entries)) {
      const labelParts: string[] = [entry.asset];
      // Current position type (position_type or new_position_type when wheel flipped)
      if (entry.positionType) {
        labelParts.push(entry.positionType);
      }
      if (entry.venue) {
        labelParts.push(`@ ${entry.venue}`);
      }
      let header = `- ${labelParts.join(" · ")}`;
      if (entry.previousPositionType && entry.newPositionType) {
        header += ` (current leg: ${entry.newPositionType}; was ${entry.previousPositionType})`;
      }
      const details: string[] = [];
      if (entry.strikeUsd) {
        details.push(`strike ~$${entry.strikeUsd.toFixed(0)}`);
      }
      if (entry.costBasisUsd) {
        details.push(`cost basis ~$${entry.costBasisUsd.toFixed(0)}`);
      }
      if (entry.expiryUtc) {
        details.push(`expiry ${entry.expiryUtc}`);
      }
      if (entry.weeklyPremiumTargetUsd) {
        details.push(
          `weekly premium target ~$${entry.weeklyPremiumTargetUsd.toFixed(0)}`,
        );
      }
      if (entry.status) {
        details.push(`status: ${entry.status}`);
      }
      if (entry.outcome) {
        details.push(`last outcome: ${entry.outcome}`);
      }
      summaryLines.push(
        details.length > 0 ? `${header} — ${details.join(", ")}` : header,
      );
      if (entry.questionForSolus?.trim()) {
        summaryLines.push(
          `  → Question for Solus: ${entry.questionForSolus.trim()}`,
        );
      }
    }

    return {
      text: summaryLines.join("\n"),
      values: {
        solusSizingState: sizing,
      },
    };
  },
};
