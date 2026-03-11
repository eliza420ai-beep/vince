/**
 * X Trends Signal Service
 *
 * Exposes getTrendingAssets() for the paper trading signal aggregator:
 * when an asset is trending or has a volume spike on X, add a soft "X trending" factor.
 */

import { Service, logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import { initXClientFromEnv } from "./xClient.service";
import { getXTrendsService } from "./xTrends.service";

export class XTrendsSignalService extends Service {
  static serviceType = "X_TRENDS_SIGNAL_SERVICE";
  capabilityDescription =
    "Trending assets (X) for soft aggregator factor when plugin-x-research loaded";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<XTrendsSignalService> {
    return new XTrendsSignalService(runtime);
  }

  async stop(): Promise<void> {}

  isConfigured(): boolean {
    try {
      initXClientFromEnv(this.runtime);
      return true;
    } catch {
      return false;
    }
  }

  /** Asset symbols (e.g. BTC, ETH, SOL, HYPE) that are trending or had a volume spike. */
  async getTrendingAssets(): Promise<string[]> {
    try {
      initXClientFromEnv(this.runtime);
    } catch (e) {
      logger.debug(
        `[XTrendsSignal] X client not configured: ${(e as Error).message}`,
      );
      return [];
    }
    try {
      return await getXTrendsService().getTrendingAssets();
    } catch (e) {
      logger.debug(
        `[XTrendsSignal] getTrendingAssets failed: ${(e as Error).message}`,
      );
      return [];
    }
  }
}
