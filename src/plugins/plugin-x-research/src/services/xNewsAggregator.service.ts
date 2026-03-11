/**
 * X News Aggregator Service
 *
 * Exposes getTradingSentimentFromNews() for the paper trading signal aggregator
 * when X_NEWS_AS_AGGREGATOR_SOURCE=true. Wraps XNewsService.
 */

import { Service, logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import { initXClientFromEnv } from "./xClient.service";
import { getXNewsService } from "./xNews.service";

export class XNewsAggregatorService extends Service {
  static serviceType = "X_NEWS_AGGREGATOR_SERVICE";
  capabilityDescription =
    "X News sentiment for signal aggregator when X_NEWS_AS_AGGREGATOR_SOURCE=true";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<XNewsAggregatorService> {
    return new XNewsAggregatorService(runtime);
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

  async getTradingSentimentFromNews(): Promise<{
    sentiment: "bullish" | "bearish" | "neutral";
    confidence: number;
  }> {
    try {
      initXClientFromEnv(this.runtime);
    } catch (e) {
      logger.debug(
        `[XNewsAggregator] X client not configured: ${(e as Error).message}`,
      );
      return { sentiment: "neutral", confidence: 0 };
    }
    try {
      return await getXNewsService().getTradingSentimentFromNews();
    } catch (e) {
      logger.debug(
        `[XNewsAggregator] getTradingSentimentFromNews failed: ${(e as Error).message}`,
      );
      return { sentiment: "neutral", confidence: 0 };
    }
  }
}
