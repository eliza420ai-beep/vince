/**
 * ERC-8004 Service - Trustless Agents Registry Integration
 *
 * Interacts with the three on-chain registries:
 * - Identity Registry (ERC-721) - Agent registration & discovery
 * - Reputation Registry - Feedback & scoring
 * - Validation Registry - Trust verification
 */

import {
  type IAgentRuntime,
  type Service,
  logger,
} from "@elizaos/core";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";
import type {
  AgentIdentity,
  AgentRegistration,
  ReputationSummary,
  ValidationResult,
  RegisterAgentParams,
  RateAgentParams,
  ValidateAgentParams,
  ERC8004Config,
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
} from "../types";

// Default contract addresses (Base Sepolia testnet)
const DEFAULT_CONFIG: ERC8004Config = {
  network: "base-sepolia",
  identityRegistryAddress: "0x0000000000000000000000000000000000000000", // Placeholder
  reputationRegistryAddress: "0x0000000000000000000000000000000000000000",
  validationRegistryAddress: "0x0000000000000000000000000000000000000000",
};

export class ERC8004Service {
  static serviceType = "erc8004" as const;
  readonly serviceType = ERC8004Service.serviceType;

  private runtime: IAgentRuntime;
  private _config: ERC8004Config;
  private publicClient: any;
  private walletClient: any;
  private account: any;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
    this._config = this.loadConfig();
  }

  static async start(runtime: IAgentRuntime): Promise<ERC8004Service> {
    const svc = new ERC8004Service(runtime);
    await svc.initialize();
    return svc;
  }

  async initialize(): Promise<void> {
    const network = this._config.network;
    const chain = network === "base" ? base : baseSepolia;

    // Create public client for reads
    this.publicClient = createPublicClient({
      chain,
      transport: http(this._config.rpcUrl || chain.rpcUrls.default.http[0]),
    });

    // Create wallet client if private key available
    const privateKey = process.env.ERC8004_PRIVATE_KEY || process.env.CDP_WALLET_SECRET;
    if (privateKey) {
      try {
        this.account = privateKeyToAccount(privateKey as `0x${string}`);
        this.walletClient = createWalletClient({
          account: this.account,
          chain,
          transport: http(this._config.rpcUrl || chain.rpcUrls.default.http[0]),
        });
        logger.info(`[ERC-8004] Wallet configured: ${this.account.address.slice(0, 10)}...`);
      } catch (err) {
        logger.warn(`[ERC-8004] Wallet not configured: ${err}`);
      }
    }

    logger.info(`[ERC-8004] Service initialized on ${network}`);
  }

  private loadConfig(): ERC8004Config {
    const network = (process.env.ERC8004_NETWORK || "base-sepolia") as ERC8004Config["network"];
    return {
      network,
      identityRegistryAddress:
        process.env.ERC8004_IDENTITY_REGISTRY || DEFAULT_CONFIG.identityRegistryAddress,
      reputationRegistryAddress:
        process.env.ERC8004_REPUTATION_REGISTRY || DEFAULT_CONFIG.reputationRegistryAddress,
      validationRegistryAddress:
        process.env.ERC8004_VALIDATION_REGISTRY || DEFAULT_CONFIG.validationRegistryAddress,
      rpcUrl: process.env.ERC8004_RPC_URL,
    };
  }

  /**
   * Check if contracts are deployed and configured
   */
  isConfigured(): boolean {
    return (
      this._config.identityRegistryAddress !== "0x0000000000000000000000000000000000000000" &&
      !!this.publicClient
    );
  }

  /**
   * Check if wallet is available for write operations
   */
  canWrite(): boolean {
    return !!this.walletClient && !!this.account;
  }

  // ---------------------------------------------------------------------------
  // Identity Registry
  // ---------------------------------------------------------------------------

  /**
   * Register a new agent identity
   */
  async registerAgent(params: RegisterAgentParams): Promise<{
    success: boolean;
    agentId?: bigint;
    txHash?: string;
    error?: string;
  }> {
    if (!this.canWrite()) {
      return { success: false, error: "Wallet not configured for write operations" };
    }

    if (!this.isConfigured()) {
      return { success: false, error: "ERC-8004 contracts not configured" };
    }

    try {
      // Build registration metadata
      const registration: AgentRegistration = {
        type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
        name: params.name,
        description: params.description,
        image: params.image,
        endpoints: params.endpoints,
        supportedTrust: params.supportedTrust || ["reputation"],
      };

      // Upload metadata to IPFS or return as data URI
      const tokenURI = `data:application/json;base64,${Buffer.from(
        JSON.stringify(registration)
      ).toString("base64")}`;

      // Call register function
      const hash = await this.walletClient.writeContract({
        address: this._config.identityRegistryAddress as `0x${string}`,
        abi: parseAbi(["function register(string tokenURI) returns (uint256)"]),
        functionName: "register",
        args: [tokenURI],
      });

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Extract agentId from Transfer event
      const transferLog = receipt.logs.find(
        (log: any) => log.topics[0] === "0xddf252ad..." // Transfer topic
      );
      const agentId = transferLog ? BigInt(transferLog.topics[3]) : undefined;

      logger.info(`[ERC-8004] Agent registered: ${params.name} (ID: ${agentId})`);

      return { success: true, agentId, txHash: hash };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[ERC-8004] Registration failed: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Get agent identity by ID
   */
  async getAgent(agentId: bigint): Promise<AgentIdentity | null> {
    if (!this.isConfigured()) return null;

    try {
      const [owner, tokenURI] = await Promise.all([
        this.publicClient.readContract({
          address: this._config.identityRegistryAddress as `0x${string}`,
          abi: parseAbi(["function ownerOf(uint256 tokenId) view returns (address)"]),
          functionName: "ownerOf",
          args: [agentId],
        }),
        this.publicClient.readContract({
          address: this._config.identityRegistryAddress as `0x${string}`,
          abi: parseAbi(["function tokenURI(uint256 tokenId) view returns (string)"]),
          functionName: "tokenURI",
          args: [agentId],
        }),
      ]);

      // Parse registration from tokenURI
      let registration: AgentRegistration;
      if (tokenURI.startsWith("data:application/json;base64,")) {
        const json = Buffer.from(tokenURI.split(",")[1], "base64").toString();
        registration = JSON.parse(json);
      } else {
        // Fetch from IPFS/HTTP
        const res = await fetch(tokenURI);
        registration = await res.json();
      }

      return {
        agentId,
        owner: owner as string,
        tokenURI: tokenURI as string,
        registration,
        createdAt: Date.now(), // Would need to query events for actual
        updatedAt: Date.now(),
      };
    } catch (err) {
      logger.debug(`[ERC-8004] Get agent failed: ${err}`);
      return null;
    }
  }

  /**
   * Search for agents by name or endpoint
   */
  async searchAgents(query: string): Promise<AgentIdentity[]> {
    // Would need indexer/subgraph for efficient search
    // For now, return empty - this is a placeholder
    logger.debug(`[ERC-8004] Search not implemented yet: ${query}`);
    return [];
  }

  // ---------------------------------------------------------------------------
  // Reputation Registry
  // ---------------------------------------------------------------------------

  /**
   * Rate an agent
   */
  async rateAgent(params: RateAgentParams): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    if (!this.canWrite()) {
      return { success: false, error: "Wallet not configured" };
    }

    if (!this.isConfigured()) {
      return { success: false, error: "ERC-8004 contracts not configured" };
    }

    if (params.score < 0 || params.score > 100) {
      return { success: false, error: "Score must be 0-100" };
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this._config.reputationRegistryAddress as `0x${string}`,
        abi: parseAbi([
          "function rate(uint256 agentId, uint8 score, string[] tags, bytes metadata)",
        ]),
        functionName: "rate",
        args: [
          params.agentId,
          params.score,
          params.tags || [],
          "0x" + Buffer.from(JSON.stringify(params.metadata || {})).toString("hex"),
        ],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      logger.info(`[ERC-8004] Rated agent ${params.agentId}: ${params.score}/100`);

      return { success: true, txHash: hash };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[ERC-8004] Rating failed: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Get agent reputation summary
   */
  async getReputation(agentId: bigint): Promise<ReputationSummary | null> {
    if (!this.isConfigured()) return null;

    try {
      const [avgScore, count] = await this.publicClient.readContract({
        address: this._config.reputationRegistryAddress as `0x${string}`,
        abi: parseAbi([
          "function getReputation(uint256 agentId) view returns (uint256 avgScore, uint256 count)",
        ]),
        functionName: "getReputation",
        args: [agentId],
      });

      return {
        agentId,
        averageScore: Number(avgScore),
        totalRatings: Number(count),
        topTags: [], // Would need to aggregate from events
        recentRatings: [],
      };
    } catch (err) {
      logger.debug(`[ERC-8004] Get reputation failed: ${err}`);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Validation Registry
  // ---------------------------------------------------------------------------

  /**
   * Validate an agent
   */
  async validateAgent(params: ValidateAgentParams): Promise<ValidationResult | null> {
    if (!this.isConfigured()) return null;

    try {
      const [isValid, confidence] = await this.publicClient.readContract({
        address: this._config.validationRegistryAddress as `0x${string}`,
        abi: parseAbi([
          "function isValid(uint256 agentId, uint8 validationType) view returns (bool, uint256 confidence)",
        ]),
        functionName: "isValid",
        args: [params.agentId, this.trustModelToInt(params.validationType)],
      });

      return {
        agentId: params.agentId,
        validator: this._config.validationRegistryAddress,
        validationType: params.validationType,
        isValid: isValid as boolean,
        confidence: Number(confidence),
        metadata: {},
        timestamp: Date.now(),
      };
    } catch (err) {
      logger.debug(`[ERC-8004] Validation check failed: ${err}`);
      return null;
    }
  }

  private trustModelToInt(model: string): number {
    switch (model) {
      case "reputation":
        return 0;
      case "crypto-economic":
        return 1;
      case "tee-attestation":
        return 2;
      case "zkml":
        return 3;
      default:
        return 0;
    }
  }

  /**
   * Get Otaku's own agent ID if registered
   */
  async getOwnAgentId(): Promise<bigint | null> {
    if (!this.account) return null;

    try {
      const balance = await this.publicClient.readContract({
        address: this._config.identityRegistryAddress as `0x${string}`,
        abi: parseAbi(["function balanceOf(address owner) view returns (uint256)"]),
        functionName: "balanceOf",
        args: [this.account.address],
      });

      if (BigInt(balance) > 0n) {
        // Would need to query tokenOfOwnerByIndex or events
        // For now, return a placeholder
        return 1n;
      }

      return null;
    } catch {
      return null;
    }
  }
}

export default ERC8004Service;
