export type SwarmDirection = "long" | "short" | "neutral";

/**
 * Standardized vote contract for multi-agent swarm decisions.
 * Confidence is expressed as a 0–1 scalar (not percentage).
 */
export interface AgentVote {
  agentId: string;
  direction: SwarmDirection;
  confidence: number;
  supportingSignals: string[];
  riskAssessment: number;
  reasoning: string;
}

/**
 * Consensus result produced by the swarm coordinator.
 * Callers can use consensusId to attribute trade outcomes later.
 */
export interface SwarmConsensus {
  votes: AgentVote[];
  weightedDirection: SwarmDirection;
  confidenceLevel: number;
  dissentScore: number;
  participatingAgents: string[];
  consensusReached: boolean;
  decisionTimestamp: number;
  consensusId?: string;
}
