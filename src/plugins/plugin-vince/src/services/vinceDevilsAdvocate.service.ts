import { Service, type IAgentRuntime } from "@elizaos/core";

export interface DevilsAdvocateTradeInput {
  asset: string;
  direction: "long" | "short";
  strength: number;
  confidence: number;
  sentimentScore?: number;
  fundingRate?: number;
  dvol?: number | null;
  openInterestChangePct?: number;
}

export interface DevilsAdvocateTradeResult {
  baseRate: number;
  score: number;
  block: boolean;
  downgradeMultiplier: number;
  rationale: string;
}

export interface DevilsAdvocateGenomeInput {
  candidateFitness: number;
  incumbentFitness: number;
  candidateSharpe: number;
  incumbentSharpe: number;
  candidateWinRate: number;
  incumbentWinRate: number;
}

export interface DevilsAdvocateGenomeResult {
  pass: boolean;
  robustnessScore: number;
  rationale: string;
}

const DEFAULT_BASE_RATE_BLOCK = 0.6;
const DEFAULT_ROBUSTNESS_MIN = 0.6;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export class VinceDevilsAdvocateService extends Service {
  static serviceType = "VINCE_DEVILS_ADVOCATE_SERVICE";
  capabilityDescription =
    "Adversarial counter-thesis checks for trade and genome decisions";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceDevilsAdvocateService> {
    return new VinceDevilsAdvocateService(runtime);
  }

  async stop(): Promise<void> {}

  getTradeBlockThreshold(): number {
    const raw =
      this.runtime.getSetting?.("vince_devils_advocate_base_rate_threshold") ??
      process.env.VINCE_DEVILS_ADVOCATE_BASE_RATE_THRESHOLD;
    const n =
      typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""));
    if (!Number.isFinite(n)) return DEFAULT_BASE_RATE_BLOCK;
    return clamp(n, 0.4, 0.95);
  }

  getGenomeRobustnessMin(): number {
    const raw =
      this.runtime.getSetting?.("vince_devils_advocate_robustness_min") ??
      process.env.VINCE_DEVILS_ADVOCATE_ROBUSTNESS_MIN;
    const n =
      typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""));
    if (!Number.isFinite(n)) return DEFAULT_ROBUSTNESS_MIN;
    return clamp(n, 0.2, 0.95);
  }

  challengeTrade(input: DevilsAdvocateTradeInput): DevilsAdvocateTradeResult {
    let risk = 0;
    const notes: string[] = [];
    if (input.direction === "long" && (input.sentimentScore ?? 5) <= 3) {
      risk += 0.3;
      notes.push("bearish sentiment against long");
    }
    if (input.direction === "short" && (input.sentimentScore ?? 5) >= 8) {
      risk += 0.3;
      notes.push("bullish sentiment against short");
    }
    if (input.direction === "long" && (input.fundingRate ?? 0) > 0.03) {
      risk += 0.2;
      notes.push("positive funding crowding long");
    }
    if (input.direction === "short" && (input.fundingRate ?? 0) < -0.03) {
      risk += 0.2;
      notes.push("negative funding crowding short");
    }
    if ((input.dvol ?? 55) >= 80) {
      risk += 0.15;
      notes.push("high dvol");
    }
    if (Math.abs(input.openInterestChangePct ?? 0) >= 10) {
      risk += 0.1;
      notes.push("fast oi expansion");
    }
    if (input.confidence < 50) {
      risk += 0.1;
      notes.push("low confidence");
    }
    if (input.strength < 50) {
      risk += 0.1;
      notes.push("weak strength");
    }
    const baseRate = clamp(risk, 0, 0.95);
    const threshold = this.getTradeBlockThreshold();
    const block = baseRate >= threshold;
    const downgradeMultiplier = block ? 0 : baseRate >= 0.45 ? 0.7 : 1.0;
    return {
      baseRate,
      score: Math.round(baseRate * 100),
      block,
      downgradeMultiplier,
      rationale:
        notes.length > 0 ? notes.join("; ") : "no strong counter-thesis",
    };
  }

  challengeGenome(
    input: DevilsAdvocateGenomeInput,
  ): DevilsAdvocateGenomeResult {
    const fitnessDelta = input.candidateFitness - input.incumbentFitness;
    const sharpeDelta = input.candidateSharpe - input.incumbentSharpe;
    const winRateDelta = input.candidateWinRate - input.incumbentWinRate;
    let score = 0.5;
    score += clamp(fitnessDelta / 2, -0.2, 0.2);
    score += clamp(sharpeDelta / 4, -0.2, 0.2);
    score += clamp(winRateDelta / 100, -0.1, 0.1);
    score = clamp(score, 0, 1);
    const min = this.getGenomeRobustnessMin();
    const pass = score >= min;
    const rationale = pass
      ? `robustness ${score.toFixed(2)} >= ${min.toFixed(2)}`
      : `robustness ${score.toFixed(2)} < ${min.toFixed(2)}`;
    return { pass, robustnessScore: score, rationale };
  }
}
