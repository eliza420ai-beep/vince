import { Service, type IAgentRuntime } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

export interface ImmunePattern {
  id: string;
  name: string;
  longShortRatioMin?: number;
  longShortRatioMax?: number;
  fundingRateMin?: number;
  fundingRateMax?: number;
  openInterestChangePctMin?: number;
  openInterestChangePctMax?: number;
  fearGreedMin?: number;
  fearGreedMax?: number;
  expectedLossRate: number;
}

export interface ImmuneInput {
  longShortRatio?: number;
  fundingRate?: number;
  openInterestChangePct?: number;
  fearGreedValue?: number;
}

export interface ImmuneDetectionResult {
  matched: boolean;
  patternId?: string;
  confidence: number;
  lossRate: number;
  block: boolean;
  rationale: string;
}

// Resolve from __dirname so tests run from any cwd (e.g. plugin-vince dir).
// __dirname: src/plugins/plugin-vince/src/services → up 5 levels = repo root
const DEFAULT_PATTERNS_DIR = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "knowledge",
  "teammate",
  "attack-patterns",
);

export class VinceImmuneSystemService extends Service {
  static serviceType = "VINCE_IMMUNE_SYSTEM_SERVICE";
  capabilityDescription = "Detects known attack-pattern regimes before entry";

  private patterns: ImmunePattern[] = [];

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.patterns = this.loadPatterns();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceImmuneSystemService> {
    return new VinceImmuneSystemService(runtime);
  }

  async stop(): Promise<void> {}

  private loadPatterns(): ImmunePattern[] {
    try {
      if (!fs.existsSync(DEFAULT_PATTERNS_DIR)) return [];
      const files = fs
        .readdirSync(DEFAULT_PATTERNS_DIR)
        .filter((f) => f.endsWith(".json"));
      const out: ImmunePattern[] = [];
      for (const file of files) {
        const raw = fs.readFileSync(
          path.join(DEFAULT_PATTERNS_DIR, file),
          "utf-8",
        );
        const parsed = JSON.parse(raw) as ImmunePattern;
        if (parsed?.id) out.push(parsed);
      }
      return out;
    } catch {
      return [];
    }
  }

  detectAttackPattern(input: ImmuneInput): ImmuneDetectionResult {
    for (const p of this.patterns) {
      const checks: boolean[] = [];
      if (typeof p.longShortRatioMin === "number") {
        checks.push((input.longShortRatio ?? 0) >= p.longShortRatioMin);
      }
      if (typeof p.longShortRatioMax === "number") {
        checks.push((input.longShortRatio ?? 999) <= p.longShortRatioMax);
      }
      if (typeof p.fundingRateMin === "number") {
        checks.push((input.fundingRate ?? -1) >= p.fundingRateMin);
      }
      if (typeof p.fundingRateMax === "number") {
        checks.push((input.fundingRate ?? 1) <= p.fundingRateMax);
      }
      if (typeof p.openInterestChangePctMin === "number") {
        checks.push(
          (input.openInterestChangePct ?? -999) >= p.openInterestChangePctMin,
        );
      }
      if (typeof p.openInterestChangePctMax === "number") {
        checks.push(
          (input.openInterestChangePct ?? 999) <= p.openInterestChangePctMax,
        );
      }
      if (typeof p.fearGreedMin === "number") {
        checks.push((input.fearGreedValue ?? 0) >= p.fearGreedMin);
      }
      if (typeof p.fearGreedMax === "number") {
        checks.push((input.fearGreedValue ?? 100) <= p.fearGreedMax);
      }
      const passed = checks.filter(Boolean).length;
      if (checks.length > 0 && passed === checks.length) {
        const confidence = Math.min(0.95, 0.55 + checks.length * 0.08);
        const block = confidence >= 0.65 || p.expectedLossRate >= 0.58;
        return {
          matched: true,
          patternId: p.id,
          confidence,
          lossRate: p.expectedLossRate,
          block,
          rationale: `${p.name} matched (${checks.length} conditions)`,
        };
      }
    }
    return {
      matched: false,
      confidence: 0,
      lossRate: 0,
      block: false,
      rationale: "no attack pattern matched",
    };
  }
}
