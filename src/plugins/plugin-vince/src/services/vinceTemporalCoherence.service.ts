import { Service, type IAgentRuntime } from "@elizaos/core";

export interface TemporalCoherenceInput {
  direction: "long" | "short";
  strength: number;
  confidence: number;
  regime?: string;
}

export interface TemporalCoherenceResult {
  alignmentScore: number;
  normalized: number;
  block: boolean;
  rationale: string;
}

export class VinceTemporalCoherenceService extends Service {
  static serviceType = "VINCE_TEMPORAL_COHERENCE_SERVICE";
  capabilityDescription = "Checks multi-timeframe alignment for entry quality";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceTemporalCoherenceService> {
    return new VinceTemporalCoherenceService(runtime);
  }

  async stop(): Promise<void> {}

  evaluate(input: TemporalCoherenceInput): TemporalCoherenceResult {
    let score = 1;
    if (input.strength >= 60) score += 1;
    if (input.confidence >= 60) score += 1;
    if (
      input.regime === "trending" ||
      input.regime === "bullish" ||
      input.regime === "bearish"
    ) {
      score += 0;
    } else if (input.regime === "volatile") {
      score = Math.max(0, score - 1);
    }
    score = Math.max(0, Math.min(3, score));
    const normalized = score / 3;
    const block = score <= 0;
    return {
      alignmentScore: score,
      normalized,
      block,
      rationale: `alignment=${score}/3 normalized=${normalized.toFixed(2)} regime=${input.regime ?? "unknown"}`,
    };
  }
}
