import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IAgentRuntime } from "@elizaos/core";
import { VinceSwarmOrchestratorService } from "../../services/vinceSwarmOrchestrator.service";
import type { SwarmVoteContext } from "../../services/vinceSwarmOrchestrator.service";

const baseRuntime: IAgentRuntime = {
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

function makeContext(): SwarmVoteContext {
  return {
    asset: "BTC",
    vinceSignal: {
      asset: "BTC",
      direction: "long",
      strength: 80,
      confidence: 80,
      factors: [],
      sources: ["signal_aggregator"],
      confirmingCount: 2,
    } as any,
    tradeSignal: {
      asset: "BTC",
      direction: "long",
      confidence: 80,
      strength: 80,
      sourceBreakdown: {
        signal_aggregator: 1,
      },
    } as any,
    regime: null,
  };
}

describe("VinceSwarmOrchestratorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a VINCE-only vote when no SWARM_INCLUDE_* flags are enabled", async () => {
    const runtime: IAgentRuntime = {
      ...baseRuntime,
      getSetting: vi.fn().mockReturnValue(undefined),
      getService: vi.fn().mockReturnValue(null),
    };

    const service = await VinceSwarmOrchestratorService.start(runtime);
    const ctx = makeContext();
    const votes = await service.collectVotes(ctx);

    expect(votes).toHaveLength(1);
    expect(votes[0].agentId).toBe("vince");
    expect(votes[0].direction).toBe("long");
    expect(votes[0].confidence).toBeCloseTo(0.8, 3);
    expect(votes[0].supportingSignals).toContain("signal_aggregator");
  });

  it("includes Echo vote when SWARM_INCLUDE_ECHO is enabled", async () => {
    const mockXSentiment = {
      getTradingSentiment: vi.fn().mockReturnValue({
        sentiment: "bullish",
        confidence: 0.9,
        hasHighRiskEvent: false,
      }),
    };

    const runtime: IAgentRuntime = {
      ...baseRuntime,
      getSetting: vi
        .fn()
        .mockImplementation((key: string) =>
          key === "SWARM_INCLUDE_ECHO" ? true : undefined,
        ),
      getService: vi
        .fn()
        .mockImplementation((id: string) =>
          id === "VINCE_X_SENTIMENT_SERVICE" ? mockXSentiment : null,
        ),
    };

    const service = await VinceSwarmOrchestratorService.start(runtime);
    const ctx = makeContext();
    const votes = await service.collectVotes(ctx);

    const echoVote = votes.find((v) => v.agentId === "echo");
    expect(echoVote).toBeDefined();
    expect(echoVote!.direction).toBe("long");
    expect(echoVote!.confidence).toBeGreaterThan(0);
    expect(echoVote!.supportingSignals).toContain("x_sentiment");
  });

  it("returns neutral low-confidence votes for agents without real data wired", async () => {
    const runtime: IAgentRuntime = {
      ...baseRuntime,
      getSetting: vi
        .fn()
        .mockImplementation((key: string) =>
          key === "SWARM_INCLUDE_SENTINEL" ||
          key === "SWARM_INCLUDE_ELIZA" ||
          key === "SWARM_INCLUDE_CLAWTERM" ||
          key === "SWARM_INCLUDE_NAVAL"
            ? true
            : undefined,
        ),
      getService: vi.fn().mockReturnValue(null),
    };

    const service = await VinceSwarmOrchestratorService.start(runtime);
    const ctx = makeContext();
    const votes = await service.collectVotes(ctx);

    const placeholderAgents = ["sentinel", "eliza", "clawterm", "naval"];
    for (const id of placeholderAgents) {
      const v = votes.find((vote) => vote.agentId === id);
      expect(v).toBeDefined();
      expect(v!.direction).toBe("neutral");
      expect(v!.confidence).toBeLessThanOrEqual(0.2);
    }
  });
});
