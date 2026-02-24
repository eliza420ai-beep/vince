import { Service, type IAgentRuntime } from "@elizaos/core";

export type NarrativePhase =
  | "inception"
  | "growth"
  | "peak"
  | "decline"
  | "uncertain";

export interface NarrativeRadarInput {
  direction: "long" | "short";
  sentimentScore?: number;
  fearGreedValue?: number;
  fundingRate?: number;
  openInterestChangePct?: number;
}

export interface NarrativeRadarResult {
  phase: NarrativePhase;
  score: number;
  block: boolean;
  rationale: string;
}

export class VinceNarrativeRadarService extends Service {
  static serviceType = "VINCE_NARRATIVE_RADAR_SERVICE";
  capabilityDescription =
    "Classifies market narrative phase and overlays entry risk";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceNarrativeRadarService> {
    return new VinceNarrativeRadarService(runtime);
  }

  async stop(): Promise<void> {}

  classify(input: NarrativeRadarInput): NarrativeRadarResult {
    const s = input.sentimentScore ?? 5;
    const fg = input.fearGreedValue ?? 50;
    const oi = input.openInterestChangePct ?? 0;
    const f = input.fundingRate ?? 0;

    let phase: NarrativePhase = "uncertain";
    if (s >= 8 && fg >= 75 && oi > 8 && f > 0.02) phase = "peak";
    else if (s >= 6 && fg >= 55 && oi > 2) phase = "growth";
    else if (s <= 3 && fg <= 30 && oi < -2) phase = "decline";
    else if (s >= 4 && s <= 6 && Math.abs(oi) <= 3) phase = "inception";

    const againstLong = input.direction === "long" && phase === "peak";
    const againstShort = input.direction === "short" && phase === "decline";
    const block = againstLong || againstShort;
    const score =
      phase === "peak" || phase === "decline"
        ? 80
        : phase === "growth"
          ? 65
          : phase === "inception"
            ? 55
            : 50;
    const rationale = `phase=${phase} s=${s} fg=${fg} oi=${oi.toFixed(1)} funding=${f.toFixed(4)}`;
    return { phase, score, block, rationale };
  }
}
