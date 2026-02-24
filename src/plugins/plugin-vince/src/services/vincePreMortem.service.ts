/**
 * VINCE Pre-Mortem Engine (Phase 6 #30)
 *
 * Before entry, estimate plausible failure modes and assign
 * a survival probability (0-100).
 */

import { Service, type IAgentRuntime } from "@elizaos/core";

export interface PreMortemInput {
  asset: string;
  direction: "long" | "short";
  strength: number;
  confidence: number;
  sentimentScore?: number | null;
  sentimentRegime?: string | null;
  fundingRate?: number | null;
  openInterestChangePct?: number | null;
  longShortRatio?: number | null;
  fearGreedValue?: number | null;
  dvol?: number | null;
}

export interface PreMortemScenario {
  id: string;
  title: string;
  rationale: string;
  riskScore: number;
}

export interface PreMortemResult {
  survivalProbability: number;
  blocked: boolean;
  threshold: number;
  topScenario: PreMortemScenario;
  scenarios: PreMortemScenario[];
}

const DEFAULT_THRESHOLD = 30;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class VincePreMortemService extends Service {
  static serviceType = "VINCE_PRE_MORTEM_SERVICE";
  capabilityDescription =
    "Pre-trade failure scenario scoring with survival probability";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VincePreMortemService> {
    return new VincePreMortemService(runtime);
  }

  async stop(): Promise<void> {}

  getThreshold(): number {
    const raw =
      this.runtime.getSetting?.("vince_pre_mortem_threshold") ??
      process.env.VINCE_PRE_MORTEM_THRESHOLD;
    const parsed =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number.parseFloat(raw)
          : Number.NaN;
    if (!Number.isFinite(parsed)) return DEFAULT_THRESHOLD;
    return clamp(parsed, 1, 99);
  }

  evaluate(input: PreMortemInput): PreMortemResult {
    const scenarios = this.buildScenarios(input).sort(
      (a, b) => b.riskScore - a.riskScore,
    );
    const topScenario = scenarios[0] ?? {
      id: "no-risk",
      title: "No immediate failure mode",
      rationale: "No material stress signals detected in current context.",
      riskScore: 0,
    };
    const avgRisk =
      scenarios.length > 0
        ? scenarios.reduce((sum, s) => sum + s.riskScore, 0) / scenarios.length
        : 0;
    const confidencePenalty = clamp((50 - input.confidence) / 2, 0, 25);
    const strengthPenalty = clamp((50 - input.strength) / 2, 0, 25);
    const compositeRisk = clamp(
      avgRisk * 0.75 + topScenario.riskScore * 0.25,
      0,
      100,
    );
    const survivalProbability = clamp(
      Math.round(100 - compositeRisk - confidencePenalty - strengthPenalty),
      0,
      100,
    );
    const threshold = this.getThreshold();
    return {
      survivalProbability,
      blocked: survivalProbability < threshold,
      threshold,
      topScenario,
      scenarios,
    };
  }

  private buildScenarios(input: PreMortemInput): PreMortemScenario[] {
    const out: PreMortemScenario[] = [];
    const dir = input.direction === "long" ? "long" : "short";
    const sentiment = input.sentimentScore ?? 5;
    const funding = input.fundingRate ?? 0;
    const oi = input.openInterestChangePct ?? 0;
    const longShort = input.longShortRatio ?? 1;
    const fearGreed = input.fearGreedValue ?? 50;
    const dvol = input.dvol ?? 55;

    let narrativeRisk = 0;
    if (dir === "long" && sentiment <= 3) narrativeRisk += 65;
    if (dir === "short" && sentiment >= 8) narrativeRisk += 65;
    if (
      typeof input.sentimentRegime === "string" &&
      input.sentimentRegime.toLowerCase().includes("risk-off") &&
      dir === "long"
    ) {
      narrativeRisk += 20;
    }
    if (
      typeof input.sentimentRegime === "string" &&
      input.sentimentRegime.toLowerCase().includes("risk-on") &&
      dir === "short"
    ) {
      narrativeRisk += 20;
    }
    out.push({
      id: "narrative-whipsaw",
      title: "Narrative whipsaw",
      rationale:
        "Position direction conflicts with prevailing sentiment/regime narrative.",
      riskScore: clamp(narrativeRisk, 0, 100),
    });

    let squeezeRisk = 0;
    if (dir === "long" && funding > 0.03) squeezeRisk += 55;
    if (dir === "short" && funding < -0.03) squeezeRisk += 55;
    if (Math.abs(oi) > 8) squeezeRisk += 25;
    if (dir === "long" && longShort > 1.8) squeezeRisk += 15;
    if (dir === "short" && longShort < 0.7) squeezeRisk += 15;
    out.push({
      id: "funding-oi-squeeze",
      title: "Funding/OI squeeze",
      rationale:
        "Crowded positioning plus elevated funding/open-interest can force violent reversals.",
      riskScore: clamp(squeezeRisk, 0, 100),
    });

    let volatilityTrapRisk = 0;
    if (dvol >= 80) volatilityTrapRisk += 65;
    else if (dvol >= 70) volatilityTrapRisk += 45;
    if (Math.abs(oi) >= 10) volatilityTrapRisk += 15;
    out.push({
      id: "volatility-trap",
      title: "Volatility trap",
      rationale:
        "High implied volatility can invalidate clean setups via sudden range expansion.",
      riskScore: clamp(volatilityTrapRisk, 0, 100),
    });

    let confidenceMismatchRisk = 0;
    if (input.confidence < 45) confidenceMismatchRisk += 50;
    if (input.strength < 45) confidenceMismatchRisk += 35;
    out.push({
      id: "signal-fragility",
      title: "Signal fragility",
      rationale: "Signal quality is too fragile for current market stress.",
      riskScore: clamp(confidenceMismatchRisk, 0, 100),
    });

    let crowdingRisk = 0;
    if (dir === "long" && fearGreed > 80) crowdingRisk += 45;
    if (dir === "short" && fearGreed < 20) crowdingRisk += 45;
    if (Math.abs(oi) > 10) crowdingRisk += 20;
    out.push({
      id: "crowding-reversal",
      title: "Crowding reversal",
      rationale:
        "Extreme crowding plus stretched positioning can trigger abrupt squeeze/reversal.",
      riskScore: clamp(crowdingRisk, 0, 100),
    });

    return out;
  }
}
