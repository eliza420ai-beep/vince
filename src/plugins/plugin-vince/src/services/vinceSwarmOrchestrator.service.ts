import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { AgentVote, SwarmDirection } from "../types/swarm";
import type {
  VinceMarketRegimeService,
  MarketRegime,
} from "./marketRegime.service";
import type { VinceXSentimentService } from "./xSentiment.service";
import type {
  AggregatedSignal,
  VinceSignalAggregatorService,
} from "./signalAggregator.service";
import type { AggregatedTradeSignal } from "../types/paperTrading";
import { getBankrOrdersData } from "../providers/bankrOrders.provider";

export interface SwarmVoteContext {
  asset: string;
  vinceSignal: AggregatedSignal;
  tradeSignal: AggregatedTradeSignal;
  regime: MarketRegime | null;
}

function safeDirection(dir: string | undefined): SwarmDirection {
  if (dir === "long" || dir === "short" || dir === "neutral") return dir;
  return "neutral";
}

function parseBoolFlag(value: unknown, defaultValue = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (!v) return defaultValue;
    return v === "true" || v === "1" || v === "yes" || v === "y";
  }
  return defaultValue;
}

export class VinceSwarmOrchestratorService extends Service {
  static serviceType = "VINCE_SWARM_ORCHESTRATOR_SERVICE";
  capabilityDescription =
    "Collects AgentVote contributions for all VINCE agents using real data sources and rollout flags.";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceSwarmOrchestratorService> {
    return new VinceSwarmOrchestratorService(runtime);
  }

  async stop(): Promise<void> {
    // No background work
  }

  /**
   * Main entry: build votes for all enabled agents given the current trade context.
   */
  async collectVotes(ctx: SwarmVoteContext): Promise<AgentVote[]> {
    const votes: AgentVote[] = [];

    // VINCE is always included
    votes.push(this.buildVinceVote(ctx));

    // Other agents are gated by SWARM_INCLUDE_* flags so rollout can be phased.
    if (this.isAgentEnabled("ECHO")) {
      votes.push(this.buildEchoVote(ctx));
    }

    if (this.isAgentEnabled("ORACLE")) {
      votes.push(await this.buildOracleVote(ctx));
    }

    if (this.isAgentEnabled("SOLUS")) {
      votes.push(await this.buildSolusVote(ctx));
    }

    if (this.isAgentEnabled("OTAKU")) {
      votes.push(await this.buildOtakuVote());
    }

    if (this.isAgentEnabled("KELLY")) {
      votes.push(this.buildKellyVote(ctx));
    }

    if (this.isAgentEnabled("SENTINEL")) {
      votes.push(this.buildSentinelVote());
    }

    if (this.isAgentEnabled("ELIZA")) {
      votes.push(this.buildElizaVote());
    }

    if (this.isAgentEnabled("CLAWTERM")) {
      votes.push(this.buildClawtermVote());
    }

    if (this.isAgentEnabled("NAVAL")) {
      votes.push(this.buildNavalVote());
    }

    return votes;
  }

  private isAgentEnabled(agentKey: string): boolean {
    const settingKey = `SWARM_INCLUDE_${agentKey.toUpperCase()}`;
    const fromSettings = this.runtime.getSetting?.(settingKey);
    const fromEnv = process.env[settingKey];
    const raw = fromSettings ?? fromEnv;
    // Default: VINCE-only until flags are explicitly enabled.
    const defaultEnabled = false;
    return parseBoolFlag(raw, defaultEnabled);
  }

  // VINCE: uses aggregated trading signal directly.
  private buildVinceVote(ctx: SwarmVoteContext): AgentVote {
    const contributingSignals = Object.keys(
      ctx.tradeSignal.sourceBreakdown ?? {},
    );
    return {
      agentId: "vince",
      direction: ctx.vinceSignal.direction,
      confidence: ctx.tradeSignal.confidence / 100,
      supportingSignals:
        contributingSignals.length > 0
          ? contributingSignals
          : ["signal_aggregator"],
      riskAssessment: 0.5,
      reasoning: `VINCE aggregated signal for ${ctx.asset}`,
    };
  }

  // Echo: X sentiment for the asset via VinceXSentimentService.
  private buildEchoVote(ctx: SwarmVoteContext): AgentVote {
    const xSvc = this.runtime.getService(
      "VINCE_X_SENTIMENT_SERVICE",
    ) as VinceXSentimentService | null;

    if (!xSvc) {
      return {
        agentId: "echo",
        direction: "neutral",
        confidence: 0,
        supportingSignals: [],
        riskAssessment: 0.5,
        reasoning: "Echo sentiment unavailable",
      };
    }

    const s = xSvc.getTradingSentiment(ctx.asset);
    let direction: SwarmDirection = "neutral";
    if (s.confidence > 0) {
      if (s.sentiment === "bullish") direction = "long";
      else if (s.sentiment === "bearish") direction = "short";
    }

    const confidence = Math.max(0, Math.min(1, s.confidence));
    const riskAssessment = s.hasHighRiskEvent ? 0.8 : 0.5;

    return {
      agentId: "echo",
      direction,
      confidence,
      supportingSignals: ["x_sentiment"],
      riskAssessment,
      reasoning: `Echo CT sentiment for ${ctx.asset}: ${s.sentiment} (conf=${(
        confidence * 100
      ).toFixed(0)}%)`,
    };
  }

  // Oracle: use cached Polymarket-derived regime from ORACLE_REGIME provider when available.
  private async buildOracleVote(ctx: SwarmVoteContext): Promise<AgentVote> {
    try {
      const cacheEntry = await this.runtime.getCache<{
        regime: string;
        ts: number;
      }>("vince:oracle_regime");
      const regime = (cacheEntry?.regime ?? "uncertain").toLowerCase();

      let direction: SwarmDirection = "neutral";
      if (regime === "risk-on" || regime === "risk_on") direction = "long";
      else if (regime === "risk-off" || regime === "risk_off")
        direction = "short";

      const confidence = direction === "neutral" ? 0.2 : 0.4;
      const riskAssessment = regime === "uncertain" ? 0.5 : 0.7;

      return {
        agentId: "oracle",
        direction,
        confidence,
        supportingSignals: ["polymarket_regime"],
        riskAssessment,
        reasoning: `Oracle Polymarket regime for ${ctx.asset}: ${regime}`,
      };
    } catch (e) {
      logger.debug(`[VinceSwarmOrchestrator] Oracle regime unavailable: ${e}`);
      return {
        agentId: "oracle",
        direction: "neutral",
        confidence: 0.1,
        supportingSignals: [],
        riskAssessment: 0.5,
        reasoning: "Oracle regime unavailable",
      };
    }
  }

  // Solus: options skew + regime; for now use market regime only, neutral when absent.
  private async buildSolusVote(ctx: SwarmVoteContext): Promise<AgentVote> {
    const regimeSvc = this.runtime.getService(
      "VINCE_MARKET_REGIME_SERVICE",
    ) as VinceMarketRegimeService | null;

    let regime: MarketRegime | null = ctx.regime;
    if (!regime && regimeSvc) {
      try {
        regime = await regimeSvc.getRegime(ctx.asset);
      } catch {
        regime = null;
      }
    }

    if (!regime) {
      return {
        agentId: "solus",
        direction: "neutral",
        confidence: 0.1,
        supportingSignals: [],
        riskAssessment: 0.5,
        reasoning: "No regime data available for Solus",
      };
    }

    // Simple heuristic: trending → align with Vince, ranging → neutral, volatile → slight contrarian tilt.
    let direction: SwarmDirection = "neutral";
    let confidence = 0.25;
    let riskAssessment = 0.6;

    if (regime.regime === "trending") {
      direction = ctx.vinceSignal.direction;
      confidence = 0.35;
    } else if (regime.regime === "volatile") {
      direction =
        ctx.vinceSignal.direction === "long"
          ? "short"
          : ctx.vinceSignal.direction === "short"
            ? "long"
            : "neutral";
      confidence = 0.3;
      riskAssessment = 0.8;
    }

    return {
      agentId: "solus",
      direction,
      confidence,
      supportingSignals: ["market_regime"],
      riskAssessment,
      reasoning: `Solus options view via market regime=${regime.regime}`,
    };
  }

  // Otaku: presence of active BANKR orders = slightly more risk-on posture, but no directional bias without mapping.
  private async buildOtakuVote(): Promise<AgentVote> {
    try {
      const { summary } = await getBankrOrdersData(this.runtime);
      const hasOrders = summary.total > 0;
      return {
        agentId: "otaku",
        direction: "neutral",
        confidence: hasOrders ? 0.2 : 0.1,
        supportingSignals: hasOrders ? ["bankr_orders"] : [],
        riskAssessment: hasOrders ? 0.7 : 0.5,
        reasoning: hasOrders
          ? `Otaku has ${summary.total} active BANKR orders`
          : "No active BANKR orders",
      };
    } catch (e) {
      logger.debug(`[VinceSwarmOrchestrator] BANKR orders unavailable: ${e}`);
      return {
        agentId: "otaku",
        direction: "neutral",
        confidence: 0.1,
        supportingSignals: [],
        riskAssessment: 0.5,
        reasoning: "Otaku data unavailable",
      };
    }
  }

  // Kelly: macro/lifestyle risk preferences; here proxy via regime only.
  private buildKellyVote(ctx: SwarmVoteContext): AgentVote {
    const regime = ctx.regime;
    let direction: SwarmDirection = "neutral";
    let confidence = 0.2;

    if (regime) {
      if (regime.regime === "trending") {
        direction = "long";
        confidence = 0.3;
      } else if (regime.regime === "volatile") {
        direction = "short";
        confidence = 0.3;
      }
    }

    return {
      agentId: "kelly",
      direction,
      confidence,
      supportingSignals: ["market_regime"],
      riskAssessment: 0.6,
      reasoning: regime
        ? `Kelly macro tilt from regime=${regime.regime}`
        : "Kelly neutral (no clear macro tilt)",
    };
  }

  // Sentinel: meta-learning / system health – currently neutral placeholder.
  private buildSentinelVote(): AgentVote {
    return {
      agentId: "sentinel",
      direction: "neutral",
      confidence: 0.1,
      supportingSignals: [],
      riskAssessment: 0.4,
      reasoning: "Sentinel meta-learning not yet wired into swarm",
    };
  }

  // Eliza: research bias – currently neutral placeholder.
  private buildElizaVote(): AgentVote {
    return {
      agentId: "eliza",
      direction: "neutral",
      confidence: 0.1,
      supportingSignals: [],
      riskAssessment: 0.4,
      reasoning: "Eliza research bias not yet wired into swarm",
    };
  }

  // Clawterm: discovery terminal – currently neutral placeholder.
  private buildClawtermVote(): AgentVote {
    return {
      agentId: "clawterm",
      direction: "neutral",
      confidence: 0.1,
      supportingSignals: [],
      riskAssessment: 0.4,
      reasoning: "Clawterm discovery not yet wired into swarm",
    };
  }

  // Naval: philosophy-influenced bias – currently neutral placeholder.
  private buildNavalVote(): AgentVote {
    return {
      agentId: "naval",
      direction: "neutral",
      confidence: 0.1,
      supportingSignals: [],
      riskAssessment: 0.4,
      reasoning: "Naval philosophy not yet wired into swarm",
    };
  }
}
