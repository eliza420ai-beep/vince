/**
 * ERC-8004: Trustless Agents - Type Definitions
 *
 * Three on-chain registries for agent identity, reputation, and validation.
 */

// ---------------------------------------------------------------------------
// Identity Registry Types
// ---------------------------------------------------------------------------

export interface AgentEndpoint {
  name: "A2A" | "MCP" | "ENS" | "DID" | "Wallet" | string;
  endpoint: string;
  version?: string;
}

export interface AgentRegistration {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";
  name: string;
  description: string;
  image?: string;
  endpoints: AgentEndpoint[];
  supportedTrust: TrustModel[];
}

export interface AgentIdentity {
  agentId: bigint;
  owner: string;
  tokenURI: string;
  registration: AgentRegistration;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Reputation Registry Types
// ---------------------------------------------------------------------------

export type TrustModel =
  | "reputation"
  | "crypto-economic"
  | "tee-attestation"
  | "zkml";

export interface ReputationEntry {
  rater: string;
  agentId: bigint;
  score: number; // 0-100
  tags: string[];
  metadata: Record<string, string>;
  timestamp: number;
  txHash: string;
}

export interface ReputationSummary {
  agentId: bigint;
  averageScore: number;
  totalRatings: number;
  topTags: string[];
  recentRatings: ReputationEntry[];
  percentile?: number; // Relative to all agents
}

// ---------------------------------------------------------------------------
// Validation Registry Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  agentId: bigint;
  validator: string;
  validationType: TrustModel;
  isValid: boolean;
  confidence: number; // 0-100
  proof?: string; // ZK proof, TEE attestation, etc.
  expiresAt?: number;
  metadata: Record<string, string>;
  timestamp: number;
}

export interface ValidatorInfo {
  address: string;
  name: string;
  supportedTypes: TrustModel[];
  stake?: bigint; // For crypto-economic validators
  reputation?: number;
}

// ---------------------------------------------------------------------------
// Service Types
// ---------------------------------------------------------------------------

export interface ERC8004Config {
  network: "ethereum" | "base" | "sepolia" | "base-sepolia";
  identityRegistryAddress: string;
  reputationRegistryAddress: string;
  validationRegistryAddress: string;
  rpcUrl?: string;
}

export interface RegisterAgentParams {
  name: string;
  description: string;
  image?: string;
  endpoints: AgentEndpoint[];
  supportedTrust?: TrustModel[];
}

export interface RateAgentParams {
  agentId: bigint;
  score: number;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface ValidateAgentParams {
  agentId: bigint;
  validationType: TrustModel;
  proof?: string;
}

// ---------------------------------------------------------------------------
// Contract ABIs (simplified)
// ---------------------------------------------------------------------------

export const IDENTITY_REGISTRY_ABI = [
  "function register(string tokenURI) returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
] as const;

export const REPUTATION_REGISTRY_ABI = [
  "function rate(uint256 agentId, uint8 score, string[] tags, bytes metadata)",
  "function getReputation(uint256 agentId) view returns (uint256 avgScore, uint256 count)",
  "function getRatings(uint256 agentId, uint256 limit) view returns (tuple(address rater, uint8 score, string[] tags)[])",
  "event Rated(uint256 indexed agentId, address indexed rater, uint8 score)",
] as const;

export const VALIDATION_REGISTRY_ABI = [
  "function validate(uint256 agentId, uint8 validationType, bytes proof) returns (bool)",
  "function isValid(uint256 agentId, uint8 validationType) view returns (bool, uint256 confidence)",
  "function getValidators(uint8 validationType) view returns (address[])",
  "event Validated(uint256 indexed agentId, address indexed validator, uint8 validationType, bool result)",
] as const;

// ---------------------------------------------------------------------------
// Contract Addresses (from official deployments)
// ---------------------------------------------------------------------------

export const CONTRACT_ADDRESSES: Record<string, ERC8004Config> = {
  "base-sepolia": {
    network: "base-sepolia",
    identityRegistryAddress: "0x...", // TODO: Add when deployed
    reputationRegistryAddress: "0x...",
    validationRegistryAddress: "0x...",
    rpcUrl: "https://sepolia.base.org",
  },
  base: {
    network: "base",
    identityRegistryAddress: "0x...", // TODO: Add when mainnet deployed
    reputationRegistryAddress: "0x...",
    validationRegistryAddress: "0x...",
    rpcUrl: "https://mainnet.base.org",
  },
};
