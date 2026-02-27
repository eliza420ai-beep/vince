/**
 * 🌊 SWARM COORDINATION SERVICE
 *
 * Orchestrates multi-agent Thompson Sampling bandit learning across
 * all VINCE agents for collective intelligence and shared learning.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";
import type { AgentVote, SwarmConsensus } from "../types/swarm";

// Agent specializations
export const AGENT_SPECIALIZATIONS = {
  vince: {
    role: "market_data",
    sources: [
      "BinanceTopTraders",
      "CoinGlass",
      "MarketRegime",
      "DeribitIVSkew",
      "HyperliquidBias",
    ],
    expertise: "technical_analysis",
  },
  echo: {
    role: "sentiment",
    sources: [
      "XSentiment",
      "NewsSentiment",
      "SocialMomentum",
      "InfluencerSignals",
    ],
    expertise: "social_analysis",
  },
  oracle: {
    role: "predictions",
    sources: [
      "PolymarketOdds",
      "PredictionAccuracy",
      "CrowdWisdom",
      "EventProbabilities",
    ],
    expertise: "probability_analysis",
  },
  solus: {
    role: "options",
    sources: [
      "OptionsFlow",
      "IVRank",
      "SkewSignals",
      "VolSurface",
      "DeribitPutCallRatio",
    ],
    expertise: "volatility_analysis",
  },
  otaku: {
    role: "defi",
    sources: [
      "OnChainMetrics",
      "DeFiYields",
      "LiquidityFlows",
      "WhaleMovements",
    ],
    expertise: "onchain_analysis",
  },
  kelly: {
    role: "macro",
    sources: [
      "MacroTrends",
      "LifestylePatterns",
      "RiskPreferences",
      "SeasonalFactors",
    ],
    expertise: "macro_analysis",
  },
  sentinel: {
    role: "meta",
    sources: [
      "CodePatterns",
      "SystemPerformance",
      "MetaLearning",
      "ArchitecturalSignals",
    ],
    expertise: "system_analysis",
  },
  eliza: {
    role: "research",
    sources: [
      "ResearchSynthesis",
      "KnowledgeCuration",
      "DataDiscovery",
      "PatternRecognition",
    ],
    expertise: "knowledge_synthesis",
  },
  clawterm: {
    role: "discovery",
    sources: ["DataDiscovery", "ResearchCoordination", "InformationRetrieval"],
    expertise: "information_retrieval",
  },
};

interface SwarmBanditState {
  // Global shared state
  globalSources: Record<string, BetaParams>;
  totalSwarmOutcomes: number;

  // Agent contributions
  agentContributions: Record<
    string,
    {
      outcomesProvided: number;
      accuracyRate: number;
      specialtyScore: number;
      lastActive: number;
    }
  >;

  // Cross-agent learning
  signalCorrelations: Record<string, Record<string, number>>;
  agentReliability: Record<string, BetaParams>;
  consensusHistory: ConsensusDecision[];

  // Regime-conditional learning (per PRD_REGIME_CONDITIONAL_BANDIT)
  regimeSources: Record<SwarmMarketRegime, Record<string, BetaParams>>;
  regimeHistory: Array<{
    regime: SwarmMarketRegime;
    startedAt: number;
    endedAt?: number;
    outcomesRecorded: number;
  }>;
  regimePerformance: Record<
    SwarmMarketRegime,
    {
      totalTrades: number;
      wins: number;
      topSource: string | null;
      worstSource: string | null;
      lastActive: number | null;
    }
  >;

  // Swarm metadata
  swarmVersion: string;
  lastSwarmUpdate: number;
}

// High-level market regimes for swarm bandit learning
type SwarmMarketRegime =
  | "TRENDING_BULL"
  | "CHOPPY"
  | "CAPITULATION"
  | "EUPHORIA"
  | "RECOVERY"
  | "UNKNOWN";

interface BetaParams {
  alpha: number;
  beta: number;
  count: number;
  lastUpdated: number;
}

interface ConsensusDecision {
  id: string;
  consensus: SwarmConsensus;
  outcome?: "win" | "loss";
  pnlPct?: number;
  timestamp: number;
}

export class SwarmCoordinationService extends Service {
  static serviceType = "swarm-coordination";

  capabilityDescription =
    "Multi-agent swarm learning with Thompson Sampling bandit coordination";

  private swarmState: SwarmBanditState | null = null;
  private swarmStateFile: string;
  private agentCommunicationBus: Map<string, any[]> = new Map();
  private hasDb = false;
  private readonly dbTable = "plugin_vince.swarm_bandit_state";

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.swarmStateFile = path.join(PERSISTENCE_DIR, "swarm-bandit-state.json");
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<SwarmCoordinationService> {
    const service = new SwarmCoordinationService(runtime);
    await service.initialize();
    logger.info(
      "[SwarmCoordination] 🌊 Multi-agent swarm learning initialized",
    );
    return service;
  }

  async stop(): Promise<void> {
    await this.saveSwarmState();
    logger.info("[SwarmCoordination] 🌊 Swarm coordination stopped");
  }

  private async initialize(): Promise<void> {
    await this.initDbIfAvailable();

    // Create persistence directory if needed
    if (!fs.existsSync(path.dirname(this.swarmStateFile))) {
      fs.mkdirSync(path.dirname(this.swarmStateFile), { recursive: true });
    }

    // Load existing swarm state or initialize
    await this.loadSwarmState();

    // Initialize agent communication channels
    this.initializeAgentCommunication();

    logger.info(
      `[SwarmCoordination] Initialized with ${Object.keys(this.swarmState!.agentContributions).length} agents`,
    );
  }

  /**
   * Best-effort detection of a SQL connection and optional swarm state table.
   * When available, DB becomes the primary source of truth with JSON as backup.
   */
  private async initDbIfAvailable(): Promise<void> {
    try {
      const conn = await this.runtime.getConnection?.();
      if (!conn || typeof (conn as { query?: unknown }).query !== "function") {
        return;
      }
      const client = conn as {
        query: (text: string, values?: unknown[]) => Promise<{ rows?: any[] }>;
      };

      // Ensure table exists (id text primary key, state jsonb, updated_at timestamptz)
      const createSql = `
        CREATE TABLE IF NOT EXISTS ${this.dbTable} (
          id TEXT PRIMARY KEY,
          state JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await client.query(createSql);
      this.hasDb = true;
      logger.debug(
        "[SwarmCoordination] DB persistence enabled for swarm state",
      );
    } catch (e) {
      this.hasDb = false;
      logger.debug(
        `[SwarmCoordination] DB persistence unavailable (falling back to JSON only): ${e}`,
      );
    }
  }

  private async loadSwarmState(): Promise<void> {
    try {
      // Prefer DB state when available; JSON is a fallback / bootstrap.
      if (this.hasDb) {
        try {
          const conn = await this.runtime.getConnection?.();
          const client = conn as {
            query: (
              text: string,
              values?: unknown[],
            ) => Promise<{ rows?: any[] }>;
          };
          const res = await client.query(
            `SELECT state FROM ${this.dbTable} WHERE id = $1 LIMIT 1`,
            ["default"],
          );
          const row = res.rows?.[0];
          if (row && row.state) {
            const raw = row.state;
            this.swarmState =
              typeof raw === "string"
                ? (JSON.parse(raw) as SwarmBanditState)
                : (raw as SwarmBanditState);
          }
        } catch (e) {
          logger.debug(
            `[SwarmCoordination] DB load failed, falling back to JSON: ${e}`,
          );
        }
      }

      if (!this.swarmState && fs.existsSync(this.swarmStateFile)) {
        const data = fs.readFileSync(this.swarmStateFile, "utf8");
        this.swarmState = JSON.parse(data);

        // Backfill regime-conditional fields for older state files
        const state = this.swarmState as SwarmBanditState;

        if (!state.regimeSources) {
          state.regimeSources = {
            TRENDING_BULL: {},
            CHOPPY: {},
            CAPITULATION: {},
            EUPHORIA: {},
            RECOVERY: {},
            UNKNOWN: {},
          };
        }
        if (!state.regimeHistory) {
          state.regimeHistory = [];
        }
        if (!state.regimePerformance) {
          state.regimePerformance = {
            TRENDING_BULL: {
              totalTrades: 0,
              wins: 0,
              topSource: null,
              worstSource: null,
              lastActive: null,
            },
            CHOPPY: {
              totalTrades: 0,
              wins: 0,
              topSource: null,
              worstSource: null,
              lastActive: null,
            },
            CAPITULATION: {
              totalTrades: 0,
              wins: 0,
              topSource: null,
              worstSource: null,
              lastActive: null,
            },
            EUPHORIA: {
              totalTrades: 0,
              wins: 0,
              topSource: null,
              worstSource: null,
              lastActive: null,
            },
            RECOVERY: {
              totalTrades: 0,
              wins: 0,
              topSource: null,
              worstSource: null,
              lastActive: null,
            },
            UNKNOWN: {
              totalTrades: 0,
              wins: 0,
              topSource: null,
              worstSource: null,
              lastActive: null,
            },
          };
        }
        this.swarmState = state;
        logger.info("[SwarmCoordination] Loaded existing swarm state");
      } else {
        this.swarmState = this.createInitialSwarmState();
        await this.saveSwarmState();
        logger.info("[SwarmCoordination] Created new swarm state");
      }
    } catch (error) {
      logger.error(`[SwarmCoordination] Error loading swarm state: ${error}`);
      this.swarmState = this.createInitialSwarmState();
    }
  }

  private createInitialSwarmState(): SwarmBanditState {
    const agentContributions: Record<string, any> = {};

    // Initialize each agent's contribution tracking
    Object.keys(AGENT_SPECIALIZATIONS).forEach((agentId) => {
      agentContributions[agentId] = {
        outcomesProvided: 0,
        accuracyRate: 0.5, // Start neutral
        specialtyScore: 1.0,
        lastActive: Date.now(),
      };
    });

    const emptyRegimeSources: Record<
      SwarmMarketRegime,
      Record<string, BetaParams>
    > = {
      TRENDING_BULL: {},
      CHOPPY: {},
      CAPITULATION: {},
      EUPHORIA: {},
      RECOVERY: {},
      UNKNOWN: {},
    };

    const emptyRegimePerformance: SwarmBanditState["regimePerformance"] = {
      TRENDING_BULL: {
        totalTrades: 0,
        wins: 0,
        topSource: null,
        worstSource: null,
        lastActive: null,
      },
      CHOPPY: {
        totalTrades: 0,
        wins: 0,
        topSource: null,
        worstSource: null,
        lastActive: null,
      },
      CAPITULATION: {
        totalTrades: 0,
        wins: 0,
        topSource: null,
        worstSource: null,
        lastActive: null,
      },
      EUPHORIA: {
        totalTrades: 0,
        wins: 0,
        topSource: null,
        worstSource: null,
        lastActive: null,
      },
      RECOVERY: {
        totalTrades: 0,
        wins: 0,
        topSource: null,
        worstSource: null,
        lastActive: null,
      },
      UNKNOWN: {
        totalTrades: 0,
        wins: 0,
        topSource: null,
        worstSource: null,
        lastActive: null,
      },
    };

    return {
      globalSources: {},
      totalSwarmOutcomes: 0,
      agentContributions,
      signalCorrelations: {},
      agentReliability: {},
      consensusHistory: [],
      swarmVersion: "1.0.0",
      lastSwarmUpdate: Date.now(),
      regimeSources: emptyRegimeSources,
      regimeHistory: [],
      regimePerformance: emptyRegimePerformance,
    };
  }

  private async saveSwarmState(): Promise<void> {
    try {
      if (this.swarmState) {
        this.swarmState.lastSwarmUpdate = Date.now();
        fs.writeFileSync(
          this.swarmStateFile,
          JSON.stringify(this.swarmState, null, 2),
        );

        if (this.hasDb) {
          try {
            const conn = await this.runtime.getConnection?.();
            const client = conn as {
              query: (
                text: string,
                values?: unknown[],
              ) => Promise<{ rows?: any[] }>;
            };
            const sql = `
              INSERT INTO ${this.dbTable} (id, state, updated_at)
              VALUES ($1, $2, NOW())
              ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at
            `;
            await client.query(sql, ["default", this.swarmState]);
          } catch (e) {
            logger.debug(
              `[SwarmCoordination] DB save skipped (JSON state still updated): ${e}`,
            );
          }
        }
      }
    } catch (error) {
      logger.error(`[SwarmCoordination] Error saving swarm state: ${error}`);
    }
  }

  private initializeAgentCommunication(): void {
    Object.keys(AGENT_SPECIALIZATIONS).forEach((agentId) => {
      this.agentCommunicationBus.set(agentId, []);
    });
  }

  // 🧠 CORE SWARM LEARNING METHODS

  /**
   * Agent contributes signals and gets swarm-enhanced weights
   */
  async contributeSignals(
    agentId: string,
    signals: string[],
    confidence: number,
  ): Promise<Record<string, number>> {
    if (!this.swarmState) throw new Error("Swarm not initialized");

    // Update agent activity
    if (!this.swarmState.agentContributions[agentId]) {
      this.swarmState.agentContributions[agentId] = {
        outcomesProvided: 0,
        accuracyRate: 0.5,
        specialtyScore: 1.0,
        lastActive: Date.now(),
      };
    }
    this.swarmState.agentContributions[agentId].lastActive = Date.now();

    // Get swarm-enhanced weights for signals
    const enhancedWeights: Record<string, number> = {};

    for (const signal of signals) {
      // Individual signal weight from global bandit learning
      const globalWeight = this.getGlobalSignalWeight(signal);

      // Agent reliability multiplier
      const agentReliability = this.getAgentReliability(agentId);

      // Cross-agent correlation bonus
      const correlationBonus = this.getCorrelationBonus(signal, agentId);

      // Combined swarm weight
      enhancedWeights[signal] =
        globalWeight * agentReliability * (1 + correlationBonus);
    }

    // Broadcast signals to other agents for correlation learning
    await this.broadcastSignals(agentId, signals, confidence);

    return enhancedWeights;
  }

  /**
   * Record outcome from multi-agent consensus decision
   */
  async recordSwarmOutcome(
    consensusId: string,
    outcome: "win" | "loss",
    pnlPct: number,
    contributingAgents: string[],
    regimeKey?: SwarmMarketRegime,
  ): Promise<void> {
    if (!this.swarmState) return;

    // Find consensus decision
    const decision = this.swarmState.consensusHistory.find(
      (d) => d.id === consensusId,
    );
    if (!decision) {
      logger.warn(
        `[SwarmCoordination] Consensus decision ${consensusId} not found`,
      );
      return;
    }

    // Update decision outcome
    decision.outcome = outcome;
    decision.pnlPct = pnlPct;

    // Update global signal sources
    const allSignals = decision.consensus.votes.flatMap(
      (vote) => vote.supportingSignals,
    );
    await this.updateGlobalSignalSources(
      allSignals,
      outcome === "win",
      pnlPct,
      regimeKey,
    );

    // Update agent reliability
    await this.updateAgentReliability(
      contributingAgents,
      outcome === "win",
      pnlPct,
    );

    // Learn signal correlations
    await this.learnSignalCorrelations(decision.consensus.votes);

    // Increment swarm outcomes
    this.swarmState.totalSwarmOutcomes++;

    await this.saveSwarmState();

    logger.info(
      `[SwarmCoordination] Recorded swarm outcome: ${outcome} (${pnlPct}%) from ${contributingAgents.length} agents`,
    );
  }

  /**
   * Get consensus decision from multiple agents
   */
  async getSwarmConsensus(
    votes: AgentVote[],
    minimumAgents: number = 3,
    consensusThreshold: number = 0.6,
  ): Promise<SwarmConsensus> {
    if (votes.length < minimumAgents) {
      return {
        votes,
        weightedDirection: "neutral",
        confidenceLevel: 0,
        dissentScore: 1.0,
        participatingAgents: votes.map((v) => v.agentId),
        consensusReached: false,
        decisionTimestamp: Date.now(),
      };
    }

    // Calculate weighted votes based on agent reliability
    let longWeight = 0;
    let shortWeight = 0;
    let totalWeight = 0;

    for (const vote of votes) {
      const agentReliability = this.getAgentReliability(vote.agentId);
      const weight = vote.confidence * agentReliability;

      if (vote.direction === "long") {
        longWeight += weight;
      } else if (vote.direction === "short") {
        shortWeight += weight;
      }

      totalWeight += weight;
    }

    // Determine consensus
    const longRatio = longWeight / totalWeight;
    const shortRatio = shortWeight / totalWeight;

    let weightedDirection: "long" | "short" | "neutral";
    let confidenceLevel: number;
    let consensusReached: boolean;

    if (longRatio >= consensusThreshold) {
      weightedDirection = "long";
      confidenceLevel = longRatio;
      consensusReached = true;
    } else if (shortRatio >= consensusThreshold) {
      weightedDirection = "short";
      confidenceLevel = shortRatio;
      consensusReached = true;
    } else {
      weightedDirection = "neutral";
      confidenceLevel = Math.max(longRatio, shortRatio);
      consensusReached = false;
    }

    // Calculate dissent score (0 = perfect agreement, 1 = maximum disagreement)
    const dissentScore = 1 - Math.abs(longRatio - shortRatio);

    const consensus: SwarmConsensus = {
      votes,
      weightedDirection,
      confidenceLevel,
      dissentScore,
      participatingAgents: votes.map((v) => v.agentId),
      consensusReached,
      decisionTimestamp: Date.now(),
    };

    // Store consensus decision for outcome tracking
    const decisionId = `swarm-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const decision: ConsensusDecision = {
      id: decisionId,
      consensus,
      timestamp: Date.now(),
    };

    // Attach consensusId back onto the consensus object so callers
    // (e.g. paper trading service) can attribute outcomes later.
    consensus.consensusId = decisionId;

    this.swarmState!.consensusHistory.push(decision);

    // Keep only recent decisions (last 1000)
    if (this.swarmState!.consensusHistory.length > 1000) {
      this.swarmState!.consensusHistory =
        this.swarmState!.consensusHistory.slice(-1000);
    }

    await this.saveSwarmState();

    return consensus;
  }

  // 🔧 HELPER METHODS

  private getGlobalSignalWeight(signal: string): number {
    if (!this.swarmState?.globalSources[signal]) {
      return 1.0; // Default weight for new signals
    }

    const source = this.swarmState.globalSources[signal];
    // Thompson Sampling: sample from Beta distribution
    return this.betaSample(source.alpha, source.beta);
  }

  private getAgentReliability(agentId: string): number {
    const contribution = this.swarmState?.agentContributions[agentId];
    if (!contribution || contribution.outcomesProvided < 3) {
      return 1.0; // Default reliability for new agents
    }

    // Combine accuracy rate with specialty score
    return contribution.accuracyRate * contribution.specialtyScore;
  }

  private getCorrelationBonus(signal: string, agentId: string): number {
    const correlations = this.swarmState?.signalCorrelations[signal];
    if (!correlations) return 0;

    // Find correlated signals from other agents
    let totalBonus = 0;
    let correlationCount = 0;

    Object.entries(correlations).forEach(([otherSignal, correlation]) => {
      if (Math.abs(correlation) > 0.5) {
        // Significant correlation
        totalBonus += correlation * 0.1; // 10% bonus per correlated signal
        correlationCount++;
      }
    });

    return correlationCount > 0 ? totalBonus / correlationCount : 0;
  }

  private async broadcastSignals(
    fromAgent: string,
    signals: string[],
    confidence: number,
  ): Promise<void> {
    // Add to communication bus for other agents to learn correlations
    const message = {
      fromAgent,
      signals,
      confidence,
      timestamp: Date.now(),
    };

    Object.keys(AGENT_SPECIALIZATIONS).forEach((agentId) => {
      if (agentId !== fromAgent) {
        this.agentCommunicationBus.get(agentId)?.push(message);
      }
    });
  }

  private async updateGlobalSignalSources(
    signals: string[],
    isWin: boolean,
    pnlPct: number,
    regimeKey?: SwarmMarketRegime,
  ): Promise<void> {
    if (!this.swarmState) return;

    const winBonus = Math.min(1.0, Math.abs(pnlPct) / 2.0);

    for (const signal of signals) {
      if (!this.swarmState.globalSources[signal]) {
        this.swarmState.globalSources[signal] = {
          alpha: 1,
          beta: 1,
          count: 0,
          lastUpdated: Date.now(),
        };
      }

      const source = this.swarmState.globalSources[signal];

      if (isWin) {
        source.alpha += 1 + winBonus;
      } else {
        source.beta += 1 + winBonus;
      }

      source.count++;
      source.lastUpdated = Date.now();
    }

    // Regime-conditional pools: track separate Beta params per SwarmMarketRegime
    if (regimeKey && this.swarmState.regimeSources[regimeKey]) {
      const regimePool = this.swarmState.regimeSources[regimeKey];
      for (const signal of signals) {
        if (!regimePool[signal]) {
          regimePool[signal] = {
            alpha: 1,
            beta: 1,
            count: 0,
            lastUpdated: Date.now(),
          };
        }

        const regimeSource = regimePool[signal];
        if (isWin) {
          regimeSource.alpha += 1 + winBonus;
        } else {
          regimeSource.beta += 1 + winBonus;
        }
        regimeSource.count++;
        regimeSource.lastUpdated = Date.now();
      }

      // Update per-regime performance summary
      const perf = this.swarmState.regimePerformance[regimeKey];
      perf.totalTrades += 1;
      if (isWin) perf.wins += 1;
      perf.lastActive = Date.now();

      // Derive top and worst sources by empirical win rate (only for sufficiently observed arms)
      let topSource: string | null = perf.topSource;
      let worstSource: string | null = perf.worstSource;
      let topWinRate = -1;
      let worstWinRate = Number.POSITIVE_INFINITY;

      for (const [src, params] of Object.entries(regimePool)) {
        if (params.count < 3) continue;
        const winRate = params.alpha / (params.alpha + params.beta);
        if (winRate > topWinRate) {
          topWinRate = winRate;
          topSource = src;
        }
        if (winRate < worstWinRate) {
          worstWinRate = winRate;
          worstSource = src;
        }
      }

      perf.topSource = topSource;
      perf.worstSource = worstSource;

      // Maintain simple regime history timeline
      const history = this.swarmState.regimeHistory;
      const now = Date.now();
      const last = history[history.length - 1];
      if (!last || last.regime !== regimeKey) {
        if (last && last.endedAt == null) {
          last.endedAt = now;
        }
        history.push({
          regime: regimeKey,
          startedAt: now,
          outcomesRecorded: 1,
        });
      } else {
        last.outcomesRecorded += 1;
        last.endedAt = now;
      }
    }
  }

  private async updateAgentReliability(
    agentIds: string[],
    isWin: boolean,
    pnlPct: number,
  ): Promise<void> {
    if (!this.swarmState) return;

    for (const agentId of agentIds) {
      const contribution = this.swarmState.agentContributions[agentId];
      if (!contribution) continue;

      contribution.outcomesProvided++;

      // Update accuracy rate using exponential moving average
      const alpha = 0.1; // Learning rate
      const outcome = isWin ? 1 : 0;
      contribution.accuracyRate =
        (1 - alpha) * contribution.accuracyRate + alpha * outcome;

      // Update specialty score based on performance in domain
      const specialization =
        AGENT_SPECIALIZATIONS[agentId as keyof typeof AGENT_SPECIALIZATIONS];
      if (specialization) {
        const performanceMultiplier = isWin ? 1.05 : 0.95;
        contribution.specialtyScore = Math.max(
          0.1,
          Math.min(2.0, contribution.specialtyScore * performanceMultiplier),
        );
      }
    }
  }

  private async learnSignalCorrelations(votes: AgentVote[]): Promise<void> {
    if (!this.swarmState) return;

    // Learn correlations between signals from different agents
    for (let i = 0; i < votes.length; i++) {
      for (let j = i + 1; j < votes.length; j++) {
        const vote1 = votes[i];
        const vote2 = votes[j];

        // Skip if same agent
        if (vote1.agentId === vote2.agentId) continue;

        // Calculate correlation between signal sets
        for (const signal1 of vote1.supportingSignals) {
          for (const signal2 of vote2.supportingSignals) {
            if (signal1 === signal2) continue;

            // Direction agreement bonus
            const agreementBonus =
              vote1.direction === vote2.direction ? 0.1 : -0.1;

            // Update correlation matrix
            if (!this.swarmState.signalCorrelations[signal1]) {
              this.swarmState.signalCorrelations[signal1] = {};
            }

            const currentCorrelation =
              this.swarmState.signalCorrelations[signal1][signal2] || 0;
            this.swarmState.signalCorrelations[signal1][signal2] =
              0.9 * currentCorrelation + 0.1 * agreementBonus;
          }
        }
      }
    }
  }

  private betaSample(alpha: number, beta: number): number {
    // Simplified beta sampling for Thompson Sampling
    const mean = alpha / (alpha + beta);
    const variance =
      (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    const noise = (Math.random() - 0.5) * Math.sqrt(variance) * 2;
    return Math.max(0.1, Math.min(2.0, mean + noise));
  }

  // 📊 PUBLIC QUERY METHODS

  getSwarmStats(): any {
    if (!this.swarmState) return null;

    return {
      totalOutcomes: this.swarmState.totalSwarmOutcomes,
      activeAgents: Object.keys(this.swarmState.agentContributions).length,
      trackedSignals: Object.keys(this.swarmState.globalSources).length,
      recentDecisions: this.swarmState.consensusHistory.length,
      averageConsensusRate: this.calculateConsensusRate(),
      topPerformingAgents: this.getTopPerformingAgents(3),
      signalCorrelations: Object.keys(this.swarmState.signalCorrelations)
        .length,
      regimes: Object.entries(this.swarmState.regimePerformance).map(
        ([regime, perf]) => ({
          regime,
          totalTrades: perf.totalTrades,
          wins: perf.wins,
          winRate: perf.totalTrades > 0 ? perf.wins / perf.totalTrades : 0,
          topSource: perf.topSource,
          worstSource: perf.worstSource,
          lastActive: perf.lastActive,
        }),
      ),
    };
  }

  /**
   * Latest consensus snapshot for narrative/UX purposes.
   */
  getLatestConsensus(): SwarmConsensus | null {
    if (!this.swarmState || this.swarmState.consensusHistory.length === 0) {
      return null;
    }
    const last =
      this.swarmState.consensusHistory[
        this.swarmState.consensusHistory.length - 1
      ];
    return last.consensus;
  }

  getAgentPerformance(): any {
    if (!this.swarmState) return {};

    return Object.entries(this.swarmState.agentContributions).map(
      ([agentId, contrib]) => ({
        agentId,
        accuracyRate: (contrib.accuracyRate * 100).toFixed(1) + "%",
        outcomesProvided: contrib.outcomesProvided,
        specialtyScore: contrib.specialtyScore.toFixed(2),
        specialization:
          AGENT_SPECIALIZATIONS[agentId as keyof typeof AGENT_SPECIALIZATIONS]
            ?.expertise || "unknown",
      }),
    );
  }

  private calculateConsensusRate(): number {
    if (!this.swarmState || this.swarmState.consensusHistory.length === 0)
      return 0;

    const recentDecisions = this.swarmState.consensusHistory.slice(-100);
    const consensusCount = recentDecisions.filter(
      (d) => d.consensus.consensusReached,
    ).length;
    return consensusCount / recentDecisions.length;
  }

  private getTopPerformingAgents(count: number): any[] {
    if (!this.swarmState) return [];

    return Object.entries(this.swarmState.agentContributions)
      .sort((a, b) => b[1].accuracyRate - a[1].accuracyRate)
      .slice(0, count)
      .map(([agentId, contrib]) => ({
        agentId,
        accuracyRate: contrib.accuracyRate,
        outcomesProvided: contrib.outcomesProvided,
      }));
  }

  /**
   * Return the strongest learned signal correlations across agents,
   * sorted by absolute correlation strength (limited to top 20).
   */
  getStrongCorrelations(threshold: number = 0.5): Array<{
    signal: string;
    otherSignal: string;
    correlation: number;
  }> {
    if (!this.swarmState) return [];

    const results: Array<{
      signal: string;
      otherSignal: string;
      correlation: number;
    }> = [];

    for (const [signal, row] of Object.entries(
      this.swarmState.signalCorrelations,
    )) {
      for (const [other, value] of Object.entries(row)) {
        if (Math.abs(value) >= threshold) {
          results.push({ signal, otherSignal: other, correlation: value });
        }
      }
    }

    return results
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
      .slice(0, 20);
  }

  /**
   * Get empirical win rate for a given signal source, optionally for a specific regime.
   * Falls back to global pool when regime-specific data is sparse or missing.
   */
  getSourceWinRate(
    signal: string,
    regimeKey?: SwarmMarketRegime,
  ): number | null {
    if (!this.swarmState) return null;

    if (regimeKey && this.swarmState.regimeSources[regimeKey]?.[signal]) {
      const params = this.swarmState.regimeSources[regimeKey][signal];
      const total = params.alpha + params.beta;
      if (total > 0) {
        return params.alpha / total;
      }
    }

    const globalParams = this.swarmState.globalSources[signal];
    if (!globalParams) return null;
    const total = globalParams.alpha + globalParams.beta;
    if (total <= 0) return null;
    return globalParams.alpha / total;
  }
}
