import { Service, type IAgentRuntime } from "@elizaos/core";
import {
  VinceXSourceAttributionService,
  type SufficiencySnapshot,
} from "./vinceXSourceAttribution.service";

export class VinceDataSufficiencyService extends Service {
  static serviceType = "VINCE_DATA_SUFFICIENCY_SERVICE";
  capabilityDescription = "Grades proof data sufficiency for allocation safety";

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
  ): Promise<VinceDataSufficiencyService> {
    return new VinceDataSufficiencyService(runtime);
  }

  async stop(): Promise<void> {}

  getSnapshot(windowDays = 30): SufficiencySnapshot {
    return this.attribution.getSufficiencySnapshot(windowDays);
  }

  getBlockingTasks(windowDays = 30): Array<{
    id: string;
    title: string;
    blocker: string;
    action: string;
  }> {
    return this.attribution.getSufficiencyTasks(windowDays);
  }
}
