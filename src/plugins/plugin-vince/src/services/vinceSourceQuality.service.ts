import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import {
  VinceXSourceAttributionService,
  type SourceQualitySnapshot,
} from "./vinceXSourceAttribution.service";
import { dynamicConfig } from "../config/dynamicConfig";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";

export class VinceSourceQualityService extends Service {
  static serviceType = "VINCE_SOURCE_QUALITY_SERVICE";
  capabilityDescription =
    "Scores source quality and emits promotion/demotion recommendations";

  private readonly attribution: VinceXSourceAttributionService;
  private readonly historyPath: string;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.attribution = new VinceXSourceAttributionService(
      undefined,
      runtime as unknown as { databaseAdapter?: { db?: unknown } },
    );
    this.historyPath = path.join(
      process.cwd(),
      ".elizadb",
      PERSISTENCE_DIR,
      "source-quality-history.jsonl",
    );
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceSourceQualityService> {
    return new VinceSourceQualityService(runtime);
  }

  async stop(): Promise<void> {}

  getSnapshot(windowDays = 30): SourceQualitySnapshot {
    return this.attribution.getSourceQualitySnapshot(windowDays);
  }

  private getLastAppliedTsBySource(): Record<string, number> {
    try {
      if (!fs.existsSync(this.historyPath)) return {};
      const out: Record<string, number> = {};
      for (const line of fs
        .readFileSync(this.historyPath, "utf-8")
        .split("\n")) {
        const l = line.trim();
        if (!l) continue;
        const row = JSON.parse(l) as { source?: string; ts?: number };
        if (row.source && typeof row.ts === "number") out[row.source] = row.ts;
      }
      return out;
    } catch {
      return {};
    }
  }

  private appendHistory(
    source: string,
    oldWeight: number,
    newWeight: number,
  ): void {
    try {
      fs.mkdirSync(path.dirname(this.historyPath), { recursive: true });
      fs.appendFileSync(
        this.historyPath,
        JSON.stringify({
          ts: Date.now(),
          source,
          oldWeight,
          newWeight,
        }) + "\n",
        "utf-8",
      );
    } catch {
      // non-fatal
    }
  }

  async applyRecommendations(windowDays = 30): Promise<{
    applied: number;
    mode: "observe_only" | "recommendation" | "auto_apply";
  }> {
    const modeRaw =
      (this.runtime.getSetting?.("VINCE_PROOF_ALLOCATOR_MODE") as string) ??
      process.env.VINCE_PROOF_ALLOCATOR_MODE ??
      "observe_only";
    const mode =
      modeRaw === "auto_apply" || modeRaw === "recommendation"
        ? modeRaw
        : "observe_only";
    if (mode !== "auto_apply") return { applied: 0, mode };

    const sourceEnabled =
      this.runtime.getSetting?.("VINCE_SOURCE_QUALITY_ENABLED") === true ||
      this.runtime.getSetting?.("VINCE_SOURCE_QUALITY_ENABLED") === "true" ||
      process.env.VINCE_SOURCE_QUALITY_ENABLED === "true";
    if (!sourceEnabled) return { applied: 0, mode };

    const snap = this.getSnapshot(windowDays);
    let applied = 0;
    const lastApplied = this.getLastAppliedTsBySource();
    const cooldownHours = Number(
      this.runtime.getSetting?.("VINCE_SOURCE_QUALITY_COOLDOWN_HOURS") ??
        process.env.VINCE_SOURCE_QUALITY_COOLDOWN_HOURS ??
        24,
    );
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const hysteresisMinScoreDelta = Number(
      this.runtime.getSetting?.("VINCE_SOURCE_QUALITY_HYSTERESIS_POINTS") ??
        process.env.VINCE_SOURCE_QUALITY_HYSTERESIS_POINTS ??
        5,
    );
    for (const row of snap.sources.slice(0, 8)) {
      if (row.tradeCount < 8) continue;
      const recentTs = lastApplied[row.source] ?? 0;
      if (Date.now() - recentTs < cooldownMs) continue;
      // Hysteresis: ignore minor score noise around neutral.
      if (Math.abs(row.qualityScore - 50) < hysteresisMinScoreDelta) continue;
      const current = dynamicConfig.getSourceWeight(row.source);
      const boundedMultiplier = Math.max(
        0.95,
        Math.min(1.05, row.recommendedWeightMultiplier),
      );
      const target = Math.max(0.1, Math.min(3.0, current * boundedMultiplier));
      if (Math.abs(target - current) < 0.02) continue;
      await dynamicConfig.updateSourceWeight(
        row.source,
        target,
        `phase15_source_quality_v2 score=${row.qualityScore.toFixed(1)} regime=${row.dominantRegime ?? "unknown"}`,
        { sampleSize: row.tradeCount, winRate: Math.round(row.winRate * 100) },
      );
      this.appendHistory(row.source, current, target);
      applied += 1;
    }
    if (applied > 0) {
      logger.info(
        `[VinceSourceQuality] Applied ${applied} source weight updates from proof snapshot`,
      );
    }
    return { applied, mode };
  }
}
