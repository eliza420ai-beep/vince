/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                     @elizaos/plugin-discovery TYPES                        ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  Capability discovery for the elizaOS ecosystem.                          ║
 * ║                                                                           ║
 * ║  Discovery happens through conversation - humans and agents ask           ║
 * ║  "What can you do?" and get natural language responses.                   ║
 * ║                                                                           ║
 * ║  Basic capability summary is free. Full detailed manifest costs $0.25.    ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import type { UUID } from '@elizaos/core';

/**
 * A semantic capability flag that describes what a plugin can do.
 * 
 * Feature flags are designed for discovery - they tell indexers and users
 * what an agent is capable of WITHOUT exposing version info (security).
 * 
 * Examples: 'can-trade', 'supports-solana', 'accepts-payments'
 */
export interface FeatureFlag {
  /** The flag identifier (kebab-case) */
  flag: string;
  
  /** Human-readable description of this capability */
  description: string;
  
  /** Category for grouping (trading, blockchain, social, etc.) */
  category?: string;
  
  /** The plugin that provides this capability */
  source?: string;
}

/**
 * Action capability info (what the agent can DO)
 */
export interface ActionCapability {
  /** Action name (e.g., 'SWAP_TOKENS') */
  name: string;
  
  /** Human-readable description */
  description: string;
  
  /** Similar action names/aliases */
  similes?: string[];
}

/**
 * Service capability info (long-running services the agent has)
 */
export interface ServiceCapability {
  /** Service type identifier */
  type: string;
  
  /** Human-readable description */
  description: string;
}

/**
 * Provider capability info (context providers the agent uses)
 */
export interface ProviderCapability {
  /** Provider name */
  name: string;
  
  /** Description of what context it provides */
  description?: string;
}

/**
 * Full capability manifest - the complete picture of what an agent can do.
 * 
 * This is what gets returned for paid queries ($0.25).
 * Contains everything needed for indexers to catalog the agent.
 */
export interface CapabilityManifest {
  /** Agent identity */
  agentId: UUID;
  agentName: string;
  
  /** High-level bio/description */
  bio?: string;
  
  /** Aggregated feature flags from all plugins */
  featureFlags: FeatureFlag[];
  
  /** Detailed capability breakdown */
  capabilities: {
    actions: ActionCapability[];
    services: ServiceCapability[];
    providers: ProviderCapability[];
  };
  
  /** Loaded plugin names (not versions!) */
  plugins: string[];
  
  /** When this manifest was generated */
  generatedAt: number;
}

/**
 * Summary of capabilities - the free tier response.
 * Just enough to know what the agent does, not the full details.
 */
export interface CapabilitySummary {
  /** Agent identity */
  agentId: UUID;
  agentName: string;
  
  /** High-level bio */
  bio?: string;
  
  /** Just the flag names, not full details */
  featureFlags: string[];
  
  /** Counts only */
  counts: {
    actions: number;
    services: number;
    providers: number;
    plugins: number;
  };
  
  /** Prompt for paid query */
  upgradePrompt: string;
  
  /** Price for full manifest */
  queryPrice: number;
}

/**
 * Configuration for the discovery plugin
 */
export interface DiscoveryConfig {
  /** Price for detailed capability query (default: 0.25) */
  DISCOVERY_QUERY_PRICE: number;
  
  /** Whether detailed queries require payment (default: true) */
  DISCOVERY_REQUIRE_PAYMENT: boolean;
  
  /** Cooldown between detailed queries from same entity (minutes) */
  DISCOVERY_QUERY_COOLDOWN_MINS: number;
}

/**
 * Result of a capability query
 */
export interface CapabilityQueryResult {
  /** Whether the query was successful */
  success: boolean;
  
  /** The manifest (if paid/authorized) */
  manifest?: CapabilityManifest;
  
  /** The summary (if free tier) */
  summary?: CapabilitySummary;
  
  /** Error message if failed */
  error?: string;
  
  /** Whether payment is required for full manifest */
  requiresPayment?: boolean;
  
  /** Payment info if required */
  paymentInfo?: {
    price: number;
    currency: string;
    methods: string[];
  };
}

/**
 * Pending capability query awaiting payment
 */
export interface PendingQuery {
  /** Query ID */
  id: UUID;
  
  /** Entity that requested the query */
  entityId: UUID;
  
  /** Room where the query was made */
  roomId: UUID;
  
  /** When the query was made */
  requestedAt: number;
  
  /** When the query expires (if not paid) */
  expiresAt: number;
  
  /** Price required */
  price: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// LEARNED DISCOVERY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verification level for discovered capabilities.
 * 
 * - 'claimed': Agent stated they have this capability (via conversation)
 * - 'verified': We've seen the agent successfully use this capability
 * - 'failed': We've seen the agent fail to use this capability
 */
export type VerificationLevel = 'claimed' | 'verified' | 'failed';

/**
 * How we learned about an agent's capabilities.
 * 
 * - 'conversation': Direct query via QUERY_CAPABILITIES
 * - 'observation': Saw them perform an action
 * - 'referral': Another agent told us about them
 */
export type DiscoverySource = 'conversation' | 'observation' | 'referral';

/**
 * Record of what we've learned about another agent.
 * Stored in the discovered_agents component.
 */
export interface DiscoveredAgentRecord {
  /** The discovered agent's ID */
  agentId: UUID;
  
  /** The agent's display name */
  name: string;
  
  /** Capabilities they claim to have (feature flags) */
  capabilities: string[];
  
  /** Capabilities we've verified actually work */
  verifiedCapabilities: string[];
  
  /** Capabilities that failed when tested */
  failedCapabilities: string[];
  
  /** When we first discovered this agent */
  discoveredAt: number;
  
  /** When we last interacted with this agent */
  lastInteractionAt: number;
  
  /** Overall verification level */
  verificationLevel: VerificationLevel;
  
  /** How we discovered this agent */
  source: DiscoverySource;
  
  /** Room where we first met (if applicable) */
  discoveredInRoom?: UUID;
  
  /** Optional notes or context */
  notes?: string;
}

/**
 * Input for recording a newly discovered agent.
 * Subset of DiscoveredAgentRecord for creation.
 */
export interface DiscoverAgentInput {
  /** The discovered agent's ID */
  agentId: UUID;
  
  /** The agent's display name */
  name: string;
  
  /** Capabilities they claim to have */
  capabilities: string[];
  
  /** How we discovered them */
  source: DiscoverySource;
  
  /** Room where we met (optional) */
  roomId?: UUID;
  
  /** Optional notes */
  notes?: string;
}

/**
 * Component data structure for storing discovered agents.
 * Attached to the discovering agent's entity.
 */
export interface DiscoveredAgentsData {
  /** Map of agentId -> discovery record */
  agents: Record<string, DiscoveredAgentRecord>;
  
  /** When this component was last updated */
  updatedAt: number;
}

/**
 * Options for querying discovered agents.
 */
export interface DiscoveredAgentQueryOptions {
  /** Only return agents with verified capabilities */
  verifiedOnly?: boolean;
  
  /** Filter by discovery source */
  source?: DiscoverySource;
  
  /** Filter by room where discovered */
  roomId?: UUID;
}

