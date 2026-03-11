/**
 * Lightweight narrative decay for signal aggregator: read latest narrative transition
 * from data/narrative-lag.jsonl and apply VinceNarrativeDecayService multiplier.
 * Used when XSentiment contributes so stale narratives reduce impact.
 */

import * as fs from "fs";
import * as path from "path";
import { VinceNarrativeDecayService } from "../services/vinceNarrativeDecay.service";

const FILE_NAME = "narrative-lag.jsonl";

export interface LatestNarrative {
  narrativePhase: string;
  transitionAt: string;
}

function getFilePath(dataDir?: string): string {
  const dir = dataDir ?? path.join(process.cwd(), "data");
  return path.join(dir, FILE_NAME);
}

/**
 * Returns the latest narrative transition record for the asset (by transitionAt desc).
 * Returns null if file missing or no record for asset.
 */
export function getLatestNarrativeForAsset(
  asset: string,
  dataDir?: string,
): LatestNarrative | null {
  const filePath = getFilePath(dataDir);
  if (!fs.existsSync(filePath)) return null;
  try {
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const records: {
      asset?: string;
      narrativePhase?: string;
      transitionAt?: string;
    }[] = [];
    for (const line of lines) {
      try {
        const r = JSON.parse(line);
        if (r?.asset && r?.transitionAt && r?.narrativePhase) records.push(r);
      } catch {
        // skip
      }
    }
    const forAsset = records
      .filter((r) => (r.asset ?? "").toUpperCase() === asset.toUpperCase())
      .sort(
        (a, b) =>
          new Date(b.transitionAt ?? 0).getTime() -
          new Date(a.transitionAt ?? 0).getTime(),
      );
    const latest = forAsset[0];
    if (!latest) return null;
    return {
      narrativePhase: latest.narrativePhase ?? "inception",
      transitionAt: latest.transitionAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

const decayService = new VinceNarrativeDecayService();

/**
 * Returns decay multiplier (0–1) for the asset's current narrative phase, or 1.0 if no data.
 * Set X_SENTIMENT_NARRATIVE_DECAY_ENABLED=false to disable (returns 1.0).
 */
export function getNarrativeDecayMultiplier(
  asset: string,
  dataDir?: string,
): number {
  if (process.env.X_SENTIMENT_NARRATIVE_DECAY_ENABLED === "false") return 1.0;
  const narrative = getLatestNarrativeForAsset(asset, dataDir);
  if (!narrative) return 1.0;
  return decayService.getDecayMultiplier(
    narrative.narrativePhase,
    narrative.transitionAt,
  );
}
