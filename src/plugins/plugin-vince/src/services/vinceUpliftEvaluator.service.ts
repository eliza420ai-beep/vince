import { Service, type IAgentRuntime } from "@elizaos/core";
import {
  VinceXSourceAttributionService,
  type CausalUpliftSnapshot,
  type UpliftSnapshot,
} from "./vinceXSourceAttribution.service";

export class VinceUpliftEvaluatorService extends Service {
  static serviceType = "VINCE_UPLIFT_EVALUATOR_SERVICE";
  capabilityDescription =
    "Computes rolling uplift snapshots by stage and regime";

  private readonly attribution: VinceXSourceAttributionService;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.attribution = new VinceXSourceAttributionService(
      undefined,
      runtime as unknown as { databaseAdapter?: { db?: unknown } },
    );
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceUpliftEvaluatorService> {
    return new VinceUpliftEvaluatorService(runtime);
  }

  async stop(): Promise<void> {}

  getSnapshot(windowDays = 30): UpliftSnapshot {
    return this.attribution.getUpliftSnapshot(windowDays);
  }

  getCausalSnapshot(params?: {
    windowDays?: number;
    minimumEffect?: number;
    minimumSamplesPerArm?: number;
  }): CausalUpliftSnapshot {
    return this.attribution.getCausalUpliftSnapshot(params);
  }
}
