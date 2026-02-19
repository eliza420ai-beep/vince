import { type IAgentRuntime, logger, Service } from "@elizaos/core";
import { BankrClient } from "@bankr/sdk";

const DEFAULT_BASE_URL = "https://api.bankr.bot";

export class BankrSdkService extends Service {
  static serviceType = "bankr_sdk" as const;

  private client: BankrClient | null = null;
  private baseUrl: string;
  private timeout: number | undefined;
  private walletAddress: string | undefined;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.baseUrl =
      (runtime.getSetting("BANKR_AGENT_URL") as string) || DEFAULT_BASE_URL;
    const to = runtime.getSetting("BANKR_SDK_TIMEOUT");
    this.timeout =
      typeof to === "number" ? to : to ? parseInt(String(to), 10) : undefined;
    this.walletAddress = runtime.getSetting("BANKR_SDK_WALLET_ADDRESS") as
      | string
      | undefined;
  }

  get capabilityDescription(): string {
    return "Bankr SDK: send prompts via @bankr/sdk (own wallet, x402 payment); returns response and transaction data for you to submit.";
  }

  async initialize(_runtime: IAgentRuntime): Promise<void> {
    // No-op: configuration is handled in constructor
  }

  static async start(runtime: IAgentRuntime): Promise<BankrSdkService> {
    logger.info("[BANKR SDK] Starting Bankr SDK service");
    const service = new BankrSdkService(runtime);
    await service.initialize(runtime);
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[BANKR SDK] Stopping Bankr SDK service");
    this.client = null;
  }

  isConfigured(): boolean {
    const key = this.runtime.getSetting("BANKR_PRIVATE_KEY") as
      | string
      | undefined;
    return !!key?.trim();
  }

  private getClient(): BankrClient {
    if (this.client) return this.client;
    const key = this.runtime.getSetting("BANKR_PRIVATE_KEY") as
      | string
      | undefined;
    if (!key?.trim()) {
      throw new Error("BANKR_PRIVATE_KEY is not set");
    }
    const privateKey = key.trim() as `0x${string}`;
    this.client = new BankrClient({
      privateKey,
      baseUrl: this.baseUrl,
      ...(this.timeout != null &&
        this.timeout > 0 && { timeout: this.timeout }),
      ...(this.walletAddress?.trim() && {
        walletAddress: this.walletAddress.trim(),
      }),
    });
    return this.client;
  }

  async promptAndWait(options: {
    prompt: string;
    walletAddress?: string;
    interval?: number;
    maxAttempts?: number;
    timeout?: number;
  }): Promise<{
    response?: string;
    error?: string;
    status: string;
    transactions?: Array<{ type: string; metadata?: { chainId?: number } }>;
  }> {
    const client = this.getClient();
    const result = await client.promptAndWait({
      prompt: options.prompt,
      walletAddress: options.walletAddress ?? this.walletAddress?.trim(),
      interval: options.interval,
      maxAttempts: options.maxAttempts,
      timeout: options.timeout,
    });
    return {
      response: result.response,
      error: result.error,
      status: result.status,
      transactions: result.transactions as any,
    };
  }
}
