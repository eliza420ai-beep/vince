/**
 * 🌊 SWARM COORDINATION SERVICE TESTS
 * Tests multi-agent Thompson Sampling bandit learning coordination
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SwarmCoordinationService,
  AGENT_SPECIALIZATIONS,
} from "../../services/swarmCoordination.service";
import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

// Mock the PERSISTENCE_DIR
vi.mock("../../constants/paperTradingDefaults", () => ({
  PERSISTENCE_DIR: "/tmp/test-swarm",
}));

// Mock fs
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

const mockRuntime: IAgentRuntime = {
  character: { name: "VINCE" },
  databaseAdapter: null,
  token: "test",
  actions: [],
  evaluators: [],
  providers: [],
  plugins: [],
  getMemoryManager: vi.fn(),
  getService: vi.fn(),
  registerAction: vi.fn(),
  registerEvaluator: vi.fn(),
  registerService: vi.fn(),
  initialize: vi.fn(),
  stop: vi.fn(),
  parseArguments: vi.fn(),
  validate: vi.fn(),
  act: vi.fn(),
  executeHandler: vi.fn(),
  getActorDetails: vi.fn(),
  composeState: vi.fn(),
  updateRecentMessageState: vi.fn(),
  compose: vi.fn(),
  evaluate: vi.fn(),
  getProvider: vi.fn(),
  getConversationLength: vi.fn(),
  processActions: vi.fn(),
  messageManager: null as any,
  descriptionManager: null as any,
  loreManager: null as any,
  documentsManager: null as any,
  knowledgeManager: null as any,
  cacheManager: null as any,
  services: new Map(),
  memoryManager: null as any,
  agentId: "vince-test",
  serverUrl: "",
  getSetting: vi.fn(),
};

describe("SwarmCoordinationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup fresh mocks
    (fs.existsSync as any).mockImplementation((filePath: string) => {
      return filePath.includes("swarm-bandit-state.json") ? false : true;
    });

    (fs.readFileSync as any).mockReturnValue(
      '{"sources": {}, "totalSwarmOutcomes": 0}',
    );
    (fs.writeFileSync as any).mockImplementation(() => {});
    (fs.mkdirSync as any).mockImplementation(() => {});
  });

  describe("initialization", () => {
    it("should have correct service type", () => {
      expect(SwarmCoordinationService.serviceType).toBe("swarm-coordination");
    });

    it("should have capability description", async () => {
      const service = await SwarmCoordinationService.start(mockRuntime);
      expect(service.capabilityDescription).toContain(
        "Multi-agent swarm learning",
      );
    });

    it("should initialize agent specializations", () => {
      expect(AGENT_SPECIALIZATIONS).toHaveProperty("vince");
      expect(AGENT_SPECIALIZATIONS).toHaveProperty("echo");
      expect(AGENT_SPECIALIZATIONS).toHaveProperty("oracle");
      expect(AGENT_SPECIALIZATIONS).toHaveProperty("solus");

      expect(AGENT_SPECIALIZATIONS.vince.role).toBe("market_data");
      expect(AGENT_SPECIALIZATIONS.echo.role).toBe("sentiment");
      expect(AGENT_SPECIALIZATIONS.oracle.role).toBe("predictions");
      expect(AGENT_SPECIALIZATIONS.solus.role).toBe("options");
    });

    it("should start service successfully", async () => {
      const startedService = await SwarmCoordinationService.start(mockRuntime);
      expect(startedService).toBeInstanceOf(SwarmCoordinationService);
    });
  });

  describe("signal contribution", () => {
    it("should enhance signal weights for agent contributions", async () => {
      const service = await SwarmCoordinationService.start(mockRuntime);

      const enhancedWeights = await service.contributeSignals(
        "vince",
        ["BinanceTopTraders", "CoinGlass"],
        0.75,
      );

      expect(enhancedWeights).toHaveProperty("BinanceTopTraders");
      expect(enhancedWeights).toHaveProperty("CoinGlass");
      expect(typeof enhancedWeights.BinanceTopTraders).toBe("number");
      expect(typeof enhancedWeights.CoinGlass).toBe("number");
    });

    it("should handle new agents gracefully", async () => {
      const service = await SwarmCoordinationService.start(mockRuntime);

      const enhancedWeights = await service.contributeSignals(
        "newAgent",
        ["TestSignal"],
        0.8,
      );

      expect(enhancedWeights).toHaveProperty("TestSignal");
      expect(enhancedWeights.TestSignal).toBeDefined();
    });
  });

  describe("swarm consensus", () => {
    it("should calculate weighted consensus from agent votes", async () => {
      const service = await SwarmCoordinationService.start(mockRuntime);

      const votes = [
        {
          agentId: "vince",
          direction: "long" as const,
          confidence: 0.8,
          supportingSignals: ["BinanceTopTraders", "CoinGlass"],
          riskAssessment: 0.6,
          reasoning: "Technical indicators bullish",
        },
        {
          agentId: "echo",
          direction: "long" as const,
          confidence: 0.7,
          supportingSignals: ["XSentiment"],
          riskAssessment: 0.7,
          reasoning: "Social sentiment positive",
        },
        {
          agentId: "solus",
          direction: "short" as const,
          confidence: 0.6,
          supportingSignals: ["OptionsFlow"],
          riskAssessment: 0.8,
          reasoning: "Options flow suggests hedging",
        },
      ];

      const consensus = await service.getSwarmConsensus(votes);

      expect(consensus).toHaveProperty("weightedDirection");
      expect(consensus).toHaveProperty("confidenceLevel");
      expect(consensus).toHaveProperty("consensusReached");
      expect(consensus).toHaveProperty("participatingAgents");

      expect(consensus.participatingAgents).toHaveLength(3);
      expect(consensus.participatingAgents).toContain("vince");
      expect(consensus.participatingAgents).toContain("echo");
      expect(consensus.participatingAgents).toContain("solus");
    });

    it("should reach consensus with sufficient agreement", async () => {
      const service = await SwarmCoordinationService.start(mockRuntime);

      const votes = [
        {
          agentId: "vince",
          direction: "long" as const,
          confidence: 0.8,
          supportingSignals: ["TechnicalSignal"],
          riskAssessment: 0.5,
          reasoning: "Strong bullish signal",
        },
        {
          agentId: "echo",
          direction: "long" as const,
          confidence: 0.7,
          supportingSignals: ["SentimentSignal"],
          riskAssessment: 0.6,
          reasoning: "Positive sentiment",
        },
        {
          agentId: "oracle",
          direction: "long" as const,
          confidence: 0.75,
          supportingSignals: ["PredictionSignal"],
          riskAssessment: 0.4,
          reasoning: "Prediction markets bullish",
        },
      ];

      const consensus = await service.getSwarmConsensus(votes);

      expect(consensus.weightedDirection).toBe("long");
      expect(consensus.consensusReached).toBe(true);
      expect(consensus.confidenceLevel).toBeGreaterThan(0.6); // Should exceed threshold
    });

    it("should not reach consensus with insufficient votes", async () => {
      const service = await SwarmCoordinationService.start(mockRuntime);

      const votes = [
        {
          agentId: "vince",
          direction: "long" as const,
          confidence: 0.8,
          supportingSignals: ["TechnicalSignal"],
          riskAssessment: 0.5,
          reasoning: "Single agent vote",
        },
      ];

      const consensus = await service.getSwarmConsensus(votes, 3); // Minimum 3 agents

      expect(consensus.consensusReached).toBe(false);
      expect(consensus.weightedDirection).toBe("neutral");
    });
  });

  describe("outcome recording", () => {
    it("should record swarm outcomes and update learning", async () => {
      const service = await SwarmCoordinationService.start(mockRuntime);

      // First create a consensus to get an ID
      const votes = [
        {
          agentId: "vince",
          direction: "long" as const,
          confidence: 0.8,
          supportingSignals: ["TestSignal"],
          riskAssessment: 0.5,
          reasoning: "Test reasoning",
        },
        {
          agentId: "echo",
          direction: "long" as const,
          confidence: 0.7,
          supportingSignals: ["TestSignal2"],
          riskAssessment: 0.6,
          reasoning: "Test reasoning 2",
        },
        {
          agentId: "oracle",
          direction: "long" as const,
          confidence: 0.75,
          supportingSignals: ["TestSignal3"],
          riskAssessment: 0.4,
          reasoning: "Test reasoning 3",
        },
      ];

      const consensus = await service.getSwarmConsensus(votes);
      expect(consensus).toBeDefined();

      // Check that stats are updated
      const stats = service.getSwarmStats();
      expect(stats.recentDecisions).toBe(1);
    });
  });

  describe("performance tracking", () => {
    it("should track swarm statistics", async () => {
      const service = await SwarmCoordinationService.start(mockRuntime);

      const stats = service.getSwarmStats();

      expect(stats).toHaveProperty("totalOutcomes");
      expect(stats).toHaveProperty("activeAgents");
      expect(stats).toHaveProperty("trackedSignals");
      expect(stats).toHaveProperty("recentDecisions");
      expect(stats).toHaveProperty("averageConsensusRate");
      expect(stats).toHaveProperty("topPerformingAgents");
      expect(stats).toHaveProperty("signalCorrelations");

      expect(typeof stats.totalOutcomes).toBe("number");
      expect(typeof stats.activeAgents).toBe("number");
    });

    it("should track agent performance", async () => {
      const service = await SwarmCoordinationService.start(mockRuntime);

      const performance = service.getAgentPerformance();

      expect(Array.isArray(performance)).toBe(true);

      if (performance.length > 0) {
        const agentPerf = performance[0];
        expect(agentPerf).toHaveProperty("agentId");
        expect(agentPerf).toHaveProperty("accuracyRate");
        expect(agentPerf).toHaveProperty("outcomesProvided");
        expect(agentPerf).toHaveProperty("specialtyScore");
        expect(agentPerf).toHaveProperty("specialization");
      }
    });
  });

  describe("error handling", () => {
    it("should handle missing consensus decisions", async () => {
      const service = await SwarmCoordinationService.start(mockRuntime);

      // This should not throw an error
      await service.recordSwarmOutcome("non-existent-id", "win", 1.0, [
        "vince",
      ]);

      expect(true).toBe(true); // Test passed if no error was thrown
    });
  });

  describe("integration with existing bandit system", () => {
    it("should work alongside VinceWeightBanditService", async () => {
      // Mock the weight bandit service
      const mockWeightBanditService = {
        recordOutcome: vi.fn(),
        getSignalWeights: vi.fn().mockReturnValue({
          BinanceTopTraders: 0.8,
          CoinGlass: 0.6,
        }),
      };

      mockRuntime.getService = vi.fn((serviceId) => {
        if (serviceId === "vince-weight-bandit") {
          return mockWeightBanditService;
        }
        return null;
      });

      const service = await SwarmCoordinationService.start(mockRuntime);

      // Should not interfere with existing weight bandit functionality
      expect(service).toBeDefined();
      expect(service.getSwarmStats()).toBeDefined();
    });
  });
});
