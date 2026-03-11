import { Service, type IAgentRuntime, logger } from "@elizaos/core";

/**
 * VINCE Swarm Insights Service
 *
 * Mines SwarmCoordinationService state for human-readable patterns:
 * - Swarm-wide performance
 * - Regime-specific bandit behavior
 * - Top agents by reliability
 * - Strong cross-signal correlations
 */
export class VinceSwarmInsightsService extends Service {
  static serviceType = "VINCE_SWARM_INSIGHTS_SERVICE";

  capabilityDescription =
    "Analyzes swarm bandit state for emergent patterns and regime-wise insights.";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceSwarmInsightsService> {
    const service = new VinceSwarmInsightsService(runtime);
    logger.info("[SwarmInsights] Service initialized");
    return service;
  }

  async stop(): Promise<void> {
    // No-op – purely analytical, no own persistence
  }

  /**
   * High-level summary for dashboards or standups.
   */
  getInsights(): {
    headline: string[];
    regimes: Array<{
      regime: string;
      totalTrades: number;
      winRate: number;
      topSource: string | null;
      worstSource: string | null;
    }>;
    topAgents: Array<{
      agentId: string;
      accuracyRate: number;
      outcomesProvided: number;
    }>;
    strongCorrelations: Array<{
      signal: string;
      otherSignal: string;
      correlation: number;
    }>;
  } | null {
    const swarmService = this.runtime.getService("swarm-coordination") as {
      getSwarmStats?: () => any;
      getStrongCorrelations?: (threshold?: number) => any[];
    } | null;

    if (!swarmService?.getSwarmStats) {
      return null;
    }

    try {
      const stats = swarmService.getSwarmStats();
      if (!stats) return null;

      const regimes = Array.isArray(stats.regimes) ? stats.regimes : [];
      const topAgents = Array.isArray(stats.topPerformingAgents)
        ? stats.topPerformingAgents
        : [];

      const headline: string[] = [];
      const totalOutcomes = stats.totalOutcomes ?? 0;
      const consensusRate =
        typeof stats.averageConsensusRate === "number"
          ? (stats.averageConsensusRate * 100).toFixed(1)
          : "0.0";

      headline.push(
        `Swarm outcomes: ${totalOutcomes} · consensus rate ${consensusRate}%`,
      );

      const activeRegimes = regimes.filter(
        (r: any) => typeof r.totalTrades === "number" && r.totalTrades > 0,
      );
      if (activeRegimes.length > 0) {
        const bestRegime = [...activeRegimes].sort(
          (a: any, b: any) => (b.winRate ?? 0) - (a.winRate ?? 0),
        )[0];
        const winRatePct =
          typeof bestRegime.winRate === "number"
            ? (bestRegime.winRate * 100).toFixed(1)
            : "0.0";
        headline.push(
          `Best regime: ${bestRegime.regime} · ${winRatePct}% win over ${bestRegime.totalTrades} trades`,
        );
      }

      if (topAgents.length > 0) {
        const agent = topAgents[0];
        const accPct =
          typeof agent.accuracyRate === "number"
            ? (agent.accuracyRate * 100).toFixed(1)
            : String(agent.accuracyRate);
        headline.push(
          `Top agent: ${agent.agentId} · ${accPct}% accuracy over ${agent.outcomesProvided} outcomes`,
        );
      }

      const strongCorrelations =
        swarmService.getStrongCorrelations?.(0.6) ?? [];

      return {
        headline,
        regimes: activeRegimes.map((r: any) => ({
          regime: r.regime,
          totalTrades: r.totalTrades ?? 0,
          winRate: r.winRate ?? 0,
          topSource: r.topSource ?? null,
          worstSource: r.worstSource ?? null,
        })),
        topAgents: topAgents.map((a: any) => ({
          agentId: a.agentId,
          accuracyRate: a.accuracyRate,
          outcomesProvided: a.outcomesProvided,
        })),
        strongCorrelations: strongCorrelations.map((c: any) => ({
          signal: c.signal,
          otherSignal: c.otherSignal,
          correlation: c.correlation,
        })),
      };
    } catch (e) {
      logger.debug(`[SwarmInsights] Failed to build insights: ${e}`);
      return null;
    }
  }
}
