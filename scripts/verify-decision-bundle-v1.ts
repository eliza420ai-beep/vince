#!/usr/bin/env bun
/**
 * Verify a decision_bundle_v1.json payload locally and print a Radon-style rail.
 *
 * Usage:
 *   bun run scripts/verify-decision-bundle-v1.ts /path/to/decision_bundle_v1.json
 */

import fs from "node:fs";
import path from "node:path";
import { ingestDecisionBundleV1File } from "../src/plugins/plugin-vince/src/utils/decisionBundleV1IngestShim";

function railText(bundle: any): string {
  const status = bundle?.status;
  const asset = bundle?.asset ?? "—";
  const direction = bundle?.direction ?? "—";

  const evalStrength = bundle?.evaluate?.signal?.strength;
  const evalConfidence = bundle?.evaluate?.signal?.confidence;
  const evalSources = bundle?.evaluate?.signal?.sources ?? [];
  const evalFactors = bundle?.evaluate?.signal?.factors ?? [];

  const structure = bundle?.structure ?? null;
  const execute = bundle?.execute ?? null;
  const track = bundle?.track ?? null;

  const lines: string[] = [];
  lines.push(`[${status}] ${asset} ${String(direction).toUpperCase()}`);

  lines.push("Evaluate:");
  if (status === "AVOIDED") {
    lines.push(`- reason: ${bundle?.evaluate?.reason ?? "—"}`);
    if (bundle?.stage) lines.push(`- stage: ${bundle.stage}`);
  } else {
    lines.push(
      `- signal: strength=${evalStrength ?? "null"} confidence=${evalConfidence ?? "null"}`,
    );
    if (evalSources?.length) lines.push(`- sources: ${evalSources.join(", ")}`);
    if (evalFactors?.length) lines.push(`- factors: ${evalFactors.slice(0, 8).join(" | ")}${evalFactors.length > 8 ? " ..." : ""}`);
  }

  lines.push("Structure:");
  if (!structure) lines.push(`- (none; blocked before structure)`);
  else {
    lines.push(`- slMode=${structure.slMode ?? "—"} tpMode=${structure.tpMode ?? "—"} aggressive=${structure.aggressive ?? "—"}`);
    lines.push(`- stopLossPrice=${structure.stopLossPrice ?? "null"}`);
    if (Array.isArray(structure.takeProfitPrices)) {
      lines.push(`- takeProfitPrices=[${structure.takeProfitPrices.join(", ")}]`);
    }
  }

  lines.push("Kelly:");
  if (!bundle?.kelly) lines.push(`- (none)`);
  else lines.push(`- sizeUsd=${bundle.kelly.sizeUsd ?? "null"} leverage=${bundle.kelly.leverage ?? "null"}`);

  lines.push("Execute:");
  if (!execute) lines.push(`- (none; no execution)`);
  else {
    lines.push(`- entryPrice=${execute.entryPrice ?? "null"} slippageBps=${execute.slippageBps ?? "null"} usedPullbackEntry=${execute.usedPullbackEntry ?? "null"}`);
    if (bundle?.positionId) lines.push(`- positionId=${bundle.positionId}`);
  }

  lines.push("Track:");
  if (!track) lines.push(`- (pending outcome)`);
  else {
    lines.push(`- exitReason=${track.exitReason ?? "—"}`);
    lines.push(`- exitPrice=${track.exitPrice ?? "null"} realizedPnl=${track.realizedPnl ?? "null"} realizedPnlPct=${track.realizedPnlPct ?? "null"}`);
    lines.push(`- holdingPeriodMinutes=${track.holdingPeriodMinutes ?? "null"}`);
  }

  return lines.join("\n");
}

function main() {
  const arg = process.argv.slice(2).join(" ").trim();
  if (!arg) {
    console.error(`Provide a path to a decision_bundle_v1.json file.\n`);
    process.exit(1);
  }

  const abs = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
  if (!fs.existsSync(abs)) {
    console.error(`[verify-decision-bundle-v1] File not found: ${abs}`);
    process.exit(1);
  }

  const result = ingestDecisionBundleV1File(abs);
  if (!result.ok) {
    console.error(`[verify-decision-bundle-v1] FAIL: ${abs}`);
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }

  console.log(`[verify-decision-bundle-v1] OK: ${abs}`);
  const raw = JSON.parse(fs.readFileSync(abs, "utf-8"));
  console.log("\n" + railText(raw));
}

main();

